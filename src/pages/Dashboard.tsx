import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Pause, Play } from "lucide-react";
import { BriefTimeline } from "@/components/dashboard/BriefTimeline";
import { BriefPlayer } from "@/components/dashboard/BriefPlayer";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [briefs, setBriefs] = useState<any[]>([]);
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  const [activeSchedule, setActiveSchedule] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch briefs with WhatsApp delivery status
        const { data: briefsData, error: briefsError } = await supabase
          .from('briefs')
          .select(`
            *,
            whatsapp_deliveries(status)
          `)
          .eq('user_id', user.id)
          .order('week_start', { ascending: false })
          .limit(20);

        if (briefsError) throw briefsError;
        setBriefs(briefsData || []);

        // Fetch active schedule
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('scheduled_briefs')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (scheduleError) throw scheduleError;
        setActiveSchedule(scheduleData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const selectedBrief = briefs.find(b => b.id === selectedBriefId);

  const handleToggleSchedule = async () => {
    if (!activeSchedule) return;

    try {
      const { error } = await supabase
        .from('scheduled_briefs')
        .update({ is_active: !activeSchedule.is_active })
        .eq('id', activeSchedule.id);

      if (error) throw error;

      setActiveSchedule({ ...activeSchedule, is_active: !activeSchedule.is_active });
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const getFrequencyLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Quotidien';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return type;
    }
  };

  const getDayLabel = (type: string, dayOfWeek: number | null, dayOfMonth: number | null) => {
    if (type === 'weekly' && dayOfWeek !== null) {
      const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      return days[dayOfWeek];
    }
    if (type === 'monthly' && dayOfMonth !== null) {
      return `le ${dayOfMonth}`;
    }
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Tes briefs KPI automatisés</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/app/test-brief-generation')}>
              Test Brief
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/settings')}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Schedule Status Card */}
        {activeSchedule && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  📅 Envois automatiques
                  {activeSchedule.is_active ? (
                    <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                      ● Actif
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      ⏸ En pause
                    </Badge>
                  )}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleSchedule}
                >
                  {activeSchedule.is_active ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Mettre en pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Réactiver
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {getFrequencyLabel(activeSchedule.schedule_type)} • {' '}
                {getDayLabel(activeSchedule.schedule_type, activeSchedule.day_of_week, activeSchedule.day_of_month)} à {' '}
                {activeSchedule.hour.toString().padStart(2, '0')}:{activeSchedule.minute.toString().padStart(2, '0')} ({activeSchedule.timezone})
              </div>
              {activeSchedule.next_send_at && (
                <div className="text-sm font-medium">
                  💡 Prochain envoi: {format(new Date(activeSchedule.next_send_at), "EEEE d MMMM yyyy, HH:mm", { locale: fr })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Brief Timeline */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">📊 Historique de tes briefs</h2>
          <BriefTimeline
            briefs={briefs}
            selectedBriefId={selectedBriefId}
            onSelectBrief={setSelectedBriefId}
          />
        </div>

        {/* Brief Player */}
        <AnimatePresence mode="wait">
          {selectedBrief && (
            <BriefPlayer
              key={selectedBrief.id}
              brief={selectedBrief}
              phoneNumber={activeSchedule?.phone_number || null}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
