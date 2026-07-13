export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: settings, error } = await supabase.from('settings').select('*')

  // Build a key-value map from the settings rows for easy consumption
  const settingsMap: Record<string, unknown> = {}
  if (settings && !error) {
    for (const row of settings) {
      settingsMap[row.key] = row.value
    }
  }

  return <SettingsClient settings={settingsMap} />
}
