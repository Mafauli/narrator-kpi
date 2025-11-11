import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Download, Send } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useSendWhatsAppBrief } from "@/hooks/useSendWhatsAppBrief";
import { toast } from "sonner";

interface Brief {
  id: string;
  week_start: string;
  audio_url: string | null;
  script_text: string | null;
}

interface BriefPlayerProps {
  brief: Brief;
  phoneNumber: string | null;
}

export const BriefPlayer = ({ brief, phoneNumber }: BriefPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { sendBrief, sending } = useSendWhatsAppBrief();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [brief.id]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (!brief.audio_url) return;
    window.open(brief.audio_url, '_blank');
  };

  const handleResend = async () => {
    if (!phoneNumber) {
      toast.error("Numéro WhatsApp non configuré");
      return;
    }

    const confirmed = confirm('Renvoyer ce brief sur WhatsApp ?');
    if (!confirmed) return;

    const result = await sendBrief({
      brief_id: brief.id,
      phone_number: phoneNumber
    });

    if (result?.success) {
      toast.success('Brief renvoyé avec succès !');
    }
  };

  const date = parseISO(brief.week_start);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎧 Brief du {format(date, 'd MMMM yyyy', { locale: fr })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Audio Player */}
          <div className="space-y-4">
            <audio ref={audioRef} src={brief.audio_url || undefined} />
            
            <div className="flex items-center gap-4">
              <Button
                size="lg"
                onClick={togglePlayPause}
                disabled={!brief.audio_url}
                className="rounded-full w-12 h-12"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>

              <div className="flex-1 space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSliderChange}
                  disabled={!brief.audio_url}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!brief.audio_url}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={!phoneNumber || sending}
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Renvoyer sur WhatsApp
              </Button>
            </div>
          </div>

          {/* Brief Script Text */}
          {brief.script_text && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                📄 Texte du brief
              </h3>
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                {brief.script_text}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
