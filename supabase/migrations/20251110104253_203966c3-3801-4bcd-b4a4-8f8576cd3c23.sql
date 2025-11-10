-- Create avatars table
CREATE TABLE public.avatars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  pitch TEXT NOT NULL,
  long_pitch TEXT NOT NULL,
  default_tone TEXT NOT NULL,
  best_for TEXT[] NOT NULL,
  skills TEXT[] NOT NULL,
  example_actions TEXT[] NOT NULL,
  image_prompt TEXT NOT NULL,
  voice_reco TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on avatars (public read)
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read avatars
CREATE POLICY "Anyone can view avatars" 
ON public.avatars 
FOR SELECT 
USING (true);

-- Add avatar fields to preferences table
ALTER TABLE public.preferences 
ADD COLUMN avatar_id TEXT REFERENCES public.avatars(id),
ADD COLUMN voice_id TEXT,
ADD COLUMN avatar_sectors TEXT[];

-- Insert avatars data
INSERT INTO public.avatars (id, name, role, pitch, long_pitch, default_tone, best_for, skills, example_actions, image_prompt, voice_reco) VALUES
('ceo_alpha', 'Léo', 'DG virtuel', 'Priorise ce qui crée vraiment de la traction et coupe le bruit.', 'Je t''aide à choisir 3 mouvements à impact immédiat, à dire non au reste, et à tenir un cap sur 8 semaines.', 'no-bs', ARRAY['saas','services','agences','ecom'], ARRAY['priorisation', 'focus North Star', 'roadmap 6-8 semaines', 'cadence hebdo', 'revue objectifs'], ARRAY['Stop-list : geler 2 tâches parasites cette semaine', 'Roadmap : 3 livrables critiques à shipper d''ici vendredi', 'Checkpoints : mettre en place un rituel lundi 8h'], 'Flat illustration, minimal clean, 3/4 portrait of a confident startup CEO, neutral skin tone, short dark hair, navy blazer over simple tee, soft green accent (#22C55E) background, modern vector style, no text', 'Thomas'),

('cfo_delta', 'Emma', 'DF virtuelle', 'Cash, marge, runway : je sécurise la base.', 'J''éclaire les flux de trésorerie, la marge nette et les fuites. Chaque brief = 3 décisions financières concrètes.', 'sobre', ARRAY['saas','services','ecom'], ARRAY['cash runway', 'marge', 'coûts fixes/variables', 'recouvrement', 'pricing light'], ARRAY['Relance smart des impayés (3 comptes + scripts)', 'Plan d''économies ciblé (-8% OPEX non critiques)', 'Test de prix : +5% sur l''offre Pro, suivi 7j'], 'Flat illustration of a thoughtful CFO, light warm skin, medium-length brown hair, glasses, white shirt + slate cardigan (#1E293B), calm green accent background (#22C55E), vector, clean', 'Claire'),

('cmo_nova', 'Inès', 'CMO virtuelle', 'Plus d''acquisition utile, moins de gaspillage.', 'Je transforme trafic en conversions : mix média, offres, retargeting, et messages qui tombent juste.', 'energique', ARRAY['saas','ecom','agences'], ARRAY['mix média', 'retargeting', 'offer testing', 'landing CR', 'email flows'], ARRAY['Retargeting +15% budget, cap & mesure à J+7', 'A/B headline landing, objectif +0,2 pt CR', 'Relance paniers abandonnés (3 variantes)'], 'Flat illustration of a dynamic marketing lead, medium brown skin, curly hair, bold yet minimalist outfit, bright accent accessories, green highlight (#22C55E), vector, friendly', 'Inès'),

('coo_orion', 'Sofia', 'COO virtuelle', 'Qualité, délais, charge : j''huile la machine.', 'Je fluidifie l''exécution : goulots, SLA, alertes, et process simples qui tiennent dans le temps.', 'sobre', ARRAY['services','ecom','saas'], ARRAY['SLA', 'goulots', 'capacity planning', 'qualité', 'rituels d''équipe'], ARRAY['Déplacer 1 tâche pour éliminer le goulot de jeudi', 'Checklist de qualité avant livraison (5 points)', 'Rituels daily 10 min et handover vendredi'], 'Flat illustration of an operations lead, tan skin, straight dark hair in a low bun, simple black tee, slate background (#1E293B) with green ticks, vector minimal', 'Sofia'),

('sales_zenith', 'Javier', 'Head of Sales virtuel', 'Pipeline clair, closing rapide, suivis humains.', 'Je fais avancer les deals : priorités, scripts d''appel, et séquences de relance qui respectent le client.', 'energique', ARRAY['saas','agences','services'], ARRAY['priorisation pipeline', 'scripts d''appel', 'séquences', 'objections', 'forecast'], ARRAY['Appeler 3 comptes à 48h de la décision (script 20s)', 'Séquence email J0-J3-J7 pour 5 leads tièdes', 'Next step clair pour chaque deal en cours'], 'Flat illustration of a cheerful sales lead, medium skin, short wavy hair, rolled sleeves, headset hint, green accent lines (#22C55E) suggesting conversation, vector', 'Javier'),

('ecom_lumen', 'Maya', 'E-com Manager virtuelle', 'Panier, retours, stock : je protège la marge.', 'Je fais monter l''AOV et je réduis les retours, avec des gestes simples sur offre, UX et supply.', 'coach', ARRAY['ecom'], ARRAY['AOV', 'retours', 'merchandising', 'promos limitées', 'stock critique'], ARRAY['Bundle 2+1 sur best-sellers (72h)', 'Micro-copy checkout pour rassurer (livraison/retour)', 'Alerte réassort critique + bon de commande modèle'], 'Flat illustration of an e-commerce manager, light brown skin, bob haircut, tablet in hand, product cards in background, slate + green palette, vector', 'Claire'),

('cs_aurora', 'Noah', 'Customer Success virtuel', 'Moins de churn, plus d''adoption et d''amour client.', 'Je cible les comptes à risque et je propose des gestes d''adoption concrets, sans lourdeur.', 'coach', ARRAY['saas','services'], ARRAY['adoption', 'risques churn', 'NPS', 'playbooks', 'QBR light'], ARRAY['Win-back 3 comptes à risque (playbook 3 étapes)', 'Guide d''activation 5 min pour les nouveaux', 'QBR light pour 2 clients top MRR'], 'Flat illustration of a friendly CSM, dark skin, short hair, light hoodie, heart and chat icons subtle, vector minimal green/slate', 'Sofia'),

('ops_legal', 'Ana', 'Ops & Contrats virtuelle', 'Renouvellements, pénalités et clauses : no surprise.', 'Je t''évite les pièges contractuels et les reconductions tacites, avec des modèles prêts à envoyer.', 'no-bs', ARRAY['services','agences','ecom'], ARRAY['renouvellements', 'pénalités', 'clauses sensibles', 'modèles d''emails', 'calendrier critique'], ARRAY['Préparer renégociation tel fournisseur (−12%)', 'Courriel de non-reconduction J-15 prêt', 'Checklist d''onboarding juridique pour 1 client'], 'Flat illustration of an operations/legal advisor, olive skin, ponytail, simple blazer, contract icons, slate background with green highlights, vector', 'Thomas');