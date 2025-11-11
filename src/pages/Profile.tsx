import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { PhoneInput } from "@/components/PhoneInput";

export default function Profile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Email & Password state
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences state
  const [firstName, setFirstName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, authLoading, navigate]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setCurrentEmail(user.email || "");

      // Load preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('preferences')
        .select('first_name, whatsapp_phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      if (prefsData) {
        setFirstName(prefsData.first_name || "");
        setWhatsappPhone(prefsData.whatsapp_phone || "");
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || newEmail === currentEmail) {
      toast.error("Veuillez entrer une nouvelle adresse email");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      
      if (error) throw error;

      toast.success("Email mis à jour ! Vérifiez votre boîte mail pour confirmer.");
      setNewEmail("");
    } catch (error: any) {
      console.error('Email update error:', error);
      toast.error(error.message || "Erreur lors de la mise à jour de l'email");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      toast.success("Mot de passe mis à jour avec succès");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || "Erreur lors de la mise à jour du mot de passe");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('preferences')
        .update({
          first_name: firstName,
          whatsapp_phone: whatsappPhone,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Préférences mises à jour avec succès");
    } catch (error: any) {
      console.error('Preferences update error:', error);
      toast.error(error.message || "Erreur lors de la mise à jour des préférences");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Mon Profil</h1>
            <p className="text-muted-foreground">Gérez vos informations personnelles et votre sécurité</p>
          </div>
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
            <CardDescription>
              Modifiez vos informations de profil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePreferences} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsappPhone">Numéro WhatsApp</Label>
                <PhoneInput
                  value={whatsappPhone}
                  onChange={setWhatsappPhone}
                  placeholder="Votre numéro WhatsApp"
                />
                <p className="text-sm text-muted-foreground">
                  Format international requis (ex: +33612345678)
                </p>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Email Update */}
        <Card>
          <CardHeader>
            <CardTitle>Adresse email</CardTitle>
            <CardDescription>
              Email actuel : {currentEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Nouvelle adresse email</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nouvelle@email.com"
                />
                <p className="text-sm text-muted-foreground">
                  Un email de confirmation sera envoyé à votre nouvelle adresse
                </p>
              </div>

              <Button type="submit" disabled={saving || !newEmail}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  "Mettre à jour l'email"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator />

        {/* Password Update */}
        <Card>
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
            <CardDescription>
              Changez votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Retapez votre nouveau mot de passe"
                  minLength={6}
                />
              </div>

              <Button 
                type="submit" 
                disabled={saving || !newPassword || !confirmPassword}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  "Changer le mot de passe"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
