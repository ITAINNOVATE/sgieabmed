-- schema_admin_policies.sql
-- Script pour configurer la sécurité au niveau des lignes (RLS) sur les tables d'administration

-- 1. Activer RLS sur les nouvelles tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

-- 2. Politiques pour public.departments
DROP POLICY IF EXISTS "Lecture departments pour authentifiés" ON public.departments;
CREATE POLICY "Lecture departments pour authentifiés" ON public.departments 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestion departments pour admins" ON public.departments;
CREATE POLICY "Gestion departments pour admins" ON public.departments 
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système')
    );

-- 3. Politiques pour public.user_roles
DROP POLICY IF EXISTS "Lecture user_roles pour authentifiés" ON public.user_roles;
CREATE POLICY "Lecture user_roles pour authentifiés" ON public.user_roles 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestion user_roles pour admins" ON public.user_roles;
CREATE POLICY "Gestion user_roles pour admins" ON public.user_roles 
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système')
    );

-- 4. Politiques pour public.role_permissions
DROP POLICY IF EXISTS "Lecture role_permissions pour authentifiés" ON public.role_permissions;
CREATE POLICY "Lecture role_permissions pour authentifiés" ON public.role_permissions 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Gestion role_permissions pour admins" ON public.role_permissions;
CREATE POLICY "Gestion role_permissions pour admins" ON public.role_permissions 
    FOR ALL TO authenticated USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système')
    );

-- 5. Politiques pour public.login_logs
DROP POLICY IF EXISTS "Lecture login_logs pour admins et auditeurs" ON public.login_logs;
CREATE POLICY "Lecture login_logs pour admins et auditeurs" ON public.login_logs 
    FOR SELECT TO authenticated USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système', 'Auditeur')
    );

DROP POLICY IF EXISTS "Insertion login_logs pour tous" ON public.login_logs;
CREATE POLICY "Insertion login_logs pour tous" ON public.login_logs 
    FOR INSERT TO authenticated WITH CHECK (true);

-- 6. Politiques d'écriture supplémentaires pour public.users (permettre à l'admin de gérer les comptes)
DROP POLICY IF EXISTS "Insertion users par admin" ON public.users;
CREATE POLICY "Insertion users par admin" ON public.users 
    FOR INSERT TO authenticated WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système')
    );

DROP POLICY IF EXISTS "Modification users par admin" ON public.users;
CREATE POLICY "Modification users par admin" ON public.users 
    FOR UPDATE TO authenticated USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système')
    ) WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système')
    );

DROP POLICY IF EXISTS "Suppression users par admin" ON public.users;
CREATE POLICY "Suppression users par admin" ON public.users 
    FOR DELETE TO authenticated USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Administrateur', 'Administrateur système')
    );
