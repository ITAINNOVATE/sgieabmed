-- schema_admin.sql
-- Script de création des tables de gestion des utilisateurs, rôles, permissions et sécurité

-- 1. Table des Directions / Services de l'ABMed
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table des Rôles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_configurable BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table de la Matrice des Permissions (Rôle x Module)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.user_roles(id) ON DELETE CASCADE,
    module VARCHAR(100) NOT NULL, -- 'receptions', 'samples', 'waste', 'movements', 'inventory', 'destructions', 'documents', 'reports', 'admin'
    can_view BOOLEAN DEFAULT false NOT NULL,
    can_create BOOLEAN DEFAULT false NOT NULL,
    can_modify BOOLEAN DEFAULT false NOT NULL,
    can_delete BOOLEAN DEFAULT false NOT NULL,
    can_validate BOOLEAN DEFAULT false NOT NULL,
    can_export BOOLEAN DEFAULT false NOT NULL,
    can_print BOOLEAN DEFAULT false NOT NULL,
    can_admin BOOLEAN DEFAULT false NOT NULL,
    UNIQUE(role_id, module)
);

-- 4. Table d'historique des connexions (inviolable)
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'Connexion', 'Déconnexion', 'Échec de connexion'
    ip_address VARCHAR(100) NOT NULL,
    user_agent TEXT NOT NULL,
    duration INTEGER, -- durée en secondes (pour les sessions déconnectées)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Extensions de la table users existante
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS matricule VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fonction VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone VARCHAR(100);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Actif' NOT NULL; -- 'Actif', 'Suspendu', 'Désactivé'
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false NOT NULL;

-- 6. Insertions initiales (Seed data)
-- Directions / Services
INSERT INTO public.departments (name, code, description) VALUES
('Direction des Laboratoires', 'DIR-LAB', 'Gestion et analyses de laboratoire'),
('Inspection et Vigilance', 'INSP', 'Contrôles sur site et pharmacovigilance'),
('Contrôle Qualité', 'CQ', 'Surveillance de la conformité des produits'),
('Direction de la Pharmacie', 'DIR-PH', 'Gestion réglementaire des produits de santé'),
('Administration & RH', 'ADMIN-RH', 'Ressources humaines et logistique générale'),
('Systèmes d''Information', 'DSIC', 'Gestion informatique et télécoms')
ON CONFLICT (name) DO NOTHING;

-- Rôles métiers
INSERT INTO public.user_roles (name, code, description, is_configurable) VALUES
('Administrateur système', 'ADMIN_SYS', 'Configuration technique globale, sécurité, RLS, sauvegardes', false),
('Administrateur fonctionnel', 'ADMIN_FUNC', 'Paramétrage métier de la plateforme, nomenclatures, référentiels', false),
('Responsable Échantillothèque', 'RESP_ECH', 'Validation des réceptions et gestion globale de l''échantillothèque', false),
('Gestionnaire Échantillothèque', 'GEST_ECH', 'Opérations courantes (placements, mouvements d''échantillons)', false),
('Responsable Déchets', 'RESP_WASTE', 'Gestion de l''enregistrement des déchets et pilotage des plans de destruction', false),
('Responsable Qualité', 'RESP_QUAL', 'Validations réglementaires, audits internes et surveillance de la conformité', false),
('Inspecteur', 'INSPECTOR', 'Consultation des stocks et saisie d''échantillonnage de terrain', false),
('Analyste de laboratoire', 'ANALYST', 'Analyses de laboratoire et enregistrement de mouvements liés aux tests', false),
('Auditeur', 'AUDITOR', 'Consultation seule de toutes les données et accès complet aux journaux d''audit', false),
('Direction', 'MANAGEMENT', 'Tableaux de bord stratégiques, statistiques et rapports d''activité', false)
ON CONFLICT (name) DO NOTHING;
