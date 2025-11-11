import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCcw, Eye } from "lucide-react";
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

interface PromptHistoryProps {
  versions: SystemPrompt[];
  onRollback: () => void;
}

export const PromptHistory = ({ versions, onRollback }: PromptHistoryProps) => {
  const [selectedVersion, setSelectedVersion] = useState<SystemPrompt | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleRollback = async (version: SystemPrompt) => {
    if (!confirm(`Restaurer la version ${version.version} ?`)) return;

    try {
      setRolling(true);

      // Désactiver toutes les versions
      await supabase
        .from('system_prompts')
        .update({ is_active: false })
        .eq('name', version.name);

      // Activer la version sélectionnée
      const { error } = await supabase
        .from('system_prompts')
        .update({ is_active: true })
        .eq('id', version.id);

      if (error) throw error;

      toast.success(`Version ${version.version} restaurée`);
      onRollback();
    } catch (error) {
      console.error('Error rolling back:', error);
      toast.error('Erreur lors de la restauration');
    } finally {
      setRolling(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historique des Versions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Aperçu</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">
                    v{version.version}
                  </TableCell>
                  <TableCell>
                    {version.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="outline">Archivée</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(version.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono max-w-[300px] truncate">
                    {version.prompt_text.substring(0, 80)}...
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedVersion(version)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!version.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRollback(version)}
                        disabled={rolling}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restaurer
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedVersion} onOpenChange={() => setSelectedVersion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version {selectedVersion?.version}</DialogTitle>
            <DialogDescription>
              Créée le {selectedVersion && new Date(selectedVersion.created_at).toLocaleString('fr-FR')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <pre className="bg-muted p-4 rounded-md text-xs overflow-x-auto">
              {selectedVersion?.prompt_text}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
