-- Tables for Waste Management and Destructions (SGIE)

-- 1. Table des lots de déchets (Waste Batches)
CREATE TABLE public.waste_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    batch_number TEXT UNIQUE NOT NULL,
    waste_type TEXT NOT NULL,
    sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL DEFAULT 'Kg',
    current_location TEXT,
    observations TEXT,
    status TEXT NOT NULL CHECK (status IN ('Déclaré', 'En attente de destruction', 'Détruit', 'Archivé')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger pour la mise à jour de updated_at
DROP TRIGGER IF EXISTS update_waste_batches_updated_at ON public.waste_batches;
CREATE TRIGGER update_waste_batches_updated_at BEFORE UPDATE ON public.waste_batches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 2. Table des plans de destruction (Destruction Plans)
CREATE TABLE public.destruction_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_number TEXT UNIQUE NOT NULL,
    planned_date DATE NOT NULL,
    execution_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('En préparation', 'Validation Qualité', 'En attente exécution', 'Exécuté', 'Rejeté', 'Annulé')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_destruction_plans_updated_at ON public.destruction_plans;
CREATE TRIGGER update_destruction_plans_updated_at BEFORE UPDATE ON public.destruction_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 3. Table des éléments à détruire (Destruction Items)
CREATE TABLE public.destruction_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_id UUID REFERENCES public.destruction_plans(id) ON DELETE CASCADE,
    waste_batch_id UUID REFERENCES public.waste_batches(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. Table des validations des plans de destruction (Quatre Yeux)
CREATE TABLE public.destruction_validations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_id UUID REFERENCES public.destruction_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Approuvé', 'Rejeté')),
    signature_hash TEXT,
    comments TEXT,
    validation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
