-- seed.sql
-- Jeu de données de démonstration pour SGIE

-- 1. Catégories
INSERT INTO public.categories (name, description) VALUES
('Antalgique', 'Médicaments contre la douleur'),
('Antibiotique', 'Traitement des infections bactériennes'),
('Vaccin', 'Préparations pour immunisation')
ON CONFLICT (name) DO NOTHING;

-- 2. Fabricants
INSERT INTO public.manufacturers (name, country, address) VALUES
('Sanofi', 'France', 'Paris, France'),
('GSK', 'Royaume-Uni', 'Londres, UK'),
('Pfizer', 'USA', 'New York, USA'),
('Institut Pasteur', 'France', 'Dakar, Sénégal')
ON CONFLICT (name) DO NOTHING;

-- 3. Localisations (Salle -> Zone -> Armoire -> Étagère)
INSERT INTO public.rooms (name, description) VALUES
('Magasin Central', 'Stockage principal à température ambiante'),
('Chambre Froide', 'Stockage réfrigéré (2-8°C)')
ON CONFLICT (name) DO NOTHING;

-- Récupérer les IDs pour insérer la suite (Simulation basique, on va utiliser des requêtes imbriquées)
DO $$
DECLARE
    magasin_id UUID;
    froid_id UUID;
    zone_a_id UUID;
    zone_f_id UUID;
    cabinet_1_id UUID;
    cabinet_f_id UUID;
    shelf_1_id UUID;
    shelf_f_id UUID;
    
    cat_antalgique UUID;
    cat_antibio UUID;
    cat_vaccin UUID;
    
    man_sanofi UUID;
    man_gsk UUID;
    man_pfizer UUID;
    man_pasteur UUID;
BEGIN
    SELECT id INTO magasin_id FROM public.rooms WHERE name = 'Magasin Central' LIMIT 1;
    SELECT id INTO froid_id FROM public.rooms WHERE name = 'Chambre Froide' LIMIT 1;

    INSERT INTO public.zones (room_id, name) VALUES (magasin_id, 'Zone A (Réception)') RETURNING id INTO zone_a_id;
    INSERT INTO public.zones (room_id, name) VALUES (froid_id, 'Zone Froide 1') RETURNING id INTO zone_f_id;

    INSERT INTO public.cabinets (zone_id, name) VALUES (zone_a_id, 'Armoire A1') RETURNING id INTO cabinet_1_id;
    INSERT INTO public.cabinets (zone_id, name) VALUES (zone_f_id, 'Réfrigérateur R1') RETURNING id INTO cabinet_f_id;

    INSERT INTO public.shelves (cabinet_id, name, level) VALUES (cabinet_1_id, 'Étagère 1', 1) RETURNING id INTO shelf_1_id;
    INSERT INTO public.shelves (cabinet_id, name, level) VALUES (cabinet_f_id, 'Niveau 1', 1) RETURNING id INTO shelf_f_id;

    -- Récupérer les catégories et fabricants
    SELECT id INTO cat_antalgique FROM public.categories WHERE name = 'Antalgique' LIMIT 1;
    SELECT id INTO cat_antibio FROM public.categories WHERE name = 'Antibiotique' LIMIT 1;
    SELECT id INTO cat_vaccin FROM public.categories WHERE name = 'Vaccin' LIMIT 1;

    SELECT id INTO man_sanofi FROM public.manufacturers WHERE name = 'Sanofi' LIMIT 1;
    SELECT id INTO man_gsk FROM public.manufacturers WHERE name = 'GSK' LIMIT 1;
    SELECT id INTO man_pfizer FROM public.manufacturers WHERE name = 'Pfizer' LIMIT 1;
    SELECT id INTO man_pasteur FROM public.manufacturers WHERE name = 'Institut Pasteur' LIMIT 1;

    -- 4. Échantillons
    INSERT INTO public.samples (sample_number, commercial_name, dci, pharmaceutical_form, dosage, category_id, manufacturer_id, batch_number, expiry_date, quantity, unit, status, shelf_id, origin)
    VALUES 
    ('ECH-2026-001', 'Doliprane', 'Paracétamol', 'Comprimé', '500mg', cat_antalgique, man_sanofi, 'B492', '2028-10-01', 150, 'Boîte', 'Disponible', shelf_1_id, 'Donation'),
    ('ECH-2026-002', 'Clamoxyl', 'Amoxicilline', 'Poudre', '1g', cat_antibio, man_gsk, 'X91', '2027-05-15', 45, 'Flacon', 'Quarantaine', shelf_1_id, 'Importation'),
    ('ECH-2026-003', 'Advil', 'Ibuprofène', 'Gélule', '400mg', cat_antalgique, man_pfizer, 'A11', '2026-01-10', 0, 'Boîte', 'Périmé', shelf_1_id, 'Achat'),
    ('ECH-2026-004', 'Verorab', 'Vaccin rabique', 'Injectable', '0.5ml', cat_vaccin, man_pasteur, 'V02', '2029-12-31', 200, 'Unité', 'Disponible', shelf_f_id, 'Programme National');

END $$;
