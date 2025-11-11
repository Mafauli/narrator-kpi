import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Pencil, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Preference {
  user_id: string;
  phone_number: string | null;
  timezone: string;
  lang: string;
  currency: string;
  tone: string;
  avatar_id: string | null;
  voice_id: string | null;
  north_star: string | null;
}

export const PreferencesManager = () => {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [filteredPrefs, setFilteredPrefs] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [selectedPref, setSelectedPref] = useState<Preference | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('preferences')
        .select('*')
        .order('user_id');

      if (error) throw error;
      setPreferences(data || []);
      setFilteredPrefs(data || []);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredPrefs(preferences);
      return;
    }

    const filtered = preferences.filter(pref =>
      pref.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pref.phone_number?.includes(searchTerm) ||
      pref.north_star?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPrefs(filtered);
  }, [searchTerm, preferences]);

  const handleEdit = async (pref: Preference) => {
    setSelectedPref(pref);
    
    // Fetch user email
    try {
      const { data, error } = await supabase.auth.admin.getUserById(pref.user_id);
      if (!error && data) {
        setUserEmail(data.user.email || '');
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
    
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!selectedPref) return;

    try {
      const { error } = await supabase
        .from('preferences')
        .update({
          phone_number: selectedPref.phone_number,
          timezone: selectedPref.timezone,
          lang: selectedPref.lang,
          currency: selectedPref.currency,
          tone: selectedPref.tone as "no-bs" | "sobre" | "coach" | "energique",
          avatar_id: selectedPref.avatar_id,
          voice_id: selectedPref.voice_id,
          north_star: selectedPref.north_star,
        })
        .eq('user_id', selectedPref.user_id);

      if (error) throw error;

      toast.success('Préférences mises à jour');
      setEditDialog(false);
      fetchPreferences();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gestion des Préférences</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par user ID, téléphone, north star..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead>Langue</TableHead>
                    <TableHead>Tone</TableHead>
                    <TableHead>North Star</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrefs.map((pref) => (
                    <TableRow key={pref.user_id}>
                      <TableCell className="font-mono text-xs">
                        {pref.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{pref.phone_number || '-'}</TableCell>
                      <TableCell className="text-sm">{pref.timezone}</TableCell>
                      <TableCell className="text-sm">{pref.lang}</TableCell>
                      <TableCell className="text-sm">{pref.tone}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">
                        {pref.north_star || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(pref)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Éditer Préférences</DialogTitle>
            <DialogDescription>
              {userEmail && `Utilisateur: ${userEmail}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPref && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={selectedPref.phone_number || ''}
                    onChange={(e) => setSelectedPref({ ...selectedPref, phone_number: e.target.value })}
                    placeholder="+33..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={selectedPref.timezone}
                    onChange={(e) => setSelectedPref({ ...selectedPref, timezone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Langue</Label>
                  <Input
                    value={selectedPref.lang}
                    onChange={(e) => setSelectedPref({ ...selectedPref, lang: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Input
                    value={selectedPref.currency}
                    onChange={(e) => setSelectedPref({ ...selectedPref, currency: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Input
                    value={selectedPref.tone}
                    onChange={(e) => setSelectedPref({ ...selectedPref, tone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>North Star (Objectif)</Label>
                <Input
                  value={selectedPref.north_star || ''}
                  onChange={(e) => setSelectedPref({ ...selectedPref, north_star: e.target.value })}
                  placeholder="Ex: Augmenter le MRR de 20%"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Avatar ID</Label>
                  <Input
                    value={selectedPref.avatar_id || ''}
                    onChange={(e) => setSelectedPref({ ...selectedPref, avatar_id: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Voice ID</Label>
                  <Input
                    value={selectedPref.voice_id || ''}
                    onChange={(e) => setSelectedPref({ ...selectedPref, voice_id: e.target.value })}
                  />
                </div>
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
