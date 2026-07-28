import { createClient } from "@/utils/supabase/server"
import WasteClient from "./WasteClient"

export const dynamic = 'force-dynamic'

export default async function WastePage() {
  const supabase = await createClient()

  const [{ data: wasteBatches, error: wasteError }, { data: destructions, error: destError }] = await Promise.all([
    supabase.from('waste_batches').select(`
      *,
      sample:samples ( commercial_name, dci, batch_number )
    `).order('created_at', { ascending: false }),
    supabase.from('destruction_plans').select('*').order('scheduled_date', { ascending: true })
  ])

  if (wasteError) {
    console.error("Error fetching waste batches:", wasteError)
  }
  if (destError) {
    console.error("Error fetching destruction plans:", destError)
  }

  return (
    <WasteClient 
      initialBatches={wasteBatches || []} 
      destructions={destructions || []} 
    />
  )
}
