import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestTube, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ShopifyDemoButton = () => {
  const [loading, setLoading] = useState(false);
  const [demoReady, setDemoReady] = useState(false);

  const createDemoShop = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create demo connection
      const { error: connError } = await supabase
        .from('connections_shopify')
        .upsert({
          user_id: user.id,
          shop_domain: 'demo-shop.myshopify.com',
          access_token_encrypted: 'demo_token_placeholder',
          scopes: 'read_orders,read_products,read_customers'
        }, {
          onConflict: 'user_id'
        });

      if (connError) throw connError;

      // Create demo KPIs
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      const weekStartStr = weekStart.toISOString().split('T')[0];

      const demoKPIs = {
        source: "shopify",
        week: weekStartStr,
        shop_domain: "demo-shop.myshopify.com",
        orders_count: 152,
        total_sales: 4380.40,
        avg_order_value: 28.81,
        refunds_rate: 1.8,
        new_customers: 64,
        top_products: [
          { title: "Hoodie Noir", sku: "HOODIE-N", sold: 38, stock: 12 },
          { title: "T-Shirt Blanc", sku: "TSHIRT-W", sold: 29, stock: 45 },
          { title: "Casquette Rouge", sku: "CAP-R", sold: 22, stock: 8 }
        ]
      };

      const { error: kpisError } = await supabase
        .from('shopify_kpis')
        .upsert({
          user_id: user.id,
          shop_domain: 'demo-shop.myshopify.com',
          week_start: weekStartStr,
          kpis_json: demoKPIs
        }, {
          onConflict: 'user_id,week_start'
        });

      if (kpisError) throw kpisError;

      setDemoReady(true);
      toast.success("Boutique demo créée avec succès !");
      
      // Reload the page to reflect changes
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error creating demo shop:", error);
      toast.error("Erreur lors de la création de la boutique demo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={createDemoShop}
        disabled={loading || demoReady}
        className="gap-2"
      >
        <TestTube className="h-4 w-4" />
        {loading ? "Création..." : demoReady ? "Demo créée" : "Test with demo shop"}
      </Button>
      {demoReady && (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Données Shopify OK
        </Badge>
      )}
    </div>
  );
};
