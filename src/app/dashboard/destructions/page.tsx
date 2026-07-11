import { createClient } from "@/utils/supabase/server"
import DestructionsClient from "./DestructionsClient"

export const dynamic = 'force-dynamic'

export default async function DestructionsPage() {
  const supabase = await createClient()

  // Fetch destruction plans
  const { data: plans, error } = await supabase
    .from('destruction_plans')
    .select(`
      *,
      items:destruction_items (
        id,
        quantity,
        waste_batch:waste_batches (
          batch_number,
          waste_type,
          unit,
          sample:samples ( commercial_name )
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching destruction plans:", error)
  }

  return <DestructionsClient initialPlans={plans || []} />
}
