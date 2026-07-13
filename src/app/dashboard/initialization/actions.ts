"use server"

import { createClient } from "@/utils/supabase/server"

export async function initializeStock(items: any[]) {
  const supabase = await createClient()
  
  // 1. Double check if already initialized
  const { data: setting, error: settingCheckError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'is_stock_initialized')
    .maybeSingle()
    
  if (setting && setting.value === 'true') {
    return { success: false, error: "La plateforme a déjà été initialisée." }
  }
  
  // 2. Fetch current user for audit & authorization
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id || null
  
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
      
    if (profile && profile.role !== 'Administrateur') {
      return { success: false, error: "Accès refusé : Ce module est réservé aux administrateurs." }
    }
  }
  
  // 3. Separate samples and waste batches
  const sampleItems = items.filter(item => item.type === 'Échantillon')
  const wasteItems = items.filter(item => item.type === 'Déchet')
  
  // 4. Insert samples
  if (sampleItems.length > 0) {
    const samplesToInsert = sampleItems.map(item => ({
      sample_number: `ECH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      reception_ref: 'INIT-STOCK',
      commercial_name: item.commercial_name,
      dci: item.dci,
      batch_number: item.batch_number,
      expiry_date: item.expiry_date,
      quantity: parseFloat(item.quantity),
      unit: item.unit || 'Boite',
      status: item.current_location ? 'Disponible' : 'À localiser',
      current_location: item.current_location || null,
      category: item.category || 'Autres'
    }))
    
    const { data: insertedSamples, error: samplesError } = await supabase
      .from('samples')
      .insert(samplesToInsert)
      .select()
      
    if (samplesError) {
      console.error("Erreur insertion échantillons:", samplesError)
      return { success: false, error: `Erreur d'insertion des échantillons: ${samplesError.message}` }
    }
    
    // Insert movements for samples
    if (insertedSamples && insertedSamples.length > 0) {
      const movementsToInsert = insertedSamples.map(sample => ({
        mvt_number: `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        sample_id: sample.id,
        movement_type: 'Entrée',
        quantity: sample.quantity,
        reason: "Initialisation du stock",
        observations: "Reprise initiale des données historiques du stock."
      }))
      
      const { error: mvtError } = await supabase
        .from('movements')
        .insert(movementsToInsert)
        
      if (mvtError) {
        console.error("Erreur insertion mouvements:", mvtError)
        return { success: false, error: `Erreur d'insertion des mouvements: ${mvtError.message}` }
      }
    }
  }
  
  // 5. Insert waste batches
  if (wasteItems.length > 0) {
    const wasteToInsert = wasteItems.map(item => ({
      batch_number: `DEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      waste_type: item.waste_type || 'Médicaments Expirés',
      quantity: parseFloat(item.quantity),
      unit: item.unit || 'Kg',
      current_location: item.current_location || 'Zone de Quarantaine - Déchets',
      status: 'Déclaré',
      created_by: userId
    }))
    
    const { error: wasteError } = await supabase
      .from('waste_batches')
      .insert(wasteToInsert)
      
    if (wasteError) {
      console.error("Erreur insertion déchets:", wasteError)
      return { success: false, error: `Erreur d'insertion des déchets: ${wasteError.message}` }
    }
  }
  
  // 6. Set system state as initialized in settings table (upsert key/value)
  const { error: settingError } = await supabase
    .from('settings')
    .upsert({ key: 'is_stock_initialized', value: 'true' }, { onConflict: 'key' })
    
  if (settingError) {
    console.error("Erreur upsert settings:", settingError)
    return { success: false, error: `Erreur de verrouillage du module: ${settingError.message}` }
  }
  
  // 7. Write audit log
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'INITIALIZE_STOCK',
    entity_type: 'system',
    ip_address: '127.0.0.1'
  })
  
  return { success: true }
}
