import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus, Upload, Loader2, RefreshCw, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useElevenLabsVoices } from "@/hooks/useElevenLabsVoices";

interface Avatar {
  id: string;
  name: string;
  role: string;
  pitch: string;
  long_pitch: string;
  default_tone: string;
  image_url: string | null;
  voice_reco: string;
  skills: string[];
  best_for: string[];
  example_actions: string[];
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  preview_url: string | null;
  gender: string | null;
  description: string | null;
}

export const AvatarsManager = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [uploading, setUploading] = useState(false);
  const { voices, syncing, syncVoices } = useElevenLabsVoices();

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .order('name');

      if (error) throw error;
      setAvatars(data || []);
    } catch (error) {
      console.error('Error fetching avatars:', error);
      toast.error('Erreur lors du chargement des avatars');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvatars();
  }, []);

  const handleEdit = (avatar: Avatar) => {
    setSelectedAvatar(avatar);
    setEditDialog(true);
  };

  const handleImageUpload = async (file: File) => {
    if (!selectedAvatar) return;

    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedAvatar.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('briefs-audio')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('briefs-audio')
        .getPublicUrl(filePath);

      setSelectedAvatar({ ...selectedAvatar, image_url: publicUrl });
      toast.success('Image uploadée');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedAvatar) return;

    try {
      const { error } = await supabase
        .from('avatars')
        .update({
          name: selectedAvatar.name,
          role: selectedAvatar.role,
          pitch: selectedAvatar.pitch,
          long_pitch: selectedAvatar.long_pitch,
          default_tone: selectedAvatar.default_tone,
          image_url: selectedAvatar.image_url,
          voice_reco: selectedAvatar.voice_reco,
          skills: selectedAvatar.skills,
          best_for: selectedAvatar.best_for,
          example_actions: selectedAvatar.example_actions,
        })
        .eq('id', selectedAvatar.id);

      if (error) throw error;

      toast.success('Avatar mis à jour');
      setEditDialog(false);
      fetchAvatars();
    } catch (error) {
      console.error('Error saving avatar:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Avatars</CardTitle>
            <Button 
              onClick={syncVoices} 
              disabled={syncing}
              variant="outline"
              size="sm"
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Synchroniser les voix ElevenLabs
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {voices.length} voix françaises disponibles
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Voix</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avatars.map((avatar) => (
                    <TableRow key={avatar.id}>
                      <TableCell>
                        {avatar.image_url ? (
                          <img 
                            src={avatar.image_url} 
                            alt={avatar.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-xs">
                            {avatar.name[0]}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{avatar.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {avatar.role}
                      </TableCell>
                      <TableCell className="text-sm">
                        {avatar.voice_reco}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {avatar.skills.slice(0, 2).join(', ')}
                        {avatar.skills.length > 2 && '...'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(avatar)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Éditer Avatar</DialogTitle>
            <DialogDescription>
              Modifier les informations de l'avatar
            </DialogDescription>
          </DialogHeader>

          {selectedAvatar && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={selectedAvatar.name}
                    onChange={(e) => setSelectedAvatar({ ...selectedAvatar, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Input
                    value={selectedAvatar.role}
                    onChange={(e) => setSelectedAvatar({ ...selectedAvatar, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex items-center gap-4">
                  {selectedAvatar.image_url && (
                    <img 
                      src={selectedAvatar.image_url} 
                      alt={selectedAvatar.name}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      disabled={uploading}
                    />
                    {uploading && <p className="text-xs text-muted-foreground mt-1">Upload en cours...</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pitch (court)</Label>
                <Textarea
                  value={selectedAvatar.pitch}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, pitch: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Long Pitch</Label>
                <Textarea
                  value={selectedAvatar.long_pitch}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, long_pitch: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tone par défaut</Label>
                  <Select
                    value={selectedAvatar.default_tone}
                    onValueChange={(value) => setSelectedAvatar({ ...selectedAvatar, default_tone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-bs">No-BS</SelectItem>
                      <SelectItem value="professionalismple">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="energetic">Énergique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voix ElevenLabs</Label>
                  <Select
                    value={selectedAvatar.voice_reco}
                    onValueChange={(value) => setSelectedAvatar({ ...selectedAvatar, voice_reco: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {voices.map((voice) => (
                        <SelectItem key={voice.voice_id} value={voice.voice_id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{voice.name}</span>
                            {voice.gender && (
                              <span className="text-xs text-muted-foreground">
                                ({voice.gender})
                              </span>
                            )}
                            {voice.preview_url && (
                              <Volume2 
                                className="h-3 w-3 text-primary cursor-pointer" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const audio = new Audio(voice.preview_url!);
                                  audio.play();
                                }}
                              />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAvatar.voice_reco && voices.find(v => v.voice_id === selectedAvatar.voice_reco)?.description && (
                    <p className="text-xs text-muted-foreground">
                      {voices.find(v => v.voice_id === selectedAvatar.voice_reco)?.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Skills (séparées par des virgules)</Label>
                <Input
                  value={selectedAvatar.skills.join(', ')}
                  onChange={(e) => setSelectedAvatar({ 
                    ...selectedAvatar, 
                    skills: e.target.value.split(',').map(s => s.trim()) 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Best For (séparées par des virgules)</Label>
                <Input
                  value={selectedAvatar.best_for.join(', ')}
                  onChange={(e) => setSelectedAvatar({ 
                    ...selectedAvatar, 
                    best_for: e.target.value.split(',').map(s => s.trim()) 
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Example Actions (séparées par des virgules)</Label>
                <Textarea
                  value={selectedAvatar.example_actions.join(', ')}
                  onChange={(e) => setSelectedAvatar({ 
                    ...selectedAvatar, 
                    example_actions: e.target.value.split(',').map(s => s.trim()) 
                  })}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
