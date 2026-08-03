-- Schéma de la base D1 « dvs-database »
-- (Déjà appliqué en production — conservé ici comme référence.)

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'fa-solid fa-star',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Création',
  description TEXT DEFAULT '',
  image_key TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO services (title, description, icon, sort_order) VALUES
('Web Design', 'Conception et développement de sites web modernes : nous optimisons et modernisons votre présence en ligne.', 'fa-solid fa-laptop-code', 1),
('Design Graphique', 'Logos, illustrations, flyers, supports marketing et identité visuelle complète pour votre marque.', 'fa-solid fa-pen-nib', 2),
('Marketing Digital', 'Stratégie de marque, campagnes sur les réseaux sociaux et marketing digital sur mesure.', 'fa-solid fa-bullhorn', 3);
