import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Lock, Calendar, Clock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SchedulingStepProps {
  scheduleFrequency: 'weekly' | 'monthly' | 'daily';
  setScheduleFrequency: (value: 'weekly' | 'monthly' | 'daily') => void;
  scheduleDay: number;
  setScheduleDay: (value: number) => void;
  scheduleHour: number;
  setScheduleHour: (value: number) => void;
  scheduleMinute: number;
  setScheduleMinute: (value: number) => void;
  timezone: string;
  setTimezone: (value: string) => void;
  whatsappPhone: string;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' }
];

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1)' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0)' },
  { value: 'America/New_York', label: 'America/New_York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC-8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+11)' }
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${i.toString().padStart(2, '0')}:00`
}));

export const SchedulingStep = ({
  scheduleFrequency,
  setScheduleFrequency,
  scheduleDay,
  setScheduleDay,
  scheduleHour,
  setScheduleHour,
  scheduleMinute,
  setScheduleMinute,
  timezone,
  setTimezone,
  whatsappPhone
}: SchedulingStepProps) => {
  const [nextSendDate, setNextSendDate] = useState<string>("");
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  useEffect(() => {
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setIsAutoDetected(timezone === detectedTz);
  }, [timezone]);

  useEffect(() => {
    calculateNextSend();
  }, [scheduleFrequency, scheduleDay, scheduleHour, scheduleMinute, timezone]);

  const calculateNextSend = () => {
    const now = new Date();
    let next = new Date(now);
    
    next.setHours(scheduleHour, scheduleMinute, 0, 0);

    if (scheduleFrequency === 'weekly') {
      const currentDay = now.getDay();
      const daysUntilNext = (scheduleDay - currentDay + 7) % 7;
      next.setDate(now.getDate() + (daysUntilNext === 0 && now.getHours() >= scheduleHour ? 7 : daysUntilNext));
    } else if (scheduleFrequency === 'monthly') {
      next.setDate(scheduleDay);
      if (next < now) {
        next.setMonth(next.getMonth() + 1);
      }
    }

    const formatter = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    });

    setNextSendDate(formatter.format(next));
  };

  const FrequencyCard = ({ 
    type, 
    icon, 
    label, 
    isLocked 
  }: { 
    type: 'daily' | 'weekly' | 'monthly'; 
    icon: string; 
    label: string; 
    isLocked?: boolean;
  }) => {
    const isSelected = scheduleFrequency === type;

    return (
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md relative",
          isLocked && "opacity-60 cursor-not-allowed",
          isSelected && !isLocked && "ring-2 ring-accent shadow-lg"
        )}
        onClick={() => !isLocked && setScheduleFrequency(type)}
      >
        {isLocked && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Premium
            </Badge>
          </div>
        )}
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-3">{icon}</div>
          <div className="font-semibold text-sm">{label}</div>
          {isSelected && !isLocked && (
            <Badge variant="default" className="mt-2">✓ ACTIF</Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">📅 Configure ton rythme d'envoi</h2>
        <p className="text-muted-foreground">
          Choisis quand tu veux recevoir tes briefs automatiquement
        </p>
      </div>

      {/* Frequency Selection */}
      <div>
        <Label className="text-base mb-4 block">Fréquence d'envoi</Label>
        <div className="grid grid-cols-3 gap-4">
          <FrequencyCard
            type="daily"
            icon="🔒"
            label="Chaque jour"
            isLocked={true}
          />
          <FrequencyCard
            type="weekly"
            icon="📊"
            label="Chaque semaine"
          />
          <FrequencyCard
            type="monthly"
            icon="📅"
            label="Chaque mois"
          />
        </div>
      </div>

      {/* Day Selection */}
      {scheduleFrequency === 'weekly' && (
        <div className="space-y-2">
          <Label htmlFor="day-select" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Quel jour ?
          </Label>
          <Select value={scheduleDay.toString()} onValueChange={(v) => setScheduleDay(parseInt(v))}>
            <SelectTrigger id="day-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map(day => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {scheduleFrequency === 'monthly' && (
        <div className="space-y-2">
          <Label htmlFor="day-month-select" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Quel jour du mois ?
          </Label>
          <Select value={scheduleDay.toString()} onValueChange={(v) => setScheduleDay(parseInt(v))}>
            <SelectTrigger id="day-month-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                <SelectItem key={day} value={day.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Hour Selection */}
      <div className="space-y-2">
        <Label htmlFor="hour-select" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          À quelle heure ?
        </Label>
        <Select value={scheduleHour.toString()} onValueChange={(v) => setScheduleHour(parseInt(v))}>
          <SelectTrigger id="hour-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map(hour => (
              <SelectItem key={hour.value} value={hour.value.toString()}>
                {hour.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timezone Selection */}
      <div className="space-y-2">
        <Label htmlFor="timezone-select" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Fuseau horaire
          {isAutoDetected && (
            <Badge variant="secondary" className="ml-2 text-xs">Détecté automatiquement</Badge>
          )}
        </Label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(tz => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* WhatsApp Confirmation */}
      <div className="bg-secondary/30 rounded-lg p-6">
        <Label className="text-sm text-muted-foreground mb-2 block">📱 Numéro WhatsApp confirmé</Label>
        <p className="font-mono text-lg">{whatsappPhone || "Non renseigné"}</p>
      </div>

      {/* Next Send Preview */}
      <div className="bg-accent/10 border-2 border-accent rounded-lg p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">💡</span>
          <h3 className="font-semibold">Prochain envoi prévu</h3>
        </div>
        <p className="text-lg font-medium capitalize">{nextSendDate}</p>
      </div>
    </div>
  );
};
