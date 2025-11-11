import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BriefLog {
  id: string;
  brief_id: string | null;
  user_id: string;
  prompt_text_used: string;
  deepseek_response_full: string;
  deepseek_tokens_input: number;
  deepseek_tokens_output: number;
  deepseek_cost: number;
  generation_duration_ms: number;
  created_at: string;
}

export const BriefAnalysis = () => {
  const [logs, setLogs] = useState<BriefLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<BriefLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<BriefLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brief_generation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
      setFilteredLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredLogs(logs);
      return;
    }

    const filtered = logs.filter(log =>
      log.deepseek_response_full.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.prompt_text_used.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLogs(filtered);
  }, [searchTerm, logs]);

  const totalCost = logs.reduce((sum, log) => sum + Number(log.deepseek_cost), 0);
  const totalTokensIn = logs.reduce((sum, log) => sum + log.deepseek_tokens_input, 0);
  const totalTokensOut = logs.reduce((sum, log) => sum + log.deepseek_tokens_output, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Analyse des Briefs Générés</CardTitle>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats globales */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Total briefs</p>
              <p className="text-2xl font-bold text-foreground">{logs.length}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Coût total</p>
              <p className="text-2xl font-bold text-foreground">${totalCost.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Tokens input</p>
              <p className="text-2xl font-bold text-foreground">{totalTokensIn.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Tokens output</p>
              <p className="text-2xl font-bold text-foreground">{totalTokensOut.toLocaleString()}</p>
            </div>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les prompts et réponses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tableau des logs */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Coût</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Aperçu</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.deepseek_tokens_input}/{log.deepseek_tokens_output}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      ${Number(log.deepseek_cost).toFixed(6)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(log.generation_duration_ms / 1000).toFixed(1)}s
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                      {log.deepseek_response_full.substring(0, 60)}...
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? 'Aucun résultat trouvé' : 'Aucun brief généré'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de détails */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du Brief</DialogTitle>
            <DialogDescription>
              Généré le {selectedLog && new Date(selectedLog.created_at).toLocaleString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="response" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="response">Réponse</TabsTrigger>
              <TabsTrigger value="prompt">Prompt</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
            </TabsList>

            <TabsContent value="response" className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Réponse complète DeepSeek</h4>
                <div className="bg-muted p-4 rounded-md max-h-[400px] overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{selectedLog?.deepseek_response_full}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Prompt utilisé</h4>
                <pre className="bg-muted p-4 rounded-md text-xs max-h-[400px] overflow-y-auto">
                  {selectedLog?.prompt_text_used}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tokens input</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedLog?.deepseek_tokens_input.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Tokens output</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedLog?.deepseek_tokens_output.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Coût</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${selectedLog && Number(selectedLog.deepseek_cost).toFixed(6)}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Durée génération</p>
                  <p className="text-2xl font-bold text-foreground">
                    {selectedLog && (selectedLog.generation_duration_ms / 1000).toFixed(2)}s
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Calcul du coût</p>
                <div className="space-y-1 text-xs font-mono">
                  <p>Input: {selectedLog?.deepseek_tokens_input} tokens × $0.28/1M = ${selectedLog && (selectedLog.deepseek_tokens_input * 0.28 / 1_000_000).toFixed(6)}</p>
                  <p>Output: {selectedLog?.deepseek_tokens_output} tokens × $0.42/1M = ${selectedLog && (selectedLog.deepseek_tokens_output * 0.42 / 1_000_000).toFixed(6)}</p>
                  <p className="font-bold pt-1 border-t border-border">Total: ${selectedLog && Number(selectedLog.deepseek_cost).toFixed(6)}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};
