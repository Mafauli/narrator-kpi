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
import { Pencil, Upload, Loader2, RefreshCw, Volume2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useElevenLabsVoices } from "@/hooks/useElevenLabsVoices";

interface Avatar {
  id: string;
  name: string;
  role: string;
  promise: string;
  personality: string;
  voice_tone: string;
  ideal_for: string;
  domains: string;
  action_types: string;
  voice_id: string;
  sample_text: string;
  sample_audio_url: string | null;
  image_url: string | null;
}

export const AvatarsManager = () => {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [uploading, setUploading] = useState(false);
  const { voices, syncing, syncVoices } = useElevenLabsVoices();
  const [initializing, setInitializing] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const initializeAvatars = async () => {
    try {
      setInitializing(true);
      toast.info("Initialisation des avatars et génération des samples audio...");
      
      const { data, error } = await supabase.functions.invoke("initialize-new-avatars");
      
      if (error) throw error;
      
      toast.success(data.message);
      await fetchAvatars();
    } catch (error) {
      console.error("Error initializing avatars:", error);
      toast.error("Erreur lors de l'initialisation des avatars");
    } finally {
      setInitializing(false);
    }
  };

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
          promise: selectedAvatar.promise,
          personality: selectedAvatar.personality,
          voice_tone: selectedAvatar.voice_tone,
          ideal_for: selectedAvatar.ideal_for,
          domains: selectedAvatar.domains,
          action_types: selectedAvatar.action_types,
          voice_id: selectedAvatar.voice_id,
          sample_text: selectedAvatar.sample_text,
          image_url: selectedAvatar.image_url,
        })
        .eq('id', selectedAvatar.id);

      if (error) throw error;

      toast.success('Avatar mis à jour');
      setEditDialog(false);
      fetchAvatars();
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleGenerateSample = async () => {
    if (!selectedAvatar) return;

    try {
      setGeneratingSample(true);
      toast.info("Génération du sample audio...");
      
      const { data, error } = await supabase.functions.invoke("generate-avatar-sample", {
        body: {
          voiceId: selectedAvatar.voice_id,
          text: selectedAvatar.sample_text,
          avatarId: selectedAvatar.id,
        },
      });

      if (error) throw error;

      toast.success("Sample audio généré avec succès");
      setSelectedAvatar({ ...selectedAvatar, sample_audio_url: data.audioUrl });
      await fetchAvatars();
    } catch (error) {
      console.error('Error generating sample:', error);
      toast.error('Erreur lors de la génération du sample');
    } finally {
      setGeneratingSample(false);
    }
  };

  const playAudioSample = async (url: string, avatarId: string) => {
    if (playingAudioId === avatarId) {
      setPlayingAudioId(null);
      return;
    }

    try {
      const audio = new Audio(url);
      setPlayingAudioId(avatarId);
      
      audio.onended = () => setPlayingAudioId(null);
      audio.onerror = () => {
        toast.error("Erreur lors de la lecture du sample");
        setPlayingAudioId(null);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Erreur lors de la lecture');
      setPlayingAudioId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Avatars</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={syncVoices} 
                disabled={syncing}
                variant="outline"
                size="sm"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sync...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Voix
                  </>
                )}
              </Button>
              <Button 
                onClick={initializeAvatars} 
                disabled={initializing}
                variant="default"
                size="sm"
              >
                {initializing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initialisation...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Initialiser les 8 Avatars
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {voices.length} voix disponibles • {avatars.length} avatars configurés
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
                    <TableHead>Sample</TableHead>
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
                      <TableCell className="text-xs">
                        {voices.find(v => v.voice_id === avatar.voice_id)?.name || avatar.voice_id}
                      </TableCell>
                      <TableCell>
                        {avatar.sample_audio_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudioSample(avatar.sample_audio_url!, avatar.id)}
                          >
                            <Volume2 className={`h-4 w-4 ${playingAudioId === avatar.id ? 'text-accent animate-pulse' : ''}`} />
                          </Button>
                        )}
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
            <DialogTitle>Modifier l'avatar</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'avatar
            </DialogDescription>
          </DialogHeader>

          {selectedAvatar && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={selectedAvatar.name}
                    onChange={(e) => setSelectedAvatar({ ...selectedAvatar, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ID</Label>
                  <Input
                    value={selectedAvatar.id}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rôle simplifié</Label>
                <Input
                  value={selectedAvatar.role}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, role: e.target.value })}
                  placeholder="Ex: La gardienne de ta trésorerie"
                />
              </div>

              <div className="space-y-2">
                <Label>Promesse</Label>
                <Textarea
                  value={selectedAvatar.promise}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, promise: e.target.value })}
                  placeholder="Ex: Elle t'aide à gagner plus et dépenser moins."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Personnalité</Label>
                  <Input
                    value={selectedAvatar.personality}
                    onChange={(e) => setSelectedAvatar({ ...selectedAvatar, personality: e.target.value })}
                    placeholder="Ex: Posée, pédagogue"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ton/Voix</Label>
                  <Input
                    value={selectedAvatar.voice_tone}
                    onChange={(e) => setSelectedAvatar({ ...selectedAvatar, voice_tone: e.target.value })}
                    placeholder="Ex: Calme, rassurante"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Idéal pour</Label>
                <Input
                  value={selectedAvatar.ideal_for}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, ideal_for: e.target.value })}
                  placeholder="Ex: E-commerçants, SaaS"
                />
              </div>

              <div className="space-y-2">
                <Label>Domaines</Label>
                <Input
                  value={selectedAvatar.domains}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, domains: e.target.value })}
                  placeholder="Ex: Trésorerie, rentabilité, économies"
                />
              </div>

              <div className="space-y-2">
                <Label>Types d'actions</Label>
                <Input
                  value={selectedAvatar.action_types}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, action_types: e.target.value })}
                  placeholder="Ex: Alerter les fuites, recommander un prix"
                />
              </div>

              <div className="space-y-2">
                <Label>Texte du sample (10 secondes)</Label>
                <Textarea
                  value={selectedAvatar.sample_text}
                  onChange={(e) => setSelectedAvatar({ ...selectedAvatar, sample_text: e.target.value })}
                  placeholder="Texte qui sera lu pour le sample audio"
                  rows={3}
                />
                <Button 
                  onClick={handleGenerateSample}
                  disabled={generatingSample}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {generatingSample ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Générer le sample audio
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Voix ElevenLabs</Label>
                <Select
                  value={selectedAvatar.voice_id}
                  onValueChange={(value) => setSelectedAvatar({ ...selectedAvatar, voice_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} ({voice.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Image</Label>
                <div className="flex items-center gap-4">
                  {selectedAvatar.image_url && (
                    <img 
                      src={selectedAvatar.image_url} 
                      alt={selectedAvatar.name}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                    disabled={uploading}
                  />
                  {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
