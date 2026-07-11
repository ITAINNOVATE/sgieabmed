import { createClient } from "@/utils/supabase/server"
import DashboardClient from "./DashboardClient"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch samples and movements
  const { data: samples } = await supabase.from('samples').select('*')
  const { data: movements } = await supabase.from('movements').select('*').order('created_at', { ascending: false })
  const { data: receptions } = await supabase.from('receptions').select('*')

  return (
    <DashboardClient 
      samples={samples || []} 
      movements={movements || []} 
      receptions={receptions || []}
    />
  )
}
