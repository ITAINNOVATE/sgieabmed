import { createClient } from "@/utils/supabase/server"
import WasteClient from "./WasteClient"

export const dynamic = 'force-dynamic'

export default async function WastePage() {
  const supabase = await createClient()

  const { data: wasteBatches, error } = await supabase
    .from('waste_batches')
    .select(`
      *,
      sample:samples ( commercial_name, dci, batch_number )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching waste batches:", error)
  }

  return <WasteClient initialBatches={wasteBatches || []} />
}
