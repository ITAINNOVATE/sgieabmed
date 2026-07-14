-- fix_check_constraints.sql
-- Correction des contraintes CHECK corrompues par l'encodage sur Supabase

-- 1. Table public.samples (Statut)
ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS samples_status_check;
ALTER TABLE public.samples ADD CONSTRAINT samples_status_check CHECK (
    status IN ('Disponible', 'Quarantaine', 'En quarantaine', 'À localiser', 'En analyse', 'Utilisé', 'Détruit', 'Périmé', 'Rejeté')
);

-- 2. Table public.movements (Type de mouvement)
ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_movement_type_check;
ALTER TABLE public.movements ADD CONSTRAINT movements_movement_type_check CHECK (
    movement_type IN (
        'Réception', 'Sortie', 'Retour', 'Prélèvement', 'Réaffectation', 'Destruction',
        'Retour d''analyse', 'Mise en quarantaine', 'Libération de quarantaine', 'Correction d''inventaire', 'Transfert', 'Entrée'
    )
);

-- 3. Table public.inventories (Type d'inventaire et Statut)
ALTER TABLE public.inventories DROP CONSTRAINT IF EXISTS inventories_inventory_type_check;
ALTER TABLE public.inventories ADD CONSTRAINT inventories_inventory_type_check CHECK (
    inventory_type IN ('Annuel', 'Périodique')
);

ALTER TABLE public.inventories DROP CONSTRAINT IF EXISTS inventories_status_check;
ALTER TABLE public.inventories ADD CONSTRAINT inventories_status_check CHECK (
    status IN ('En cours', 'Clôturé', 'Validé')
);

-- 4. Table public.documents (Type de document)
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_document_type_check CHECK (
    document_type IN ('Certificat d''analyse', 'Rapport d''essai', 'Formulaire de réception', 'Rapport de destruction', 'Autre')
);

-- 5. Table public.audit_logs (Actions d'audit)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
    action IN ('Connexion', 'Création', 'Modification', 'Suppression', 'Consultation')
);

-- 6. Table public.waste_batches (Statut des déchets)
ALTER TABLE public.waste_batches DROP CONSTRAINT IF EXISTS waste_batches_status_check;
ALTER TABLE public.waste_batches ADD CONSTRAINT waste_batches_status_check CHECK (
    status IN ('Déclaré', 'En attente de destruction', 'Détruit', 'Archivé')
);

-- 7. Table public.destruction_plans (Statut des destructions)
ALTER TABLE public.destruction_plans DROP CONSTRAINT IF EXISTS destruction_plans_status_check;
ALTER TABLE public.destruction_plans ADD CONSTRAINT destruction_plans_status_check CHECK (
    status IN ('En préparation', 'Validation Qualité', 'En attente exécution', 'Exécuté', 'Rejeté', 'Annulé')
);

-- 8. Table public.destruction_validations (Statut des validations)
ALTER TABLE public.destruction_validations DROP CONSTRAINT IF EXISTS destruction_validations_status_check;
ALTER TABLE public.destruction_validations ADD CONSTRAINT destruction_validations_status_check CHECK (
    status IN ('Approuvé', 'Rejeté')
);
