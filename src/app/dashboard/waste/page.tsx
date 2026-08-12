import { createClient } from "@/utils/supabase/server"
import WasteClient from "./WasteClient"

export const dynamic = 'force-dynamic'

export default async function WastePage() {
  let wasteBatches: any[] = []
  let destructions: any[] = []

  try {
    const supabase = await createClient()
    const [{ data: wData }, { data: dData }] = await Promise.all([
      supabase.from('waste_batches').select(`
        *,
        sample:samples ( commercial_name, dci, batch_number )
      `).order('created_at', { ascending: false }),
      supabase.from('destruction_plans').select('*').order('scheduled_date', { ascending: true })
    ])
    wasteBatches = wData || []
    destructions = dData || []
  } catch (err) {
    console.warn("Supabase fetch fallback in WastePage:", err)
  }

  return (
    <WasteClient 
      initialBatches={wasteBatches} 
      destructions={destructions} 
    />
  )
}
