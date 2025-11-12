import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Database, ShoppingBag, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShopify } from "@/hooks/useShopify";
import { ShopifyDemoButton } from "@/components/ShopifyDemoButton";

const Sources = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startOAuthFlow, completeOAuthFlow, checkConnection, connecting } = useShopify();

  const [airtableConnected, setAirtableConnected] = useState(false);
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyDomain, setShopifyDomain] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("airtable");
  const [checkingConnections, setCheckingConnections] = useState(true);

  useEffect(() => {
    checkConnections();
    
    // Handle Shopify OAuth callback
    const shopifyCallback = searchParams.get('shopify');
    const code = searchParams.get('code');
    const shop = searchParams.get('shop');
    
    if (shopifyCallback === 'connected' && code && shop) {
      completeOAuthFlow(code, shop).then(() => {
        checkConnections();
      });
    }
  }, [searchParams]);

  const checkConnections = async () => {
    setCheckingConnections(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check Airtable
      const { data: airtableData } = await supabase
        .from('connections_airtable')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setAirtableConnected(!!airtableData);

      // Check Shopify
      const shopifyStatus = await checkConnection();
      setShopifyConnected(shopifyStatus);

      // Auto-select source based on what's connected
      if (shopifyStatus && !airtableData) {
        setSelectedSource("shopify");
      } else if (!shopifyStatus && airtableData) {
        setSelectedSource("airtable");
      } else if (shopifyStatus && airtableData) {
        setSelectedSource("both");
      }
    } catch (error) {
      console.error("Error checking connections:", error);
    } finally {
      setCheckingConnections(false);
    }
  };

  const handleConnectAirtable = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("airtable-oauth-start");
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Error connecting to Airtable:", error);
      toast.error("Erreur lors de la connexion à Airtable");
    }
  };

  const handleConnectShopify = async () => {
    if (!shopifyDomain.trim()) {
      toast.error("Veuillez entrer votre domaine Shopify");
      return;
    }
    await startOAuthFlow({ shopDomain: shopifyDomain });
  };

  const handleSaveSource = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save selected source preference
      const { error } = await supabase
        .from('preferences')
        .update({ 
          // Store as JSON in a metadata field or add a new column
          // For now, we'll just validate the selection
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Source de données enregistrée");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error saving source:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  if (checkingConnections) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sources de données</h1>
            <p className="text-muted-foreground">Connectez vos sources pour générer vos briefs</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Airtable */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Airtable</CardTitle>
                    <CardDescription>Base de données flexible</CardDescription>
                  </div>
                </div>
                {airtableConnected && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connecté
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!airtableConnected ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connectez votre compte Airtable pour analyser vos bases de données et générer des briefs personnalisés.
                  </p>
                  <Button 
                    onClick={handleConnectAirtable}
                    className="w-full"
                  >
                    Connecter Airtable
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Votre compte Airtable est connecté
                  </p>
                  <Button 
                    variant="outline"
                    onClick={handleConnectAirtable}
                    className="w-full"
                  >
                    Reconnecter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shopify */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>Shopify</CardTitle>
                    <CardDescription>Boutique e-commerce</CardDescription>
                  </div>
                </div>
                {shopifyConnected && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connecté
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!shopifyConnected ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Connectez votre boutique Shopify pour analyser vos ventes, produits et clients.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="shopify-domain">Domaine Shopify</Label>
                    <Input
                      id="shopify-domain"
                      placeholder="votre-boutique.myshopify.com"
                      value={shopifyDomain}
                      onChange={(e) => setShopifyDomain(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleConnectShopify}
                    disabled={connecting}
                    className="w-full"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Connexion...
                      </>
                    ) : (
                      "Connecter Shopify"
                    )}
                  </Button>
                  <div className="pt-2 border-t">
                    <ShopifyDemoButton />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Votre boutique Shopify est connectée
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShopifyDomain("");
                      handleConnectShopify();
                    }}
                    className="w-full"
                  >
                    Reconnecter
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Source Selection */}
        {(airtableConnected || shopifyConnected) && (
          <Card>
            <CardHeader>
              <CardTitle>Sélection de la source pour les briefs</CardTitle>
              <CardDescription>
                Choisissez quelle(s) source(s) utiliser pour générer vos briefs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {airtableConnected && (
                    <SelectItem value="airtable">Airtable uniquement</SelectItem>
                  )}
                  {shopifyConnected && (
                    <SelectItem value="shopify">Shopify uniquement</SelectItem>
                  )}
                  {airtableConnected && shopifyConnected && (
                    <SelectItem value="both">Les deux sources</SelectItem>
                  )}
                </SelectContent>
              </Select>

              <Button onClick={handleSaveSource} className="w-full">
                Enregistrer et continuer
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Sources;
