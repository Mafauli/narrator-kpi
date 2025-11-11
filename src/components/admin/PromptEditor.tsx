import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface PromptEditorProps {
  currentPrompt: SystemPrompt | null;
  onSave: () => void;
}

export const PromptEditor = ({ currentPrompt, onSave }: PromptEditorProps) => {
  const [promptText, setPromptText] = useState(currentPrompt?.prompt_text || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPrompt) return;

    try {
      setSaving(true);

      const newVersion = currentPrompt.version + 1;

      // Désactiver l'ancien prompt
      await supabase
        .from('system_prompts')
        .update({ is_active: false })
        .eq('name', currentPrompt.name);

      // Créer la nouvelle version
      const { error } = await supabase
        .from('system_prompts')
        .insert({
          name: currentPrompt.name,
          prompt_text: promptText,
          variables: currentPrompt.variables,
          is_active: true,
          version: newVersion,
        });

      if (error) throw error;

      toast.success(`Nouvelle version ${newVersion} sauvegardée`);
      onSave();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPromptText(currentPrompt?.prompt_text || "");
    toast.info('Modifications annulées');
  };

  const hasChanges = promptText !== currentPrompt?.prompt_text;

  const variables = [
    { name: "{{domain}}", description: "Domaine d'expertise de l'avatar" },
    { name: "{{wordLimit}}", description: "Limite de mots calculée" },
    { name: "{{targetWords}}", description: "Nombre de mots cibles" },
    { name: "{{data}}", description: "Données JSON de l'utilisateur" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Éditeur de Prompt DeepSeek</CardTitle>
            <CardDescription className="mt-2">
              Version actuelle : <Badge variant="secondary">v{currentPrompt?.version || 1}</Badge>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset} size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || saving}
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Sauvegarder v{(currentPrompt?.version || 0) + 1}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Texte du Prompt
          </label>
          <Textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="Entrez le prompt système pour DeepSeek..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            {promptText.length} caractères • {promptText.split('\n').length} lignes
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Variables disponibles</h4>
          <div className="grid gap-2">
            {variables.map((variable) => (
              <div 
                key={variable.name} 
                className="flex items-start gap-3 p-3 rounded-md bg-muted/50 border border-border"
              >
                <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                  {variable.name}
                </code>
                <p className="text-xs text-muted-foreground">{variable.description}</p>
              </div>
            ))}
          </div>
        </div>

        {hasChanges && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-md">
            <p className="text-sm text-warning-foreground">
              ⚠️ Modifications non sauvegardées. Cliquez sur "Sauvegarder" pour créer une nouvelle version.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
