-- schema_indices.sql
-- Script d'optimisation de la base de données : Indexations clés pour eGED-ABMed

-- 1. Index sur les échantillons (Samples)
CREATE INDEX IF NOT EXISTS idx_samples_created_at ON public.samples(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_samples_status ON public.samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_reception_ref ON public.samples(reception_ref);
CREATE INDEX IF NOT EXISTS idx_samples_dci ON public.samples(dci);
CREATE INDEX IF NOT EXISTS idx_samples_commercial_name ON public.samples(commercial_name);

-- 2. Index sur les mouvements de stock (Movements)
CREATE INDEX IF NOT EXISTS idx_movements_sample_id ON public.movements(sample_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON public.movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_type ON public.movements(movement_type);

-- 3. Index sur la gestion documentaire (Documents)
CREATE INDEX IF NOT EXISTS idx_documents_sample_id ON public.documents(sample_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at DESC);

-- 4. Index sur les déchets et destructions (Waste & Destructions)
CREATE INDEX IF NOT EXISTS idx_waste_batches_status ON public.waste_batches(status);
CREATE INDEX IF NOT EXISTS idx_waste_batches_created_at ON public.waste_batches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_destruction_plans_status ON public.destruction_plans(status);
CREATE INDEX IF NOT EXISTS idx_destruction_plans_scheduled_date ON public.destruction_plans(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_destruction_items_plan_id ON public.destruction_items(destruction_plan_id);

-- 5. Index sur la sécurité et les logs
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON public.login_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
