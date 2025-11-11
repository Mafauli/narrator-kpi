import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AvatarsManager } from "@/components/admin/AvatarsManager";
import { PreferencesManager } from "@/components/admin/PreferencesManager";
import { BriefsManager } from "@/components/admin/BriefsManager";
import { ScheduledBriefsManager } from "@/components/admin/ScheduledBriefsManager";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminDatabase = () => {
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
          <h2 className="text-3xl font-bold text-foreground mb-2">Gestion Base de Données</h2>
          <p className="text-muted-foreground">
            Interface CRUD pour gérer les avatars, préférences, briefs et envois planifiés
          </p>
        </div>

        <Tabs defaultValue="avatars" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-[800px]">
            <TabsTrigger value="avatars">Avatars</TabsTrigger>
            <TabsTrigger value="preferences">Préférences</TabsTrigger>
            <TabsTrigger value="briefs">Briefs</TabsTrigger>
            <TabsTrigger value="scheduled">Envois Planifiés</TabsTrigger>
          </TabsList>

          <TabsContent value="avatars" className="space-y-4">
            <AvatarsManager />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <PreferencesManager />
          </TabsContent>

          <TabsContent value="briefs" className="space-y-4">
            <BriefsManager />
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-4">
            <ScheduledBriefsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminDatabase;
