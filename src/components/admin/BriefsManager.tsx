import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Eye, Trash2, Search, Loader2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Brief {
  id: string;
  user_id: string;
  week_start: string;
  script_text: string | null;
  audio_url: string | null;
  email_status: string;
  created_at: string;
}

export const BriefsManager = () => {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [filteredBriefs, setFilteredBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedBrief, setSelectedBrief] = useState<Brief | null>(null);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setBriefs(data || []);
      setFilteredBriefs(data || []);
    } catch (error) {
      console.error('Error fetching briefs:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefs();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredBriefs(briefs);
      return;
    }

    const filtered = briefs.filter(brief =>
      brief.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brief.script_text?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBriefs(filtered);
  }, [searchTerm, briefs]);

  const handleView = (brief: Brief) => {
    setSelectedBrief(brief);
    setViewDialog(true);
  };

  const handleDelete = async (briefId: string) => {
    if (!confirm('Supprimer ce brief ?')) return;

    try {
      const { error } = await supabase
        .from('briefs')
        .delete()
        .eq('id', briefId);

      if (error) throw error;

      toast.success('Brief supprimé');
      fetchBriefs();
    } catch (error) {
      console.error('Error deleting brief:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Briefs</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ID, user ID, ou contenu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Semaine</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Audio</TableHead>
                    <TableHead>Aperçu</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBriefs.map((brief) => (
                    <TableRow key={brief.id}>
                      <TableCell className="text-sm">
                        {new Date(brief.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(brief.week_start).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {brief.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={brief.email_status === 'sent' ? 'default' : 'secondary'}>
                          {brief.email_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {brief.audio_url ? (
                          <a 
                            href={brief.audio_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline"
                          >
                            <PlayCircle className="h-4 w-4 mr-1" />
                            Écouter
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {brief.script_text?.substring(0, 50)}...
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(brief)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brief.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du Brief</DialogTitle>
            <DialogDescription>
              {selectedBrief && `Créé le ${new Date(selectedBrief.created_at).toLocaleString('fr-FR')}`}
            </DialogDescription>
          </DialogHeader>

          {selectedBrief && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">ID</p>
                  <p className="text-sm font-mono">{selectedBrief.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="text-sm font-mono">{selectedBrief.user_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Semaine</p>
                  <p className="text-sm">{new Date(selectedBrief.week_start).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <Badge>{selectedBrief.email_status}</Badge>
                </div>
              </div>

              {selectedBrief.audio_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Audio</p>
                  <audio controls className="w-full">
                    <source src={selectedBrief.audio_url} type="audio/mpeg" />
                  </audio>
                </div>
              )}

              {selectedBrief.script_text && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Texte du Brief</p>
                  <div className="bg-muted p-4 rounded-md max-h-[400px] overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{selectedBrief.script_text}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
