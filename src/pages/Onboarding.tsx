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
import { Badge } from "@/components/ui/badge";
import { Play, Database, Settings, Sparkles, HelpCircle, ChevronDown, User, Volume2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useElevenLabsVoices } from "@/hooks/useElevenLabsVoices";
import { VoicePreviewCard } from "@/components/VoicePreviewCard";
import { AIPreferencesStep } from "@/components/onboarding/AIPreferencesStep";

// Avatar images
import leoAvatar from "@/assets/avatars/leo.png";
import emmaAvatar from "@/assets/avatars/emma.png";
import inesAvatar from "@/assets/avatars/ines.png";
import sofiaAvatar from "@/assets/avatars/sofia.png";
import javierAvatar from "@/assets/avatars/javier.png";
import mayaAvatar from "@/assets/avatars/maya.png";
import noahAvatar from "@/assets/avatars/noah.png";
import anaAvatar from "@/assets/avatars/ana.png";

const avatarImages: Record<string, string> = {
  'ceo_alpha': leoAvatar,
  'cfo_delta': emmaAvatar,
  'cmo_nova': inesAvatar,
  'coo_orion': sofiaAvatar,
  'sales_zenith': javierAvatar,
  'ecom_lumen': mayaAvatar,
  'cs_aurora': noahAvatar,
  'ops_legal': anaAvatar
};

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
    
    // Handle direct step navigation from URL
    const stepParam = searchParams.get('step');
    if (stepParam) {
      const stepNumber = parseInt(stepParam);
      if (stepNumber >= 1 && stepNumber <= 5) {
        setStep(stepNumber);
        // If going to step 2 or later, ensure Airtable is connected
        if (stepNumber >= 2) {
          setAirtableConnected(true);
          fetchBases();
        }
      }
    }
  }, [searchParams, setSearchParams]);

  // Load existing data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load existing views
      const { data: viewsData } = await supabase
        .from('airtable_views')
        .select('*')
        .eq('user_id', user.id);

      if (viewsData && viewsData.length > 0) {
        const loadedViews = viewsData.map(v => ({
          baseId: v.base_id,
          baseName: v.base_name,
          tableId: v.table_id,
          tableName: v.table_name,
          viewId: v.view_id,
          viewName: v.view_name
        }));
        setSelectedViews(loadedViews);
        console.log('✅ Loaded existing views:', loadedViews.length);
      }

      // Load existing preferences
      const { data: prefsData } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsData) {
        setBusinessModel(prefsData.business_model || 'saas');
        setCurrency(prefsData.currency || 'EUR');
        setLang(prefsData.lang || 'FR');
        setTimezone(prefsData.timezone || 'Europe/Paris');
        setSendDay(prefsData.send_dow || 1);
        setSendHour(prefsData.send_hour || 8);
        setNorthStar(prefsData.north_star || 'MRR');
        setGoalValue(prefsData.goal_value?.toString() || '10');
        setTone(prefsData.tone || 'no-bs');
        
        // Load avatar if exists
        if (prefsData.avatar_id) {
          setSelectedVoice(prefsData.voice_id || '');
        }
        
        console.log('✅ Loaded existing preferences');
      }

      // Check if Airtable is connected
      const { data: connData } = await supabase
        .from('connections_airtable')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (connData) {
        setAirtableConnected(true);
        console.log('✅ Airtable already connected');
        
        // Auto-load bases if connected
        const stepParam = searchParams.get('step');
        if (stepParam === '2') {
          await fetchBases();
          
          // If views exist, pre-select the first base to show tables
          if (viewsData && viewsData.length > 0) {
            const firstBase = viewsData[0].base_id;
            setSelectedBase(firstBase);
            await fetchTables(firstBase);
          }
        }
      }

      // Load avatars
      const { data: avatarsData } = await supabase
        .from('avatars')
        .select('*')
        .order('created_at');

      if (avatarsData) {
        setAvatars(avatarsData);
        console.log('✅ Loaded avatars:', avatarsData.length);
        
        // Pre-select avatar if exists in preferences
        if (prefsData?.avatar_id) {
          const avatar = avatarsData.find(a => a.id === prefsData.avatar_id);
          if (avatar) {
            setSelectedAvatar(avatar);
            console.log('✅ Pre-selected avatar:', avatar.name);
          }
        }
      }
    };

    loadExistingData();
  }, []);

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

  // Step 4: Avatar selection
  const [avatars, setAvatars] = useState<any[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<any>(null);
  const [avatarSectorFilter, setAvatarSectorFilter] = useState<string>("all");
  const [avatarToneFilter, setAvatarToneFilter] = useState<string>("all");
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  // ElevenLabs voices
  const { voices, loading: voicesLoading, syncing, syncVoices } = useElevenLabsVoices();

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

  const handleSaveAvatar = async () => {
    if (!selectedAvatar) {
      toast.error("Sélectionne un avatar");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      const { error } = await supabase.from("preferences").update({
        avatar_id: selectedAvatar.id,
        voice_id: selectedVoice || selectedAvatar.voice_reco,
        avatar_sectors: selectedAvatar.best_for
      }).eq("user_id", user.id);

      if (error) throw error;

      toast.success("Avatar enregistré !");
      setStep(5);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-4 mb-8">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            onClick={() => setStep(i)}
            disabled={i > step && step < 5}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold transition-all ${
              step >= i 
                ? "bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer" 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            } ${step === i ? "ring-2 ring-accent ring-offset-2" : ""}`}
            title={i > step ? "Complétez les étapes précédentes" : `Étape ${i}`}
          >
            {i}
          </button>
          {i < 5 && <div className={`w-12 h-1 ${step > i ? "bg-accent" : "bg-muted"}`} />}
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
        <div className={`mx-auto space-y-8 ${step === 4 ? 'max-w-7xl' : 'max-w-2xl'}`}>
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
                {selectedViews.length > 0 && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                    <p className="text-sm">
                      ✅ Tu as déjà <strong>{selectedViews.length} vue{selectedViews.length > 1 ? 's' : ''} configurée{selectedViews.length > 1 ? 's' : ''}</strong>. 
                      Tu peux modifier ta sélection ci-dessous.
                    </p>
                  </div>
                )}
                
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

          {/* Step 3: AI-Powered Preferences */}
          {step === 3 && (
            <AIPreferencesStep 
              onComplete={() => setStep(4)} 
              selectedViews={selectedViews}
            />
          )}

          {/* Step 4: Avatar selection */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-accent mb-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Choisis ton avatar</CardTitle>
                </div>
                <CardDescription>
                  Sélectionne l'avatar qui t'accompagnera dans tes briefs hebdomadaires
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Filters */}
                <div className="flex gap-4">
                  <Select value={avatarSectorFilter} onValueChange={setAvatarSectorFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Tous les secteurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les secteurs</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="ecom">E-commerce</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="agences">Agence</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={avatarToneFilter} onValueChange={setAvatarToneFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Tous les tons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les tons</SelectItem>
                      <SelectItem value="sobre">Sobre</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="no-bs">No-BS</SelectItem>
                      <SelectItem value="energique">Énergique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Avatar Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {avatars
                    .filter(avatar => avatarSectorFilter === "all" || avatar.best_for.includes(avatarSectorFilter))
                    .filter(avatar => avatarToneFilter === "all" || avatar.default_tone === avatarToneFilter)
                    .map((avatar) => (
                      <Card key={avatar.id} className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedAvatar?.id === avatar.id ? 'ring-2 ring-accent shadow-lg' : ''
                      }`}>
                        <CardContent className="p-5 space-y-4">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                            <img 
                              src={avatarImages[avatar.id]} 
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">{avatar.name}</h3>
                            <p className="text-sm text-muted-foreground">{avatar.role}</p>
                          </div>
                          <p className="text-sm line-clamp-2 min-h-[2.5rem]">{avatar.pitch}</p>
                          <div className="flex flex-wrap gap-1 min-h-[28px]">
                            {avatar.skills.slice(0, 3).map((skill: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 w-full"
                              onClick={async () => {
                                try {
                                  // Fetch the voice mapping for this avatar
                                  const { data: mapping } = await supabase
                                    .from('avatar_voice_mapping')
                                    .select('elevenlabs_voice_id')
                                    .eq('avatar_id', avatar.id)
                                    .single();
                                  
                                  if (!mapping?.elevenlabs_voice_id) {
                                    toast.error("Aucune voix mappée pour cet avatar");
                                    return;
                                  }

                                  // Fetch voice details
                                  const { data: voice } = await supabase
                                    .from('elevenlabs_voices')
                                    .select('preview_url')
                                    .eq('voice_id', mapping.elevenlabs_voice_id)
                                    .single();
                                  
                                  if (!voice?.preview_url) {
                                    toast.error("Preview audio non disponible");
                                    return;
                                  }

                                  // Play the preview
                                  const audio = new Audio(voice.preview_url);
                                  audio.play();
                                } catch (error) {
                                  console.error('Error playing preview:', error);
                                  toast.error("Erreur lors de la lecture");
                                }
                              }}
                            >
                              <Volume2 className="h-3 w-3 mr-1" />
                              Aperçu
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 w-full bg-accent hover:bg-accent/90"
                              onClick={() => {
                                setSelectedAvatar(avatar);
                                setSelectedVoice(avatar.voice_reco);
                              }}
                            >
                              {selectedAvatar?.id === avatar.id ? '✓ Sélectionné' : 'Choisir'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Selected avatar detail panel */}
                {selectedAvatar && (
                  <Card className="bg-accent/5 border-accent/20">
                    <CardContent className="p-6 space-y-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Détails de {selectedAvatar.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedAvatar.long_pitch}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Compétences clés</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedAvatar.skills.map((skill: string, i: number) => (
                            <Badge key={i} variant="outline">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Exemples d'actions</h4>
                        <ul className="space-y-1 text-sm">
                          {selectedAvatar.example_actions.map((action: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-accent mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Voice selection section */}
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium">Choisis une voix</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={syncVoices}
                            disabled={syncing}
                            className="h-8 gap-2"
                          >
                            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? "Sync..." : "Sync voix"}
                          </Button>
                        </div>

                        {voicesLoading ? (
                          <p className="text-sm text-muted-foreground">Chargement des voix...</p>
                        ) : voices.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-3">
                              Aucune voix disponible. Synchronise les voix depuis ElevenLabs.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={syncVoices}
                              disabled={syncing}
                            >
                              <RefreshCw className={`h-3 w-3 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                              Synchroniser les voix
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {voices.slice(0, 5).map((voice) => (
                              <VoicePreviewCard
                                key={voice.voice_id}
                                voice={voice}
                                isSelected={selectedVoice === voice.voice_id}
                                onSelect={() => setSelectedVoice(voice.voice_id)}
                                compact
                              />
                            ))}
                            {voices.length > 5 && (
                              <p className="text-xs text-muted-foreground text-center pt-2">
                                {voices.length - 5} autres voix disponibles
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button 
                  onClick={handleSaveAvatar} 
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={isLoading || !selectedAvatar}
                >
                  {isLoading ? "Enregistrement..." : "Continuer"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Preview */}
          {step === 5 && (
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
                {selectedAvatar && (
                  <div className="bg-secondary/30 rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold">Ton avatar</h3>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden">
                        <img 
                          src={avatarImages[selectedAvatar.id]} 
                          alt={selectedAvatar.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{selectedAvatar.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedAvatar.role}</p>
                        {selectedVoice && (
                          <Badge variant="secondary" className="mt-1">
                            {voices.find(v => v.voice_id === selectedVoice)?.name || "Voix personnalisée"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
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
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Vues Airtable :</span>
                      <span className="ml-2 font-medium">{selectedViews.length} vue{selectedViews.length > 1 ? 's' : ''} sélectionnée{selectedViews.length > 1 ? 's' : ''}</span>
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
