import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScheduledBrief {
  id: string;
  user_id: string;
  schedule_type: string;
  day_of_week: number | null;
  day_of_month: number | null;
  hour: number;
  minute: number;
  timezone: string;
  delivery_method: string;
  phone_number: string | null;
  is_active: boolean;
  next_send_at: string | null;
  last_sent_at: string | null;
}

export const ScheduledBriefsManager = () => {
  const [schedules, setSchedules] = useState<ScheduledBrief[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scheduled_briefs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const toggleActive = async (schedule: ScheduledBrief) => {
    try {
      const { error } = await supabase
        .from('scheduled_briefs')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) throw error;

      toast.success(schedule.is_active ? 'Schedule désactivé' : 'Schedule activé');
      fetchSchedules();
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const formatSchedule = (schedule: ScheduledBrief) => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const time = `${schedule.hour.toString().padStart(2, '0')}:${schedule.minute.toString().padStart(2, '0')}`;

    switch (schedule.schedule_type) {
      case 'weekly':
        return `${days[schedule.day_of_week || 0]} ${time}`;
      case 'biweekly':
        return `Tous les 2 ${days[schedule.day_of_week || 0]} ${time}`;
      case 'monthly':
        return `Le ${schedule.day_of_month} du mois ${time}`;
      default:
        return time;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestion des Envois Planifiés</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSchedules}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Planification</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Prochain envoi</TableHead>
                  <TableHead>Dernier envoi</TableHead>
                  <TableHead className="text-right">Actif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-mono text-xs">
                      {schedule.user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{schedule.schedule_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatSchedule(schedule)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {schedule.delivery_method}
                    </TableCell>
                    <TableCell className="text-sm">
                      {schedule.phone_number || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {schedule.next_send_at 
                        ? new Date(schedule.next_send_at).toLocaleString('fr-FR')
                        : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {schedule.last_sent_at 
                        ? new Date(schedule.last_sent_at).toLocaleString('fr-FR')
                        : 'Jamais'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={() => toggleActive(schedule)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {schedules.length === 0 && !loading && (
          <p className="text-center text-muted-foreground py-8">
            Aucun envoi planifié
          </p>
        )}
      </CardContent>
    </Card>
  );
};
