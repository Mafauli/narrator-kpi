import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pause, Play, Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VoicePreviewCardProps {
  voice: {
    voice_id: string;
    name: string;
    preview_url: string | null;
    gender: string | null;
    category?: string | null;
  };
  isSelected?: boolean;
  onSelect: () => void;
  compact?: boolean;
}

export const VoicePreviewCard = ({ voice, isSelected, onSelect, compact = false }: VoicePreviewCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlayback = async () => {
    if (!voice.preview_url) {
      console.warn("No preview URL available for this voice");
      return;
    }

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(voice.preview_url);
        audioRef.current.onended = () => setIsPlaying(false);
        audioRef.current.onerror = (e) => {
          console.error("Audio playback error:", e);
          setIsPlaying(false);
        };
      }

      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
        isSelected ? 'border-accent ring-2 ring-accent bg-accent/5' : 'hover:border-accent/50'
      }`}>
        <div className="flex items-center gap-3 flex-1">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium text-sm">{voice.name}</p>
            {voice.gender && (
              <p className="text-xs text-muted-foreground capitalize">{voice.gender}</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            disabled={!voice.preview_url}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          
          <Button
            size="sm"
            onClick={onSelect}
            variant={isSelected ? "default" : "outline"}
            className="h-8"
          >
            {isSelected ? "✓" : "Choisir"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={`p-4 cursor-pointer transition-all hover:shadow-md ${
      isSelected ? 'ring-2 ring-accent border-accent' : ''
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm mb-1">{voice.name}</h4>
          <div className="flex gap-2">
            {voice.gender && (
              <Badge variant="secondary" className="text-xs capitalize">
                {voice.gender}
              </Badge>
            )}
            {voice.category && (
              <Badge variant="outline" className="text-xs">
                {voice.category}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlayback}
          disabled={!voice.preview_url}
          className="flex-1"
        >
          {isPlaying ? (
            <>
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-3 w-3 mr-1" />
              Écouter
            </>
          )}
        </Button>
        
        <Button
          size="sm"
          onClick={onSelect}
          className="flex-1"
          variant={isSelected ? "default" : "outline"}
        >
          {isSelected ? "Sélectionnée" : "Choisir"}
        </Button>
      </div>
    </Card>
  );
};
