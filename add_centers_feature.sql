-- ==============================================================================
-- eGED-ABMed : GESTION DES CENTRES ET STRUCTURES APPORTRICES AVEC IDENTIFIANT UNIQUE
-- Permet la création automatique d'un identifiant unique (CTR-YYYY-XXXX) dès le
-- premier enregistrement et le suivi des données par centre.
-- ==============================================================================

-- 1. TABLE DES CENTRES
CREATE TABLE IF NOT EXISTS public.centers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    center_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    center_type TEXT DEFAULT 'Officine privée de pharmacie',
    city TEXT DEFAULT 'Cotonou',
    country TEXT DEFAULT 'Bénin',
    address TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_centers_center_code ON public.centers (center_code);
CREATE INDEX IF NOT EXISTS idx_centers_name ON public.centers (name);
CREATE INDEX IF NOT EXISTS idx_centers_city ON public.centers (city);

-- 2. ROW LEVEL SECURITY
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "centers_all_access" ON public.centers;
CREATE POLICY "centers_all_access" ON public.centers FOR ALL USING (true) WITH CHECK (true);

-- 3. AJOUT DES COLONNES DE LIAISON DANS LES TABLES DE RÉCEPTIONS ET DÉCHETS
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS center_code TEXT;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS center_id TEXT;

ALTER TABLE public.waste_batches ADD COLUMN IF NOT EXISTS center_code TEXT;
ALTER TABLE public.waste_batches ADD COLUMN IF NOT EXISTS center_id TEXT;

CREATE INDEX IF NOT EXISTS idx_receptions_center_code ON public.receptions (center_code);
CREATE INDEX IF NOT EXISTS idx_waste_batches_center_code ON public.waste_batches (center_code);
