import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Play, Settings, Database, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  // Mock data - will be replaced with real data from Lovable Cloud
  const nextBrief = {
    date: "Lundi 13 janvier 2025",
    time: "08:00 CET"
  };

  const recentBriefs = [
    {
      id: 1,
      week: "W01 2025",
      date: "6 janvier 2025",
      duration: "2:15",
      actions: [
        { title: "Optimiser la landing page", why: "CR en baisse de 0.06%", how: "Tester nouveau hero + CTA plus visible" },
        { title: "Relance churn", why: "24 clients à risque", how: "Campagne email personnalisée + offre upgrade" },
        { title: "Scaling pub", why: "ROAS à 2.1", how: "Augmenter budget Facebook de 20%" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Play className="h-6 w-6 text-accent" />
            <span className="text-xl font-bold">KPI Narrator</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/app/settings">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Button>
            </Link>
            <Button variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </nav>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Gérez vos briefs KPI audio hebdomadaires</p>
        </div>

        {/* Next Brief Card */}
        <Card className="border-accent/20 bg-accent/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-accent">
              <Calendar className="h-5 w-5" />
              <CardTitle>Prochain envoi</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{nextBrief.date}</span>
              <span className="text-muted-foreground">à {nextBrief.time}</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Database className="h-4 w-4 mr-2" />
                Gérer les vues
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Modifier préférences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Briefs */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Derniers briefs</h2>
          
          {recentBriefs.map((brief) => (
            <Card key={brief.id} className="hover:shadow-medium transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{brief.week}</CardTitle>
                    <CardDescription>{brief.date}</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Renvoi e-mail
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Audio Player */}
                <div className="bg-secondary/30 rounded-lg p-6">
                  <div className="flex items-center gap-4">
                    <Button size="icon" variant="default" className="h-12 w-12 rounded-full bg-accent hover:bg-accent/90">
                      <Play className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full">
                        <div className="h-full w-0 bg-accent rounded-full transition-all" />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0:00</span>
                        <span>{brief.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                  <h3 className="font-semibold">3 Actions concrètes</h3>
                  <div className="grid gap-3">
                    {brief.actions.map((action, i) => (
                      <Card key={i} className="bg-card">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-sm font-bold">
                              {i + 1}
                            </span>
                            {action.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Pourquoi :</span>{" "}
                            <span>{action.why}</span>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Comment :</span>{" "}
                            <span>{action.how}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State if no briefs */}
        {recentBriefs.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Aucun brief pour le moment</h3>
                <p className="text-muted-foreground">
                  Complétez l'onboarding pour recevoir votre premier brief
                </p>
              </div>
              <Link to="/app/onboarding">
                <Button className="bg-accent hover:bg-accent/90">
                  Commencer l'onboarding
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
