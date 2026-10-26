-- ==============================================================================
-- eGED-ABMed : SCRIPT COMPLET D'INITIALISATION DE LA BASE CLOUD SUPABASE
-- Synchronisation multi-postes, temps réel et cohérence inter-ordinateurs
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLE DES RÉCEPTIONS D'ÉCHANTILLONS
CREATE TABLE IF NOT EXISTS public.receptions (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    rec_number TEXT UNIQUE NOT NULL,
    date_reception DATE NOT NULL DEFAULT CURRENT_DATE,
    time_reception TEXT DEFAULT '08:00',
    ref_document TEXT,
    type_reception TEXT,
    inspector TEXT DEFAULT 'Marie ADANDE',
    status TEXT NOT NULL DEFAULT 'En attente de validation',
    supplier TEXT,
    manufacturer TEXT,
    country TEXT,
    city TEXT,
    contact_person TEXT,
    phone TEXT,
    check_packaging BOOLEAN DEFAULT false,
    check_boxes BOOLEAN DEFAULT false,
    check_seals BOOLEAN DEFAULT false,
    check_qty BOOLEAN DEFAULT false,
    check_docs BOOLEAN DEFAULT false,
    check_damage BOOLEAN DEFAULT false,
    check_conform BOOLEAN DEFAULT false,
    anomalies TEXT,
    measures TEXT,
    validator_name TEXT,
    validation_date TIMESTAMP WITH TIME ZONE,
    samples_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE DES ÉCHANTILLONS EN STOCK
CREATE TABLE IF NOT EXISTS public.samples (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    sample_number TEXT UNIQUE NOT NULL,
    reception_ref TEXT,
    commercial_name TEXT NOT NULL,
    dci TEXT,
    dosage TEXT,
    batch_number TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Disponible',
    expiry_date DATE,
    current_location TEXT DEFAULT 'Magasin Central (Zone A)',
    manufacturer_name TEXT,
    supplier_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLE DES MOUVEMENTS D'ÉCHANTILLONS
CREATE TABLE IF NOT EXISTS public.movements (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    mvt_number TEXT UNIQUE NOT NULL,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    movement_type TEXT NOT NULL DEFAULT 'Entrée',
    sample_id TEXT,
    sample_number TEXT,
    commercial_name TEXT,
    batch_number TEXT,
    quantity NUMERIC DEFAULT 1,
    source_location TEXT,
    destination_location TEXT,
    operator TEXT DEFAULT 'Marie ADANDE',
    reason TEXT,
    observations TEXT,
    status TEXT DEFAULT 'Validé',
    reference_document TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLE DES LOTS DE DÉCHETS PHARMACEUTIQUES
CREATE TABLE IF NOT EXISTS public.waste_batches (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    batch_number TEXT UNIQUE NOT NULL,
    reception_number TEXT,
    reception_date DATE DEFAULT CURRENT_DATE,
    reception_time TEXT DEFAULT '08:00',
    delivery_slip_ref TEXT,
    recipient_agent TEXT DEFAULT 'Marie ADANDE',
    source_structure TEXT NOT NULL,
    source_type TEXT DEFAULT 'Officine privée de pharmacie',
    city TEXT DEFAULT 'Cotonou',
    depositor_name TEXT,
    depositor_phone TEXT,
    depositor_id_card TEXT,
    waste_type TEXT NOT NULL,
    commercial_name TEXT,
    original_batch TEXT,
    sample_id TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'Kg',
    packaging TEXT,
    packaging_condition TEXT,
    destruction_motive TEXT,
    current_location TEXT DEFAULT 'Zone de Quarantaine - Déchets',
    status TEXT NOT NULL DEFAULT 'Déclaré',
    observations TEXT,
    destruction_date TIMESTAMP WITH TIME ZONE,
    destruction_plan_ref TEXT,
    certificate_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLE DES PLANS DE DESTRUCTION DE DÉCHETS
CREATE TABLE IF NOT EXISTS public.destruction_plans (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    plan_number TEXT UNIQUE NOT NULL,
    planned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    execution_date TIMESTAMP WITH TIME ZONE,
    destruction_method TEXT,
    destruction_site TEXT,
    supervisor_name TEXT DEFAULT 'Marie ADANDE',
    observations TEXT,
    certificate_number TEXT,
    status TEXT NOT NULL DEFAULT 'En préparation',
    items_data JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABLE DU JOURNAL DES MOUVEMENTS DE DÉCHETS
CREATE TABLE IF NOT EXISTS public.waste_movements (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    mvt_number TEXT UNIQUE NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    type TEXT NOT NULL DEFAULT 'Entrée au local déchet',
    batch TEXT,
    waste_type TEXT,
    commercial_name TEXT,
    quantity TEXT,
    operator TEXT DEFAULT 'Marie ADANDE',
    origin TEXT,
    destination TEXT,
    reception_number TEXT,
    certificate_number TEXT,
    source_structure TEXT,
    depositor_name TEXT,
    signature_hash TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLE DES SESSIONS D'INVENTAIRE
CREATE TABLE IF NOT EXISTS public.inventories (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    inv_number TEXT UNIQUE NOT NULL,
    name TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location TEXT,
    inventory_type TEXT DEFAULT 'Contrôle complet',
    status TEXT DEFAULT 'En cours',
    system_weight NUMERIC DEFAULT 0,
    physical_weight NUMERIC DEFAULT 0,
    diff NUMERIC DEFAULT 0,
    items_count INTEGER DEFAULT 0,
    controller TEXT DEFAULT 'Marie ADANDE',
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8b. TABLE DES CENTRES ET STRUCTURES APPORTRICES
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

-- Colonnes de liaison
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS center_code TEXT;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS center_id TEXT;
ALTER TABLE public.waste_batches ADD COLUMN IF NOT EXISTS center_code TEXT;
ALTER TABLE public.waste_batches ADD COLUMN IF NOT EXISTS center_id TEXT;

-- 9. ACTIVATION DU ROW LEVEL SECURITY & DROITS D'ACCÈS
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "centers_all_access" ON public.centers;
CREATE POLICY "centers_all_access" ON public.centers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.receptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receptions_all_access" ON public.receptions;
CREATE POLICY "receptions_all_access" ON public.receptions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "samples_all_access" ON public.samples;
CREATE POLICY "samples_all_access" ON public.samples FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movements_all_access" ON public.movements;
CREATE POLICY "movements_all_access" ON public.movements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.waste_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waste_batches_all_access" ON public.waste_batches;
CREATE POLICY "waste_batches_all_access" ON public.waste_batches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.destruction_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "destruction_plans_all_access" ON public.destruction_plans;
CREATE POLICY "destruction_plans_all_access" ON public.destruction_plans FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.waste_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waste_movements_all_access" ON public.waste_movements;
CREATE POLICY "waste_movements_all_access" ON public.waste_movements FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventories_all_access" ON public.inventories;
CREATE POLICY "inventories_all_access" ON public.inventories FOR ALL USING (true) WITH CHECK (true);

-- 10. ACTIVATION DE LA SYNCHRONISATION EN TEMPS RÉEL (SUPABASE REALTIME)
-- Permet aux ordinateurs connectés de recevoir automatiquement les mises à jour sans rafraîchir
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.centers; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.receptions; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.samples; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.movements; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_batches; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.destruction_plans; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_movements; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.inventories; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

