import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { EdgeFunctionLogs } from "@/components/admin/EdgeFunctionLogs";
import { DatabaseLogs } from "@/components/admin/DatabaseLogs";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminLogs = () => {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/app");
    }
  }, [isAdmin, authLoading, navigate]);

  if (authLoading) {
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
          <h2 className="text-3xl font-bold text-foreground mb-2">Monitoring des Logs</h2>
          <p className="text-muted-foreground">
            Surveillez en temps réel les logs de vos edge functions avec auto-refresh et filtres avancés
          </p>
        </div>

        <Tabs defaultValue="generate-complete" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate-complete">Brief Complet</TabsTrigger>
            <TabsTrigger value="generate-text">Brief Texte</TabsTrigger>
            <TabsTrigger value="whatsapp-send">WhatsApp Send</TabsTrigger>
            <TabsTrigger value="whatsapp-webhook">WhatsApp Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="generate-complete" className="space-y-4">
            <DatabaseLogs 
              functionName="generate-complete-brief-stream"
              title="Logs - Génération Brief Complet (Base de données)"
            />
          </TabsContent>

          <TabsContent value="generate-text" className="space-y-4">
            <EdgeFunctionLogs 
              functionName="generate-brief-text"
              title="Logs - Génération Texte DeepSeek"
            />
          </TabsContent>

          <TabsContent value="whatsapp-send" className="space-y-4">
            <EdgeFunctionLogs 
              functionName="send-whatsapp-brief"
              title="Logs - Envoi WhatsApp"
            />
          </TabsContent>

          <TabsContent value="whatsapp-webhook" className="space-y-4">
            <EdgeFunctionLogs 
              functionName="whatsapp-webhook"
              title="Logs - WhatsApp Webhook (Statuts)"
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;
