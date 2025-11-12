import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, RefreshCw, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DatabaseLog {
  id: string;
  function_name: string;
  user_id: string | null;
  event_type: string;
  log_level: string;
  message: string;
  details: any;
  duration_ms: number | null;
  created_at: string;
}

interface DatabaseLogsProps {
  functionName: string;
  title: string;
}

export const DatabaseLogs = ({ functionName, title }: DatabaseLogsProps) => {
  const [logs, setLogs] = useState<DatabaseLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DatabaseLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<DatabaseLog | null>(null);
  const [viewDialog, setViewDialog] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('edge_function_logs')
        .select('*')
        .eq('function_name', functionName)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching database logs:', error);
      toast.error('Erreur lors du chargement des logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [functionName]);

  useEffect(() => {
    let filtered = logs;

    // Filter by level
    if (levelFilter !== "all") {
      filtered = filtered.filter(log => log.log_level === levelFilter);
    }

    // Filter by event type
    if (eventTypeFilter !== "all") {
      filtered = filtered.filter(log => log.event_type === eventTypeFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, eventTypeFilter, searchTerm]);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'destructive' as const;
      case 'warn':
      case 'warning':
        return 'outline' as const;
      case 'info':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  const uniqueEventTypes = Array.from(new Set(logs.map(log => log.event_type)));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchLogs}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans les logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type d'événement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {uniqueEventTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Liste des logs */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">
                {searchTerm || levelFilter !== "all" || eventTypeFilter !== "all"
                  ? 'Aucun log trouvé avec ces filtres' 
                  : 'Aucun log disponible'}
              </p>
            )}

            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  setSelectedLog(log);
                  setViewDialog(true);
                }}
              >
                <div className="flex-shrink-0 pt-1">
                  <Badge variant={getLevelColor(log.log_level)}>
                    {log.log_level}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      {log.event_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </span>
                    {log.duration_ms && (
                      <span className="text-xs text-muted-foreground">
                        ({log.duration_ms}ms)
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground truncate">
                    {log.message}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails du Log</DialogTitle>
            <DialogDescription>
              {selectedLog && new Date(selectedLog.created_at).toLocaleString('fr-FR')}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Niveau</p>
                  <Badge variant={getLevelColor(selectedLog.log_level)}>
                    {selectedLog.log_level}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <Badge variant="secondary">{selectedLog.event_type}</Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                  <p className="text-sm font-mono">
                    {new Date(selectedLog.created_at).toISOString()}
                  </p>
                </div>
                {selectedLog.duration_ms && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Durée</p>
                    <p className="text-sm">{selectedLog.duration_ms}ms</p>
                  </div>
                )}
                {selectedLog.user_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">User ID</p>
                    <p className="text-sm font-mono text-xs">{selectedLog.user_id}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Message</p>
                <div className="bg-muted p-4 rounded-md">
                  <pre className="text-sm whitespace-pre-wrap break-words">
                    {selectedLog.message}
                  </pre>
                </div>
              </div>

              {selectedLog.details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Détails</p>
                  <div className="bg-muted p-4 rounded-md max-h-[400px] overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap break-words">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
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
