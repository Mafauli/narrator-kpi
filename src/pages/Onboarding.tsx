import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Play, Database, Settings, Sparkles, HelpCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Airtable connection
  const [airtableConnected, setAirtableConnected] = useState(false);

  // Step 2: View selection
  const [bases, setBases] = useState<any[]>([]);
  const [selectedBase, setSelectedBase] = useState<string>("");
  const [tables, setTables] = useState<any[]>([]);
  const [selectedViews, setSelectedViews] = useState<{
    baseId: string;
    baseName: string;
    tableId: string;
    tableName: string;
    viewId: string;
    viewName: string;
  }[]>([]);

  // Detect OAuth redirect with success parameter
  useEffect(() => {
    if (searchParams.get('airtable_connected') === 'true') {
      setAirtableConnected(true);
      // Remove the parameter from URL
      searchParams.delete('airtable_connected');
      setSearchParams(searchParams, { replace: true });
      toast.success("Connexion Airtable établie !");
      // Fetch bases immediately after connection
      fetchBases();
    }
  }, [searchParams, setSearchParams]);

  const fetchBases = async () => {
    try {
      console.log('🔍 Fetching Airtable bases...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expirée, reconnecte-toi");
        return;
      }

      const { data, error } = await supabase.functions.invoke('airtable-list-bases');
      
      console.log('📦 Response:', { data, error });
      
      if (error) {
        console.error('❌ Error from edge function:', error);
        throw error;
      }
      
      if (!data || !data.bases) {
        console.warn('⚠️ No bases in response:', data);
        toast.error("Aucune base trouvée");
        return;
      }
      
      console.log('✅ Bases loaded:', data.bases.length);
      setBases(data.bases || []);
      
      if (data.bases && data.bases.length > 0) {
        setStep(2); // Move to view selection
      }
    } catch (error: any) {
      console.error('❌ Error in fetchBases:', error);
      toast.error(`Erreur: ${error.message || "Erreur lors du chargement des bases"}`);
    }
  };

  const fetchTables = async (baseId: string) => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('airtable-list-tables', {
        body: { baseId }
      });
      
      if (error) throw error;
      setTables(data.tables || []);
    } catch (error: any) {
      toast.error("Erreur lors du chargement des tables");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewToggle = (baseId: string, baseName: string, tableId: string, tableName: string, viewId: string, viewName: string) => {
    const viewKey = `${baseId}-${tableId}-${viewId}`;
    const existingIndex = selectedViews.findIndex(
      v => `${v.baseId}-${v.tableId}-${v.viewId}` === viewKey
    );

    if (existingIndex >= 0) {
      setSelectedViews(selectedViews.filter((_, i) => i !== existingIndex));
    } else {
      setSelectedViews([...selectedViews, { baseId, baseName, tableId, tableName, viewId, viewName }]);
    }
  };

  const handleSaveViews = async () => {
    if (selectedViews.length === 0) {
      toast.error("Sélectionne au moins une vue");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Delete existing views
      await supabase.from("airtable_views").delete().eq("user_id", user.id);

      // Insert selected views
      const { error } = await supabase.from("airtable_views").insert(
        selectedViews.map(v => ({
          user_id: user.id,
          base_id: v.baseId,
          base_name: v.baseName,
          table_id: v.tableId,
          table_name: v.tableName,
          view_id: v.viewId,
          view_name: v.viewName,
          enabled: true
        }))
      );

      if (error) throw error;

      toast.success("Vues enregistrées !");
      setStep(3);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Preferences
  const [businessModel, setBusinessModel] = useState<"saas" | "ecommerce" | "services" | "other">("saas");
  const [currency, setCurrency] = useState("EUR");
  const [lang, setLang] = useState("FR");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [sendDay, setSendDay] = useState(1);
  const [sendHour, setSendHour] = useState(8);
  const [northStar, setNorthStar] = useState("MRR");
  const [goalValue, setGoalValue] = useState("10");
  const [tone, setTone] = useState<"sobre" | "coach" | "energique" | "no-bs">("no-bs");

  const handleConnectAirtable = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      console.log('🔐 Starting OAuth flow for user:', user.id);

      const state = user.id;
      const { data, error } = await supabase.functions.invoke('airtable-oauth-start', {
        body: { userId: user.id, state }
      });

      if (error) {
        console.error('❌ OAuth start error:', error);
        throw error;
      }

      console.log('✅ OAuth URL received:', data.authUrl);

      // Open OAuth in popup window
      console.log('🔄 Opening Airtable OAuth popup...');
      const popup = window.open(
        data.authUrl,
        'airtable-oauth',
        'width=600,height=700,scrollbars=yes'
      );
      
      if (!popup) {
        toast.error("Popup bloquée ! Active les popups et réessaye.");
        setIsLoading(false);
        return;
      }
      
      // Reset loading state immediately since we're using a popup
      setIsLoading(false);
    } catch (error: any) {
      console.error('❌ Error in handleConnectAirtable:', error);
      toast.error(error.message || "Erreur lors de la connexion");
      setIsLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase.from("preferences").upsert({
        user_id: user.id,
        business_model: businessModel,
        currency,
        lang,
        timezone,
        send_dow: sendDay,
        send_hour: sendHour,
        north_star: northStar,
        goal_value: parseFloat(goalValue),
        tone,
        kpi_pack_json: {},
        thresholds_json: {}
      });

      if (error) throw error;

      toast.success("Préférences enregistrées !");
      setStep(4);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    toast.success("Configuration terminée !");
    navigate("/app");
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-4 mb-8">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
            step >= i ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {i}
          </div>
          {i < 4 && <div className={`w-12 h-1 ${step > i ? "bg-accent" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Play className="h-6 w-6 text-accent" />
            <span className="text-xl font-bold">KPI Narrator</span>
          </div>
        </div>
      </header>

      <div className="container py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Configuration initiale</h1>
            <p className="text-muted-foreground">
              4 étapes rapides pour recevoir ton premier brief
            </p>
          </div>

          {renderStepIndicator()}

          {/* Step 1: Connect Airtable */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Database className="h-5 w-5" />
                  <CardTitle>Connecte ton Airtable</CardTitle>
                </div>
                <CardDescription>
                  Connexion OAuth sécurisée (lecture seule)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!airtableConnected ? (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                      <Database className="h-8 w-8 text-accent" />
                    </div>
                    <p className="text-muted-foreground">
                      Autorise KPI Narrator à lire tes bases Airtable.<br />
                      Aucune écriture, tokens chiffrés.
                    </p>
                    <Button
                      size="lg"
                      className="bg-accent hover:bg-accent/90"
                      onClick={handleConnectAirtable}
                      disabled={isLoading}
                    >
                      <Database className="mr-2 h-5 w-5" />
                      {isLoading ? "Connexion..." : "Connecter avec Airtable"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent">
                      <Database className="h-5 w-5" />
                      <span className="font-medium">Connexion établie</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tes bases Airtable sont maintenant accessibles.
                    </p>
                    <Button onClick={() => fetchBases()} className="w-full">
                      Sélectionner les vues à analyser
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: View Selection */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Database className="h-5 w-5" />
                  <CardTitle>Sélectionne tes vues Airtable</CardTitle>
                </div>
                <CardDescription>
                  Choisis les vues que KPI Narrator doit analyser chaque semaine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {bases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chargement des bases...
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Base Airtable</Label>
                      <Select value={selectedBase} onValueChange={(v) => {
                        setSelectedBase(v);
                        fetchTables(v);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionne une base" />
                        </SelectTrigger>
                        <SelectContent>
                          {bases.map((base) => (
                            <SelectItem key={base.id} value={base.id}>
                              {base.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {tables.length > 0 && (
                      <div className="space-y-4">
                        <Label>Sélectionne les vues à analyser</Label>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {tables.map((table) => (
                            <div key={table.id} className="border rounded-lg p-4 space-y-2">
                              <div className="font-medium text-sm flex items-center gap-2">
                                <ChevronDown className="h-4 w-4" />
                                {table.name}
                              </div>
                              <div className="ml-6 space-y-2">
                                {table.views?.map((view: any) => {
                                  const isSelected = selectedViews.some(
                                    v => v.baseId === selectedBase && v.tableId === table.id && v.viewId === view.id
                                  );
                                  const baseName = bases.find(b => b.id === selectedBase)?.name || "";
                                  return (
                                    <div key={view.id} className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => 
                                          handleViewToggle(selectedBase, baseName, table.id, table.name, view.id, view.name)
                                        }
                                      />
                                      <Label className="text-sm font-normal cursor-pointer">
                                        {view.name}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedViews.length > 0 && (
                      <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
                        <div className="font-medium text-sm">Vues sélectionnées ({selectedViews.length})</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedViews.map((view, i) => (
                            <div key={i} className="text-xs bg-background border rounded px-2 py-1">
                              {view.baseName} → {view.tableName} → {view.viewName}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={handleSaveViews} 
                      className="w-full"
                      disabled={isLoading || selectedViews.length === 0}
                    >
                      {isLoading ? "Enregistrement..." : "Continuer"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Settings className="h-5 w-5" />
                  <CardTitle>Configure tes préférences</CardTitle>
                </div>
                <CardDescription>
                  Personnalise ton brief hebdomadaire
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modèle business</Label>
                    <Select value={businessModel} onValueChange={(v: any) => setBusinessModel(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="saas">SaaS</SelectItem>
                        <SelectItem value="ecommerce">E-commerce</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Langue audio</Label>
                    <Select value={lang} onValueChange={setLang}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FR">Français</SelectItem>
                        <SelectItem value="EN">English</SelectItem>
                        <SelectItem value="ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fuseau horaire</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                        <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Jour d'envoi</Label>
                    <Select value={sendDay.toString()} onValueChange={(v) => setSendDay(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Lundi</SelectItem>
                        <SelectItem value="2">Mardi</SelectItem>
                        <SelectItem value="3">Mercredi</SelectItem>
                        <SelectItem value="4">Jeudi</SelectItem>
                        <SelectItem value="5">Vendredi</SelectItem>
                        <SelectItem value="6">Samedi</SelectItem>
                        <SelectItem value="7">Dimanche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Heure d'envoi</Label>
                    <Select value={sendHour.toString()} onValueChange={(v) => setSendHour(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {String(i).padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>North Star (KPI principal)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          Le KPI le plus important pour ton business (ex: MRR, CA, nombre d'utilisateurs actifs). 
                          C'est la métrique principale que tu veux suivre chaque semaine.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input 
                    value={northStar} 
                    onChange={(e) => setNorthStar(e.target.value)}
                    placeholder="Ex: MRR, CA mensuel, Utilisateurs actifs..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Objectif 8 semaines (%)</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          La croissance que tu vises pour ton North Star KPI sur les 8 prochaines semaines.
                          Ex: +10% signifie que tu veux augmenter ton KPI de 10% en 8 semaines.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input 
                    type="number" 
                    value={goalValue} 
                    onChange={(e) => setGoalValue(e.target.value)}
                    placeholder="Ex: 10 (pour +10%)"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Ton du brief</Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">
                          <strong>Sobre:</strong> Factuel et direct<br/>
                          <strong>Coach:</strong> Encourageant et positif<br/>
                          <strong>Énergique:</strong> Dynamique et motivant<br/>
                          <strong>No-BS:</strong> Franc et sans détour
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={tone} onValueChange={(v: any) => setTone(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sobre">Sobre</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="energique">Énergique</SelectItem>
                      <SelectItem value="no-bs">No-BS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Retour
                  </Button>
                  <Button
                    className="flex-1 bg-accent hover:bg-accent/90"
                    onClick={handleSavePreferences}
                    disabled={isLoading}
                  >
                    {isLoading ? "Enregistrement..." : "Continuer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Preview */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Sparkles className="h-5 w-5" />
                  <CardTitle>Configuration terminée !</CardTitle>
                </div>
                <CardDescription>
                  Tu recevras ton premier brief le {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][sendDay]} à {String(sendHour).padStart(2, '0')}:00
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-secondary/30 rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold">Récapitulatif</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Modèle :</span>
                      <span className="ml-2 font-medium">{businessModel}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Langue :</span>
                      <span className="ml-2 font-medium">{lang}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">North Star :</span>
                      <span className="ml-2 font-medium">{northStar}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ton :</span>
                      <span className="ml-2 font-medium">{tone}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Tu peux modifier ces paramètres à tout moment depuis la page Paramètres.
                </p>

                <Button
                  className="w-full bg-accent hover:bg-accent/90"
                  onClick={handleComplete}
                  size="lg"
                >
                  Accéder au dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
};

export default Onboarding;
