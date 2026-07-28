import { createClient } from "@/utils/supabase/server"
import DashboardClient from "../DashboardClient"

export const dynamic = 'force-dynamic'

export default async function SampleDashboardPage() {
  const supabase = await createClient()

  const [
    { data: samples },
    { data: movements },
    { data: receptions }
  ] = await Promise.all([
    supabase.from('samples').select('*'),
    supabase.from('movements').select('*').order('created_at', { ascending: false }),
    supabase.from('receptions').select('*')
  ])

  return (
    <DashboardClient 
      samples={samples || []} 
      movements={movements || []} 
      receptions={receptions || []}
    />
  )
}
