import { createClient } from '@/utils/supabase/server'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  let samples: any[] = []
  let movements: any[] = []
  let wasteBatches: any[] = []
  let destructions: any[] = []

  try {
    const supabase = await createClient()
    const [sRes, mRes, wRes, dRes] = await Promise.all([
      supabase.from('samples').select('*'),
      supabase.from('movements').select('*'),
      supabase.from('waste_batches').select('*'),
      supabase.from('destruction_plans').select('*'),
    ])
    samples = sRes.data || []
    movements = mRes.data || []
    wasteBatches = wRes.data || []
    destructions = dRes.data || []
  } catch (err) {
    console.warn("Supabase fetch fallback in ReportsPage:", err)
  }

  return (
    <ReportsClient
      samples={samples}
      movements={movements}
      wasteBatches={wasteBatches}
      destructions={destructions}
    />
  )
}
