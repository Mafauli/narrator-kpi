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
              Vos données sont partagées uniquement avec les prestataires techniques nécessaires au fonctionnement du service :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>WhatsApp Business API (Meta) :</strong> Pour l'envoi des messages WhatsApp</li>
              <li><strong>ElevenLabs :</strong> Pour la synthèse vocale de vos briefs</li>
              <li><strong>Airtable / Shopify :</strong> Pour récupérer vos données KPIs (avec votre autorisation OAuth)</li>
              <li><strong>Hébergement (UE) :</strong> Infrastructure Supabase hébergée en Europe pour le stockage sécurisé</li>
            </ul>
            <p className="text-foreground/80">
              <strong>Important :</strong> Nous ne vendons jamais vos données à des tiers et ne les utilisons pas à des fins publicitaires.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Durée de conservation</h2>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Données de compte :</strong> Conservées tant que votre compte est actif</li>
              <li><strong>Historique des briefs :</strong> 12 mois maximum</li>
              <li><strong>Logs techniques :</strong> 30 jours</li>
              <li><strong>Après suppression de compte :</strong> Suppression complète sous 30 jours (sauf obligations légales de conservation)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Vos droits</h2>
            <p className="text-foreground/80">
              Conformément au RGPD, vous disposez des droits suivants concernant vos données personnelles :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> Corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> Supprimer vos données ("droit à l'oubli")</li>
              <li><strong>Droit à la limitation :</strong> Limiter le traitement de vos données</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
              <li><strong>Droit de retrait du consentement :</strong> Retirer votre consentement à tout moment</li>
            </ul>
            <p className="text-foreground/80 mt-4">
              Pour exercer ces droits, contactez-nous à : <strong>contact@kpinarrator.com</strong>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Sécurité des données</h2>
            <p className="text-foreground/80">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données :
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/80 ml-4">
              <li>Chiffrement des données en transit (HTTPS/TLS)</li>
              <li>Chiffrement des données sensibles au repos (tokens OAuth, accès API)</li>
              <li>Contrôle d'accès strict avec authentification utilisateur</li>
              <li>Infrastructure hébergée dans l'Union Européenne</li>
              <li>Surveillance et journalisation des accès</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">9. Cookies et technologies similaires</h2>
            <p className="text-foreground/80">
              KPI Narrator utilise uniquement des cookies strictement nécessaires au fonctionnement du service (authentification, préférences de session). Aucun cookie de tracking publicitaire n'est utilisé.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">10. Modifications de la politique</h2>
            <p className="text-foreground/80">
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Les modifications seront notifiées par e-mail ou via l'application. La date de dernière mise à jour est indiquée en haut de cette page.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">11. Réclamation</h2>
            <p className="text-foreground/80">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
            </p>
            <p className="text-foreground/80">
              <strong>CNIL :</strong> 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07<br />
              <strong>Site web :</strong> <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">www.cnil.fr</a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">12. Contact</h2>
            <p className="text-foreground/80">
              Pour toute question concernant cette politique de confidentialité ou le traitement de vos données personnelles, vous pouvez nous contacter à :
            </p>
            <p className="text-foreground/80">
              <strong>E-mail :</strong> contact@kpinarrator.com<br />
              <strong>Adresse :</strong> KPI Narrator, France
            </p>
          </section>

          <div className="pt-8 border-t">
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
