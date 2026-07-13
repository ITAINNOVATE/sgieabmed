-- rls_policies.sql
-- Script pour activer et configurer la sécurité au niveau des lignes (RLS)

-- 1. Activer RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2. Politiques globales : Lecture autorisée pour tous les utilisateurs authentifiés
-- (Un utilisateur doit être connecté pour voir les données)
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.users;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.users FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.categories;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.manufacturers;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.manufacturers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.rooms;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.rooms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.zones;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.zones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.cabinets;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.cabinets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.shelves;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.shelves FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.samples;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.samples FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.movements;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.inventories;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.inventories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.inventory_items;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.inventory_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.documents;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.audit_logs;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.settings;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.settings FOR SELECT TO authenticated USING (true);

-- 3. Politiques d'Insertion / Modification (Exemple générique pour la phase de test)
-- Dans un environnement de production, ces politiques seraient restreintes selon la colonne `role` de `public.users`

-- Permettre l'insertion sur les échantillons pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Insertion échantillon" ON public.samples;
CREATE POLICY "Insertion échantillon" ON public.samples FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Modification échantillon" ON public.samples;
CREATE POLICY "Modification échantillon" ON public.samples FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Permettre l'insertion sur les mouvements
DROP POLICY IF EXISTS "Insertion mouvement" ON public.movements;
CREATE POLICY "Insertion mouvement" ON public.movements FOR INSERT TO authenticated WITH CHECK (true);

-- Insertion dans la table users (généralement gérée par un trigger lors du signup, mais autorisée ici pour l'Administrateur)
DROP POLICY IF EXISTS "Modification users par soi-même ou admin" ON public.users;
CREATE POLICY "Modification users par soi-même ou admin" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Note : Ces politiques RLS sont permissives pour faciliter vos tests de développement actuels.
-- Elles bloquent néanmoins tout accès "Anonyme" (non connecté).

-- 4. RLS pour les Déchets et Destructions (Waste & Destructions)
ALTER TABLE public.waste_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destruction_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destruction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destruction_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.waste_batches;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.waste_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.destruction_plans;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.destruction_plans FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.destruction_items;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.destruction_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Lecture pour utilisateurs authentifiés" ON public.destruction_validations;
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.destruction_validations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Insertion waste_batches" ON public.waste_batches;
CREATE POLICY "Insertion waste_batches" ON public.waste_batches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Modification waste_batches" ON public.waste_batches;
CREATE POLICY "Modification waste_batches" ON public.waste_batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Insertion destruction_plans" ON public.destruction_plans;
CREATE POLICY "Insertion destruction_plans" ON public.destruction_plans FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Modification destruction_plans" ON public.destruction_plans;
CREATE POLICY "Modification destruction_plans" ON public.destruction_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Insertion destruction_items" ON public.destruction_items;
CREATE POLICY "Insertion destruction_items" ON public.destruction_items FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Insertion destruction_validations" ON public.destruction_validations;
CREATE POLICY "Insertion destruction_validations" ON public.destruction_validations FOR INSERT TO authenticated WITH CHECK (true);

-- 5. RLS pour les Inventaires (Inventories & Inventory Items)
DROP POLICY IF EXISTS "Insertion inventories" ON public.inventories;
CREATE POLICY "Insertion inventories" ON public.inventories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Modification inventories" ON public.inventories;
CREATE POLICY "Modification inventories" ON public.inventories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Insertion inventory_items" ON public.inventory_items;
CREATE POLICY "Insertion inventory_items" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Modification inventory_items" ON public.inventory_items;
CREATE POLICY "Modification inventory_items" ON public.inventory_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 6. RLS pour les Paramètres (Settings)
DROP POLICY IF EXISTS "Modification des parametres" ON public.settings;
CREATE POLICY "Modification des parametres" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);


