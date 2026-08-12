import { createClient } from "@/utils/supabase/server"
import DashboardClient from "../DashboardClient"

export const dynamic = 'force-dynamic'

export default async function SampleDashboardPage() {
  let samples: any[] = []
  let movements: any[] = []
  let receptions: any[] = []

  try {
    const supabase = await createClient()
    const [sRes, mRes, rRes] = await Promise.all([
      supabase.from('samples').select('*'),
      supabase.from('movements').select('*').order('created_at', { ascending: false }),
      supabase.from('receptions').select('*')
    ])
    samples = sRes.data || []
    movements = mRes.data || []
    receptions = rRes.data || []
  } catch (err) {
    console.warn("Supabase fetch fallback in SampleDashboardPage:", err)
  }

  return (
    <DashboardClient 
      samples={samples} 
      movements={movements} 
      receptions={receptions}
    />
  )
}
