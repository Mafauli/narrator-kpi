import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PromptEditor } from "@/components/admin/PromptEditor";
import { PromptHistory } from "@/components/admin/PromptHistory";
import { BriefAnalysis } from "@/components/admin/BriefAnalysis";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SystemPrompt {
  id: string;
  name: string;
  prompt_text: string;
  variables: any;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const AdminPrompts = () => {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedPromptName, setSelectedPromptName] = useState<string>('brief-text-generation');
  const [currentPrompt, setCurrentPrompt] = useState<SystemPrompt | null>(null);
  const [allVersions, setAllVersions] = useState<SystemPrompt[]>([]);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/app");
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);

      // Récupérer le prompt actif
      const { data: activePrompt, error: activeError } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('name', selectedPromptName)
        .eq('is_active', true)
        .maybeSingle();

      if (activeError) throw activeError;

      // Récupérer toutes les versions
      const { data: versions, error: versionsError } = await supabase
        .from('system_prompts')
        .select('*')
        .eq('name', selectedPromptName)
        .order('version', { ascending: false });

      if (versionsError) throw versionsError;

      setCurrentPrompt(activePrompt);
      setAllVersions(versions || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchPrompts();
    }
  }, [isAdmin, selectedPromptName]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Gestion des Prompts</h2>
          <p className="text-muted-foreground">
            Éditez les prompts DeepSeek, consultez l'historique et analysez les réponses générées
          </p>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedPromptName('brief-text-generation')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPromptName === 'brief-text-generation'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Génération de Brief
          </button>
          <button
            onClick={() => setSelectedPromptName('onboarding-ai-infer')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPromptName === 'onboarding-ai-infer'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Onboarding AI
          </button>
        </div>

        <Tabs defaultValue="editor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
            <TabsTrigger value="editor">Éditeur</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            <PromptEditor 
              currentPrompt={currentPrompt} 
              onSave={fetchPrompts}
            />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <PromptHistory 
              versions={allVersions}
              onRollback={fetchPrompts}
            />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <BriefAnalysis />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPrompts;
