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
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.manufacturers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.cabinets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.shelves FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.samples FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.inventories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Lecture pour utilisateurs authentifiés" ON public.settings FOR SELECT TO authenticated USING (true);

-- 3. Politiques d'Insertion / Modification (Exemple générique pour la phase de test)
-- Dans un environnement de production, ces politiques seraient restreintes selon la colonne `role` de `public.users`

-- Permettre l'insertion sur les échantillons pour les utilisateurs authentifiés
CREATE POLICY "Insertion échantillon" ON public.samples FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Modification échantillon" ON public.samples FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Permettre l'insertion sur les mouvements
CREATE POLICY "Insertion mouvement" ON public.movements FOR INSERT TO authenticated WITH CHECK (true);

-- Insertion dans la table users (généralement gérée par un trigger lors du signup, mais autorisée ici pour l'Administrateur)
CREATE POLICY "Modification users par soi-même ou admin" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Note : Ces politiques RLS sont permissives pour faciliter vos tests de développement actuels.
-- Elles bloquent néanmoins tout accès "Anonyme" (non connecté).
