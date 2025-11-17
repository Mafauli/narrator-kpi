import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Check, Play, Database, Settings, Mail, Shield, Zap, Pause, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/app");
    }
  }, [user, loading, navigate]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const steps = [
    {
      icon: Database,
      title: "Connecte Airtable",
      description: "OAuth en 2 clics, read-only et sécurisé"
    },
    {
      icon: Settings,
      title: "Choisis tes vues",
      description: "Filtres et tris respectés automatiquement"
    },
    {
      icon: Mail,
      title: "Reçois l'audio + 3 actions",
      description: "Chaque lundi, un brief de 90-120s"
    }
  ];

  const useCases = [
    {
      title: "SaaS",
      description: "MRR, Churn, New Customers, CR",
      features: ["Croissance récurrente", "Alerte churn", "Conversion"]
    },
    {
      title: "E-commerce",
      description: "Revenue, AOV, ROAS, Sessions",
      features: ["Performance pub", "Panier moyen", "Trafic"]
    },
    {
      title: "Services",
      description: "Pipeline, CR, Deals, Revenue",
      features: ["Opportunités", "Conversion", "CA réalisé"]
    }
  ];

  const pricing = [
    {
      name: "Solo",
      price: "15",
      features: ["1 base Airtable", "1 audio/semaine", "FR uniquement", "3 actions concrètes"]
    },
    {
      name: "Team",
      price: "49",
      features: ["3 bases", "3 audios/semaine", "FR/EN/ES", "Dashboard partagé"],
      popular: true
    },
    {
      name: "Agence",
      price: "99",
      features: ["10 clients", "Marque blanche", "Multi-langues", "Support prioritaire"]
    }
  ];

  const faqs = [
    {
      question: "Mes données sont-elles en sécurité ?",
      answer: "Oui. Connexion read-only OAuth, tokens chiffrés au repos, aucune écriture dans Airtable."
    },
    {
      question: "Puis-je annuler à tout moment ?",
      answer: "Oui, sans engagement. Annulation en un clic depuis les paramètres."
    },
    {
      question: "Quelles langues sont supportées ?",
      answer: "Français (par défaut), Anglais et Espagnol disponibles sur les plans Team et Agence."
    },
    {
      question: "Comment sont calculées les actions ?",
      answer: "L'IA analyse vos KPI, détecte les tendances et seuils, puis propose 3 actions concrètes basées sur les données."
    }
  ];

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Play className="h-6 w-6 text-accent" />
            <span className="text-xl font-bold">KPI Narrator</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Comment ça marche
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Prix
            </a>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
            {user ? (
              <>
                <Link to="/app">
                  <Button size="sm" variant="outline">
                    Dashboard
                  </Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                  Démarrer gratuitement
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-secondary/20">
        <div className="container text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Ton brief audio KPI de 2 minutes,{" "}
            <span className="gradient-text">chaque lundi</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connecte Airtable. Choisis tes vues. Reçois un audio clair + 3 actions concrètes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/auth">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-lg px-8">
                Démarrer gratuitement
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8" onClick={() => {
              const section = document.getElementById('audio-preview');
              section?.scrollIntoView({ behavior: 'smooth' });
              setTimeout(toggleAudio, 500);
            }}>
              <Play className="mr-2 h-5 w-5" />
              Écouter un exemple
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 md:py-32">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              En 3 étapes, transforme tes données Airtable en insights actionnables
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <Card key={i} className="relative overflow-hidden group hover:shadow-medium transition-all">
                <div className="absolute top-0 right-0 w-20 h-20 bg-accent/5 rounded-bl-full" />
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <step.icon className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                  <CardDescription className="text-base">{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Audio Preview */}
      <section id="audio-preview" className="py-20 bg-primary text-primary-foreground">
        <div className="container-narrow">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Ce que tu entends</h2>
            <p className="text-primary-foreground/80 text-lg">
              Un brief clair, des chiffres précis, des actions concrètes
            </p>
            <div className="bg-card/10 backdrop-blur rounded-lg p-8 mt-8 shadow-glow">
              <audio 
                ref={audioRef} 
                src="/audio/brief-example.wav"
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              />
              <div className="flex items-center justify-center gap-4">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="h-14 w-14 rounded-full"
                  onClick={toggleAudio}
                >
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </Button>
                <div className="flex-1 h-2 bg-card/20 rounded-full max-w-md">
                  <div className="h-full bg-accent rounded-full transition-all" style={{
                    width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
                  }} />
                </div>
                <span className="text-sm font-mono">
                  {duration > 0
                    ? `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')} / ${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, '0')}`
                    : '0:00 / 0:00'
                  }
                </span>
              </div>
              <p className="text-sm text-primary-foreground/60 mt-6 text-center">
                Exemple : Brief KPI — Semaine W45
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 md:py-32">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Pour qui ?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Adapté à ton business model
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, i) => (
              <Card key={i} className="hover:shadow-medium transition-all">
                <CardHeader>
                  <CardTitle className="text-2xl">{useCase.title}</CardTitle>
                  <CardDescription className="text-base">{useCase.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {useCase.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-accent" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-32 bg-secondary/30">
        <div className="container">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Prix</h2>
            <p className="text-muted-foreground text-lg">
              Simple, transparent, sans engagement
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan, i) => (
              <Card key={i} className={`relative ${plan.popular ? 'border-accent shadow-glow' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Populaire
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    <span className="text-muted-foreground">/mois</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                   </ul>
                  <Link to="/auth" className="block">
                    <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                      Start free trial
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-32">
        <div className="container-narrow">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">FAQ</h2>
            <p className="text-muted-foreground text-lg">
              Les questions fréquentes
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Play className="h-5 w-5 text-accent" />
                <span className="font-bold">KPI Narrator</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Transforme tes données en insights actionnables
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#how" className="hover:text-foreground transition-colors">Comment ça marche</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Prix</a></li>
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">CGU</a></li>
                <li><a href="/privacy-policy" className="hover:text-foreground transition-colors">Confidentialité</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>contact@kpinarrator.com</li>
                <li className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <span>Data hébergée en EU</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2025 KPI Narrator. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
