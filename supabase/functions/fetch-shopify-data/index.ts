import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const logger = createLogger("fetch-shopify-data");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiter: 2 requests per second max
const rateLimiter = {
  lastRequest: 0,
  minDelay: 500, // 500ms between requests
  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.minDelay) {
      await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();
  }
};

async function shopifyRequest(shop: string, accessToken: string, endpoint: string) {
  await rateLimiter.wait();
  
  const response = await fetch(`https://${shop}/admin/api/2024-01${endpoint}`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Shopify API error for ${endpoint}`, { status: response.status, error: errorText });
    throw new Error(`Shopify API error: ${response.status}`);
  }

  return await response.json();
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    logger.info("Fetching Shopify data", { userId: user.id });

    // Get Shopify connection
    const { data: connection, error: connError } = await supabase
      .from('connections_shopify')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      throw new Error("Shopify not connected");
    }

    const { shop_domain, access_token_encrypted } = connection;

    // Calculate week range
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    logger.info("Fetching data for week", { weekStart, shop: shop_domain });

    // Fetch orders for the week
    const ordersData = await shopifyRequest(
      shop_domain,
      access_token_encrypted,
      `/orders.json?status=any&created_at_min=${weekStartDate.toISOString()}&created_at_max=${weekEndDate.toISOString()}`
    );

    const orders = ordersData.orders || [];
    const ordersCount = orders.length;
    const totalSales = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || 0), 0
    );
    const avgOrderValue = ordersCount > 0 ? totalSales / ordersCount : 0;
    
    const refunds = orders.filter((order: any) => order.refunds && order.refunds.length > 0);
    const refundsRate = ordersCount > 0 ? (refunds.length / ordersCount) * 100 : 0;

    logger.info("Orders data fetched", { ordersCount, totalSales });

    // Fetch products (top sellers)
    await rateLimiter.wait();
    const productsData = await shopifyRequest(
      shop_domain,
      access_token_encrypted,
      '/products.json?limit=250'
    );

    const products = productsData.products || [];
    
    // Calculate top products from orders
    const productSales = new Map();
    orders.forEach((order: any) => {
      order.line_items?.forEach((item: any) => {
        const productId = item.product_id;
        if (productId) {
          const current = productSales.get(productId) || { 
            title: item.title,
            sku: item.sku || 'N/A',
            sold: 0 
          };
          current.sold += item.quantity || 0;
          productSales.set(productId, current);
        }
      });
    });

    // Get top 3 products with stock info
    const sortedProducts = Array.from(productSales.entries())
      .sort((a, b) => b[1].sold - a[1].sold)
      .slice(0, 3);

    const topProducts = sortedProducts.map(([productId, data]) => {
      const product = products.find((p: any) => p.id === productId);
      const totalStock = product?.variants?.reduce((sum: number, v: any) => 
        sum + (v.inventory_quantity || 0), 0
      ) || 0;
      
      return {
        title: data.title,
        sku: data.sku,
        sold: data.sold,
        stock: totalStock
      };
    });

    logger.info("Products data processed", { topProducts: topProducts.length });

    // Fetch new customers for the week
    await rateLimiter.wait();
    const customersData = await shopifyRequest(
      shop_domain,
      access_token_encrypted,
      `/customers.json?created_at_min=${weekStartDate.toISOString()}&created_at_max=${weekEndDate.toISOString()}`
    );

    const newCustomers = customersData.customers?.length || 0;

    logger.info("Customers data fetched", { newCustomers });

    // Build KPIs JSON
    const kpisJson = {
      source: "shopify",
      week: weekStart,
      shop_domain,
      orders_count: ordersCount,
      total_sales: parseFloat(totalSales.toFixed(2)),
      avg_order_value: parseFloat(avgOrderValue.toFixed(2)),
      refunds_rate: parseFloat(refundsRate.toFixed(2)),
      new_customers: newCustomers,
      top_products: topProducts
    };

    // Cache KPIs in database
    const { error: cacheError } = await supabase
      .from('shopify_kpis')
      .upsert({
        user_id: user.id,
        shop_domain,
        week_start: weekStart,
        kpis_json: kpisJson
      }, {
        onConflict: 'user_id,week_start'
      });

    if (cacheError) {
      logger.warn("Failed to cache KPIs", { error: cacheError });
    }

    logger.info("Shopify data fetched successfully", { 
      ordersCount, 
      totalSales, 
      newCustomers,
      cost: "< 0.03€"
    });

    return new Response(
      JSON.stringify(kpisJson),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Error in fetch-shopify-data", { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
