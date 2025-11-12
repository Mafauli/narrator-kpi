import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShopifyConnectParams {
  shopDomain: string;
}

interface ShopifyConnectResponse {
  authUrl: string;
  state: string;
  shopDomain: string;
}

export const useShopify = () => {
  const [connecting, setConnecting] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const startOAuthFlow = async ({ shopDomain }: ShopifyConnectParams): Promise<string | null> => {
    try {
      setConnecting(true);
      console.log("Starting Shopify OAuth flow...", { shopDomain });
      
      const { data: result, error } = await supabase.functions.invoke<ShopifyConnectResponse>(
        "shopify-oauth-start",
        {
          body: { shopDomain },
        }
      );
      
      if (error) throw error;
      
      console.log("OAuth URL generated:", result);
      
      // Redirect to Shopify authorization page
      if (result?.authUrl) {
        window.location.href = result.authUrl;
        return result.authUrl;
      }
      
      return null;
    } catch (error) {
      console.error("Error starting Shopify OAuth:", error);
      toast.error("Erreur lors de la connexion à Shopify");
      return null;
    } finally {
      setConnecting(false);
    }
  };

  const completeOAuthFlow = async (code: string, shop: string): Promise<boolean> => {
    try {
      console.log("Completing Shopify OAuth...", { shop });
      
      const { data: result, error } = await supabase.functions.invoke(
        "shopify-oauth-callback",
        {
          body: { code, shop },
        }
      );
      
      if (error) throw error;
      
      console.log("Shopify connected successfully:", result);
      toast.success("Shopify connecté avec succès");
      
      return true;
    } catch (error) {
      console.error("Error completing Shopify OAuth:", error);
      toast.error("Erreur lors de la finalisation de la connexion Shopify");
      return false;
    }
  };

  const fetchShopifyData = async (): Promise<any | null> => {
    try {
      setFetchingData(true);
      console.log("Fetching Shopify data...");
      
      const { data: result, error } = await supabase.functions.invoke(
        "fetch-shopify-data",
        {
          body: {},
        }
      );
      
      if (error) throw error;
      
      console.log("Shopify data fetched:", result);
      toast.success("Données Shopify récupérées");
      
      return result;
    } catch (error) {
      console.error("Error fetching Shopify data:", error);
      toast.error("Erreur lors de la récupération des données Shopify");
      return null;
    } finally {
      setFetchingData(false);
    }
  };

  const checkConnection = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('connections_shopify')
        .select('shop_domain')
        .eq('user_id', user.id)
        .maybeSingle();

      return !error && !!data;
    } catch (error) {
      console.error("Error checking Shopify connection:", error);
      return false;
    }
  };

  return { 
    startOAuthFlow,
    completeOAuthFlow,
    fetchShopifyData,
    checkConnection,
    connecting,
    fetchingData,
  };
};
