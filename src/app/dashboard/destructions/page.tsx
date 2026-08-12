import { createClient } from "@/utils/supabase/server"
import DestructionsClient from "./DestructionsClient"

export const dynamic = 'force-dynamic'

export default async function DestructionsPage() {
  let plans: any[] | null = null;
  let error: any = null;

  try {
    const supabase = await createClient()
    const res = await supabase
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
    plans = res.data
    error = res.error
  } catch (err) {
    console.warn("Supabase fetch fallback in DestructionsPage:", err)
    error = err
  }

  if (error) {
    console.error("Error fetching destruction plans:", error)
  }

  return <DestructionsClient initialPlans={plans || []} />
}
