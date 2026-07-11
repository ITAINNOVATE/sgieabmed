-- schema.sql
-- Base de données pour SGIE - Système de Gestion Informatisé de l'Échantillothèque

-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Nettoyage des tables existantes pour éviter les conflits de types (ex: id en TEXT au lieu de UUID)
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.inventory_items CASCADE;
DROP TABLE IF EXISTS public.inventories CASCADE;
DROP TABLE IF EXISTS public.movements CASCADE;
DROP TABLE IF EXISTS public.samples CASCADE;
DROP TABLE IF EXISTS public.shelves CASCADE;
DROP TABLE IF EXISTS public.cabinets CASCADE;
DROP TABLE IF EXISTS public.zones CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.manufacturers CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Table des utilisateurs (profils supplémentaires liés à l'authentification Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Administrateur', 'Responsable', 'Gestionnaire', 'Analyste', 'Auditeur')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des catégories thérapeutiques
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des fabricants
CREATE TABLE public.manufacturers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gestion des localisations hiérarchiques (Salles -> Zones -> Armoires -> Étagères)
CREATE TABLE public.rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.zones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, name)
);

CREATE TABLE public.cabinets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    zone_id UUID REFERENCES public.zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(zone_id, name)
);

CREATE TABLE public.shelves (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cabinet_id UUID REFERENCES public.cabinets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cabinet_id, name)
);

-- Table principale des échantillons
CREATE TABLE public.samples (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sample_number TEXT UNIQUE NOT NULL,
    commercial_name TEXT NOT NULL,
    dci TEXT NOT NULL,
    pharmaceutical_form TEXT NOT NULL,
    dosage TEXT NOT NULL,
    presentation TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    
    manufacturer_id UUID REFERENCES public.manufacturers(id) ON DELETE SET NULL,
    batch_number TEXT NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'boîte',
    
    status TEXT NOT NULL CHECK (status IN ('Disponible', 'Quarantaine', 'Utilisé', 'Détruit', 'Périmé', 'Rejeté')),
    
    shelf_id UUID REFERENCES public.shelves(id) ON DELETE SET NULL,
    position_details TEXT,
    
    origin TEXT,
    program TEXT,
    responsible_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    reception_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE -- Suppression logique
);

-- Table des mouvements (Réception, Sortie, Retour, Prélèvement, Réaffectation, Destruction)
CREATE TABLE public.movements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sample_id UUID REFERENCES public.samples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('Réception', 'Sortie', 'Retour', 'Prélèvement', 'Réaffectation', 'Destruction')),
    quantity INTEGER NOT NULL,
    reason TEXT,
    observations TEXT,
    movement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Table des inventaires
CREATE TABLE public.inventories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    inventory_type TEXT NOT NULL CHECK (inventory_type IN ('Annuel', 'Périodique')),
    status TEXT NOT NULL CHECK (status IN ('En cours', 'Clôturé', 'Validé')),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE public.inventory_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    inventory_id UUID REFERENCES public.inventories(id) ON DELETE CASCADE,
    sample_id UUID REFERENCES public.samples(id) ON DELETE CASCADE,
    system_quantity INTEGER NOT NULL,
    physical_quantity INTEGER,
    discrepancy_reason TEXT,
    verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- Table des documents
CREATE TABLE public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sample_id UUID REFERENCES public.samples(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('Certificat d''analyse', 'Rapport d''essai', 'Formulaire de réception', 'Rapport de destruction', 'Autre')),
    file_url TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal d'audit
CREATE TABLE public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('Connexion', 'Création', 'Modification', 'Suppression', 'Consultation')),
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paramètres globaux
CREATE TABLE public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Fonction pour mettre à jour 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at (suppression préalable s'ils existent)
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_samples_updated_at ON public.samples;
CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON public.samples FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Note: RLS (Row Level Security) and specific policies will be added later.

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

