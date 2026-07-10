import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Box, Database, Search, LocateFixed, Grid2x2, ThermometerSnowflake } from "lucide-react"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"

export const dynamic = 'force-dynamic'

export default async function LocationsPage() {
  const { data: rooms } = await supabase.from('rooms').select(`
    id,
    name,
    description,
    zones (
      id,
      name,
      cabinets (
        id,
        name,
        shelves (
          id,
          name,
          level
        )
      )
    )
  `)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Localisation Physique</h2>
          <p className="text-muted-foreground mt-1">Plan de stockage et répartition de l'échantillothèque.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Rechercher un emplacement précis (ex: Armoire A1)..." className="pl-10 h-12 text-base shadow-sm border-border/50 bg-card rounded-xl" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {rooms?.map((room) => (
          <Card key={room.id} className="shadow-sm border-border/50 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2.5 rounded-xl">
                    {room.name.toLowerCase().includes('froid') ? (
                      <ThermometerSnowflake className="h-6 w-6 text-primary" />
                    ) : (
                      <Database className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{room.name}</CardTitle>
                    <CardDescription>{room.description}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-background">
                  {room.zones?.length || 0} Zone(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {room.zones?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Aucune zone configurée</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {room.zones?.map((zone: any) => (
                    <div key={zone.id} className="p-6">
                      <h4 className="font-semibold text-foreground flex items-center mb-4">
                        <Grid2x2 className="mr-2 h-4 w-4 text-muted-foreground" /> {zone.name}
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        {zone.cabinets?.map((cabinet: any) => (
                          <div key={cabinet.id} className="bg-muted/30 rounded-lg p-4 border border-border/50">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-medium flex items-center">
                                <Box className="mr-2 h-4 w-4 text-primary" /> {cabinet.name}
                              </span>
                              <Badge variant="secondary" className="text-xs">{cabinet.shelves?.length || 0} niveaux</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {cabinet.shelves?.map((shelf: any) => (
                                <Badge key={shelf.id} variant="outline" className="bg-background text-xs text-muted-foreground hover:bg-muted cursor-default transition-colors">
                                  {shelf.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
