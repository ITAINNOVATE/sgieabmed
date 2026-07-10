import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Box, Search, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/server"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function LocationsPage() {
  const supabase = await createClient()

  // Fetch all samples to group them by location
  const { data: samples, error } = await supabase.from('samples').select('*').order('current_location', { ascending: true })
  
  // Group by location
  const locationGroups: Record<string, any[]> = {}
  let unassignedCount = 0

  if (samples) {
    samples.forEach(sample => {
      const loc = sample.current_location?.trim() || ""
      if (!loc) {
        unassignedCount++
      } else {
        if (!locationGroups[loc]) locationGroups[loc] = []
        locationGroups[loc].push(sample)
      }
    })
  }

  const locations = Object.keys(locationGroups).sort()

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cartographie des Emplacements</h2>
          <p className="text-muted-foreground mt-1">Aperçu du stockage par code emplacement.</p>
        </div>
        <Badge variant="outline" className="px-4 py-1.5 text-sm bg-background shadow-sm">
          {locations.length} Emplacements utilisés
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Rechercher un code emplacement (ex: A1-E2)..." className="pl-10 h-12 text-base shadow-sm border-border/50 bg-card rounded-xl max-w-md" />
      </div>

      {unassignedCount > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 text-amber-800">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <div>
            <h4 className="font-semibold">À localiser</h4>
            <p className="text-sm opacity-90">{unassignedCount} échantillon(s) attendent d'être affectés à un emplacement (via le module Mouvements).</p>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-12 text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucun emplacement défini</p>
            <p className="text-sm">Effectuez des mouvements de "Transfert" pour affecter des codes emplacements aux échantillons.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((loc) => (
            <Card key={loc} className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
              <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold">{loc}</CardTitle>
                    </div>
                  </div>
                  <Badge variant="secondary">{locationGroups[loc].length} lots</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-[300px] overflow-y-auto">
                <div className="divide-y divide-border/50">
                  {locationGroups[loc].map((sample: any) => (
                    <Link href={`/dashboard/samples/${sample.id}`} key={sample.id} className="block p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm text-foreground line-clamp-1">{sample.commercial_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Box className="h-3 w-3" /> Lot: {sample.batch_number}
                          </p>
                        </div>
                        <Badge variant={sample.status === "Rejeté" ? "destructive" : sample.status === "En quarantaine" ? "secondary" : "outline"} className="text-[10px] shrink-0 ml-2">
                          Qté: {sample.quantity}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
