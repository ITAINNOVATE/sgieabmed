export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const settingsMap: Record<string, unknown> = {}

  try {
    const supabase = await createClient()
    const { data: settings, error } = await supabase.from('settings').select('*')
    if (settings && !error) {
      for (const row of settings) {
        settingsMap[row.key] = row.value
      }
    }
  } catch (err) {
    console.warn("Supabase fetch fallback in SettingsPage:", err)
  }

  return <SettingsClient settings={settingsMap} />
}
