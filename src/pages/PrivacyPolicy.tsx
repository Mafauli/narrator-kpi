import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-4xl py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="bg-card rounded-lg shadow-lg p-8 space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Politique de Confidentialité</h1>
            <p className="text-muted-foreground">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>
          </div>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Responsable du traitement</h2>
            <p className="text-foreground/80">
              KPI Narrator est responsable du traitement de vos données personnelles dans le cadre de l'utilisation de notre service de briefs KPI vocaux automatisés via WhatsApp.
            </p>
            <p className="text-foreground/80">
              <strong>Contact :</strong> contact@kpinarrator.com
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Données collectées</h2>
            <p className="text-foreground/80">
              Dans le cadre de la fourniture de nos services, nous collectons et traitons les données suivantes :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Données d'identification :</strong> Prénom, adresse e-mail</li>
              <li><strong>Données de contact :</strong> Numéro de téléphone WhatsApp</li>
              <li><strong>Données d'entreprise :</strong> Données Airtable ou Shopify que vous choisissez de connecter (vues, tables, KPIs)</li>
              <li><strong>Préférences utilisateur :</strong> Choix d'avatar, paramètres de voix, langue, fuseau horaire, fréquence d'envoi</li>
              <li><strong>Données d'utilisation :</strong> Historique des briefs générés, statuts de livraison WhatsApp</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Finalités du traitement</h2>
            <p className="text-foreground/80">Vos données sont traitées pour les finalités suivantes :</p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Fourniture du service :</strong> Génération et envoi de vos briefs KPI vocaux personnalisés via WhatsApp</li>
              <li><strong>Personnalisation :</strong> Adaptation du contenu selon vos préférences (avatar, ton, KPIs)</li>
              <li><strong>Communication :</strong> Envoi de notifications de service et alertes importantes</li>
              <li><strong>Amélioration du service :</strong> Analyse des logs et performances pour optimiser notre plateforme</li>
              <li><strong>Conformité légale :</strong> Respect de nos obligations légales et réglementaires</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Base légale du traitement</h2>
            <p className="text-foreground/80">
              Le traitement de vos données repose sur les bases légales suivantes :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Exécution du contrat :</strong> Le traitement est nécessaire à la fourniture du service que vous avez demandé</li>
              <li><strong>Consentement :</strong> Vous consentez explicitement à recevoir vos briefs par WhatsApp lors de votre inscription</li>
              <li><strong>Intérêt légitime :</strong> Amélioration de nos services et sécurité de la plateforme</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Partage des données</h2>
            <p className="text-foreground/80">
              Vos données peuvent être partagées avec les tiers suivants, uniquement dans le cadre de la fourniture du service :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Meta (WhatsApp Business API) :</strong> Pour l'envoi de messages vocaux</li>
              <li><strong>ElevenLabs :</strong> Pour la génération des synthèses vocales</li>
              <li><strong>Airtable / Shopify :</strong> Pour la récupération de vos données business (selon votre connexion)</li>
              <li><strong>Hébergeur cloud (Supabase) :</strong> Pour le stockage sécurisé de vos données</li>
            </ul>
            <p className="text-foreground/80">
              Nous ne vendons jamais vos données personnelles à des tiers.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Conservation des données</h2>
            <p className="text-foreground/80">
              Vos données sont conservées pendant la durée nécessaire à la fourniture du service :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Compte actif :</strong> Tant que votre compte est actif et non supprimé</li>
              <li><strong>Briefs et audios :</strong> Conservés indéfiniment tant que le compte est actif (vous pouvez les supprimer manuellement)</li>
              <li><strong>Logs techniques :</strong> 30 jours maximum</li>
              <li><strong>Après suppression du compte :</strong> Vos données sont supprimées sous 30 jours, sauf obligations légales de conservation</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Vos droits</h2>
            <p className="text-foreground/80">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données personnelles</li>
              <li><strong>Droit de rectification :</strong> Corriger vos données inexactes ou incomplètes</li>
              <li><strong>Droit à l'effacement :</strong> Supprimer vos données dans certaines conditions</li>
              <li><strong>Droit à la limitation :</strong> Limiter le traitement de vos données</li>
              <li><strong>Droit à la portabilité :</strong> Récupérer vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
              <li><strong>Droit de retrait du consentement :</strong> Retirer votre consentement à tout moment</li>
            </ul>
            <p className="text-foreground/80 mt-4">
              Pour exercer vos droits, contactez-nous à : <strong>contact@kpinarrator.com</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Sécurité des données</h2>
            <p className="text-foreground/80">
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li>Chiffrement des données en transit (HTTPS/TLS) et au repos</li>
              <li>Authentification sécurisée et contrôle d'accès strict (RLS)</li>
              <li>Sauvegardes régulières et hébergement sécurisé</li>
              <li>Monitoring et logs de sécurité</li>
              <li>Tests de sécurité réguliers</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Cookies</h2>
            <p className="text-foreground/80">
              Notre site utilise des cookies strictement nécessaires au fonctionnement du service (authentification, préférences). 
              Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Modifications de cette politique</h2>
            <p className="text-foreground/80">
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
              En cas de modification substantielle, nous vous en informerons par e-mail ou via une notification sur la plateforme. 
              La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Réclamations</h2>
            <p className="text-foreground/80">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) :
            </p>
            <p className="text-foreground/80">
              <strong>CNIL :</strong> 3 Place de Fontenoy - TSA 80715 - 75334 PARIS CEDEX 07<br />
              <strong>Site web :</strong> <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Contact</h2>
            <p className="text-foreground/80">
              Pour toute question concernant cette politique de confidentialité ou le traitement de vos données personnelles, 
              veuillez nous contacter à :
            </p>
            <p className="text-foreground/80">
              <strong>Email :</strong> contact@kpinarrator.com<br />
              <strong>Service :</strong> KPI Narrator
            </p>
          </section>

          <div className="pt-8 border-t border-border mt-8">
            <p className="text-sm text-muted-foreground text-center">
              © 2025 KPI Narrator. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
