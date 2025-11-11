import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface CostData {
  today: {
    deepseek: number;
    elevenlabs: number;
    whatsapp: number;
    total: number;
  };
  month: {
    deepseek: number;
    elevenlabs: number;
    whatsapp: number;
    total: number;
  };
  stats: {
    briefs_today: number;
    briefs_month: number;
    messages_sent: number;
    messages_delivered: number;
  };
}

export const CostDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        setLoading(true);
        const { data, error: functionError } = await supabase.functions.invoke<CostData>(
          'admin-get-costs'
        );

        if (functionError) throw functionError;
        setCostData(data);
      } catch (err) {
        console.error('Error fetching costs:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des coûts');
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!costData) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard des Coûts</h2>
        <p className="text-muted-foreground">Vue en temps réel de vos dépenses API</p>
      </div>

      {/* Coûts du jour */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              DeepSeek (Aujourd'hui)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${costData.today.deepseek.toFixed(4)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ElevenLabs (Aujourd'hui)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${costData.today.elevenlabs.toFixed(4)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WhatsApp (Aujourd'hui)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {costData.today.whatsapp === 0 ? 'Gratuit*' : `$${costData.today.whatsapp.toFixed(4)}`}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Total (Aujourd'hui)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${costData.today.total.toFixed(4)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coûts du mois */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              DeepSeek (Ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${costData.month.deepseek.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ElevenLabs (Ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${costData.month.elevenlabs.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              WhatsApp (Ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {costData.month.whatsapp === 0 ? 'Gratuit*' : `$${costData.month.whatsapp.toFixed(2)}`}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Total (Ce mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${costData.month.total.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiques Générales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">Briefs aujourd'hui</p>
              <p className="text-2xl font-bold text-foreground">{costData.stats.briefs_today}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Briefs ce mois</p>
              <p className="text-2xl font-bold text-foreground">{costData.stats.briefs_month}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Messages envoyés</p>
              <p className="text-2xl font-bold text-foreground">{costData.stats.messages_sent}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taux de livraison</p>
              <p className="text-2xl font-bold text-foreground">
                {costData.stats.messages_sent > 0
                  ? Math.round((costData.stats.messages_delivered / costData.stats.messages_sent) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        * WhatsApp est gratuit pour les messages de service dans les 24h après le dernier message utilisateur
      </p>
    </div>
  );
};
