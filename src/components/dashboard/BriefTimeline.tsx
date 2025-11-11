import { Card, CardContent } from "@/components/ui/card";
import { BriefStatusBadge } from "./BriefStatusBadge";
import { Play } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Brief {
  id: string;
  week_start: string;
  audio_url: string | null;
  script_text: string | null;
  whatsapp_deliveries?: Array<{
    status: string;
  }>;
}

interface BriefTimelineProps {
  briefs: Brief[];
  selectedBriefId: string | null;
  onSelectBrief: (briefId: string) => void;
}

export const BriefTimeline = ({ briefs, selectedBriefId, onSelectBrief }: BriefTimelineProps) => {
  const getWeekNumber = (dateString: string) => {
    const date = parseISO(dateString);
    const weekNumber = Math.ceil(
      ((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
    );
    return `S${weekNumber.toString().padStart(2, '0')}`;
  };

  if (briefs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Aucun brief généré pour le moment</p>
        <p className="text-sm mt-2">Ton premier brief sera envoyé automatiquement</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {briefs.map((brief, index) => {
          const isSelected = selectedBriefId === brief.id;
          const whatsappStatus = brief.whatsapp_deliveries?.[0]?.status || null;
          const weekNumber = getWeekNumber(brief.week_start);
          const date = parseISO(brief.week_start);

          return (
            <motion.div
              key={brief.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="snap-center"
            >
              <Card
                className={`
                  cursor-pointer transition-all min-w-[180px] hover:shadow-lg
                  ${isSelected ? 'ring-2 ring-primary shadow-lg scale-105' : 'hover:scale-102'}
                `}
                onClick={() => onSelectBrief(brief.id)}
              >
                <CardContent className="p-4 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Play className="w-6 h-6 text-primary" />
                  </div>
                  
                  <div>
                    <div className="text-lg font-semibold">{weekNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(date, 'd MMM yyyy', { locale: fr })}
                    </div>
                  </div>

                  <BriefStatusBadge status={whatsappStatus} />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
