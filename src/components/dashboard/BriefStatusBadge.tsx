import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MessageCircle, Send, XCircle, Clock } from "lucide-react";

interface BriefStatusBadgeProps {
  status: string | null;
  className?: string;
}

export const BriefStatusBadge = ({ status, className }: BriefStatusBadgeProps) => {
  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case 'read':
        return { 
          label: 'Lu', 
          icon: CheckCircle2, 
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-600 border-green-500/20'
        };
      case 'delivered':
        return { 
          label: 'Reçu', 
          icon: MessageCircle, 
          variant: 'default' as const,
          className: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
        };
      case 'sent':
        return { 
          label: 'Envoyé', 
          icon: Send, 
          variant: 'secondary' as const,
          className: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
        };
      case 'failed':
        return { 
          label: 'Échec', 
          icon: XCircle, 
          variant: 'destructive' as const,
          className: 'bg-red-500/10 text-red-600 border-red-500/20'
        };
      default:
        return { 
          label: 'Non envoyé', 
          icon: Clock, 
          variant: 'outline' as const,
          className: 'bg-muted/50 text-muted-foreground border-muted'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </Badge>
  );
};
