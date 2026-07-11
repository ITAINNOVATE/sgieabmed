-- update_waste_destructions.sql
-- Tables for Waste Management and Destructions (SGIE) - Idempotent Version

-- 1. Table des lots de déchets (Waste Batches)
CREATE TABLE IF NOT EXISTS public.waste_batches (
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

DROP TRIGGER IF EXISTS update_waste_batches_updated_at ON public.waste_batches;
CREATE TRIGGER update_waste_batches_updated_at BEFORE UPDATE ON public.waste_batches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- 2. Table des plans de destruction (Destruction Plans)
CREATE TABLE IF NOT EXISTS public.destruction_plans (
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
CREATE TABLE IF NOT EXISTS public.destruction_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_id UUID REFERENCES public.destruction_plans(id) ON DELETE CASCADE,
    waste_batch_id UUID REFERENCES public.waste_batches(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES public.samples(id) ON DELETE SET NULL,
    quantity NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- 4. Table des validations des plans de destruction (Quatre Yeux)
CREATE TABLE IF NOT EXISTS public.destruction_validations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    plan_id UUID REFERENCES public.destruction_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Approuvé', 'Rejeté')),
    signature_hash TEXT,
    comments TEXT,
    validation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- AUDIT TRAIL AUTOMATISÉ
-- ==========================================

-- Fonction générique d'audit
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    action_type TEXT;
    entity_id UUID;
    audit_details JSONB;
BEGIN
    -- Récupérer l'ID utilisateur à partir des variables locales (set_config) ou JWT si applicable
    BEGIN
        current_user_id := (NULLIF(current_setting('request.jwt.claim.sub', true), ''))::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        action_type := 'Création';
        entity_id := NEW.id;
        audit_details := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'Modification';
        entity_id := NEW.id;
        audit_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'Suppression';
        entity_id := OLD.id;
        audit_details := to_jsonb(OLD);
    END IF;

    -- Insertion dans audit_logs
    INSERT INTO public.audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        current_user_id,
        action_type,
        TG_TABLE_NAME,
        entity_id,
        audit_details
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajout des triggers d'audit sur les tables
DROP TRIGGER IF EXISTS audit_waste_batches ON public.waste_batches;
CREATE TRIGGER audit_waste_batches AFTER INSERT OR UPDATE OR DELETE ON public.waste_batches FOR EACH ROW EXECUTE PROCEDURE audit_trigger_function();

DROP TRIGGER IF EXISTS audit_destruction_plans ON public.destruction_plans;
CREATE TRIGGER audit_destruction_plans AFTER INSERT OR UPDATE OR DELETE ON public.destruction_plans FOR EACH ROW EXECUTE PROCEDURE audit_trigger_function();

DROP TRIGGER IF EXISTS audit_destruction_items ON public.destruction_items;
CREATE TRIGGER audit_destruction_items AFTER INSERT OR UPDATE OR DELETE ON public.destruction_items FOR EACH ROW EXECUTE PROCEDURE audit_trigger_function();

DROP TRIGGER IF EXISTS audit_destruction_validations ON public.destruction_validations;
CREATE TRIGGER audit_destruction_validations AFTER INSERT OR UPDATE OR DELETE ON public.destruction_validations FOR EACH ROW EXECUTE PROCEDURE audit_trigger_function();
