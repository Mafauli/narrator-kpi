import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const AdminButton = () => {
  const { isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on admin pages or while loading
  if (loading || location.pathname.startsWith('/app/admin')) {
    return null;
  }

  // Only show for admins
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={() => navigate('/app/admin')}
        className="shadow-lg"
        size="lg"
      >
        <Shield className="w-4 h-4 mr-2" />
        Admin
      </Button>
    </div>
  );
};
