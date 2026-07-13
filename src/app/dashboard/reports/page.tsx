import { createClient } from '@/utils/supabase/server'
import ReportsClient from './ReportsClient'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = await createClient()

  const [
    { data: samples },
    { data: movements },
    { data: wasteBatches },
    { data: destructions },
  ] = await Promise.all([
    supabase.from('samples').select('*'),
    supabase.from('movements').select('*'),
    supabase.from('waste_batches').select('*'),
    supabase.from('destruction_plans').select('*'),
  ])

  return (
    <ReportsClient
      samples={samples || []}
      movements={movements || []}
      wasteBatches={wasteBatches || []}
      destructions={destructions || []}
    />
  )
}
