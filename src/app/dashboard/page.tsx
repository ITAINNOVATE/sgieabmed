import { createClient } from "@/utils/supabase/server"
import DashboardClient from "./DashboardClient"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch samples, movements, receptions, waste batches and destruction plans in parallel
  const [
    { data: samples },
    { data: movements },
    { data: receptions },
    { data: wasteBatches },
    { data: destructions }
  ] = await Promise.all([
    supabase.from('samples').select('*'),
    supabase.from('movements').select('*').order('created_at', { ascending: false }),
    supabase.from('receptions').select('*'),
    supabase.from('waste_batches').select('*'),
    supabase.from('destruction_plans').select('*')
  ])

  return (
    <DashboardClient 
      samples={samples || []} 
      movements={movements || []} 
      receptions={receptions || []}
      wasteBatches={wasteBatches || []}
      destructions={destructions || []}
    />
  )
}
