"use client"

import { useState, useEffect, use } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, Printer, Download, Edit, MapPin, 
  History, FileText, MessageSquare, ShieldAlert, 
  Info, Box, Calendar, Activity, Building2, Beaker
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Sample } from "../page"

export default function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [sample, setSample] = useState<Sample | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchSample() {
      const { data, error } = await supabase.from('samples').select('*').eq('id', resolvedParams.id).single()
      if (data) setSample(data)
      setLoading(false)
    }
    fetchSample()
  }, [resolvedParams.id])

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement de la fiche échantillon...</div>
  if (!sample) return <div className="p-8 text-center text-destructive">Échantillon introuvable.</div>

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-6xl mx-auto">
      
      {/* Header Fiche */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 sm:p-6 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" asChild className="shrink-0 mt-1">
            <Link href="/dashboard/samples"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{sample.commercial_name || sample.dci}</h1>
              <Badge variant={
                sample.status === "Rejeté" ? "destructive" :
                sample.status === "En quarantaine" ? "secondary" :
                sample.status === "À localiser" ? "outline" : "default"
              } className={`shadow-sm ${
                sample.status === "En quarantaine" ? "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300" :
                sample.status === "À localiser" ? "bg-blue-50 text-blue-700 hover:bg-blue-50 border-blue-200" :
                sample.status === "Rejeté" ? "" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200"
              }`}>
                {sample.status || 'À localiser'}
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Box className="h-3 w-3" /> N° {sample.sample_number} • Lot {sample.batch_number} • <Link href={`/dashboard/receptions`} className="text-primary hover:underline ml-1">Origine: {sample.reception_ref || "REC-2026-001"}</Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="bg-background" asChild><Link href={`/dashboard/samples/${sample.id}/edit`}><Edit className="mr-2 h-4 w-4" /> Modifier</Link></Button>
          <Button variant="outline" size="sm" className="bg-background"><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
          <Button variant="outline" size="sm" className="bg-background"><Download className="mr-2 h-4 w-4" /> PDF</Button>
        </div>
      </div>

      {/* Contenu en Onglets */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="general" className="py-2.5 rounded-lg data-[state=active]:shadow-sm"><Info className="h-4 w-4 mr-2 hidden sm:block" /> Général</TabsTrigger>
          <TabsTrigger value="location" className="py-2.5 rounded-lg data-[state=active]:shadow-sm"><MapPin className="h-4 w-4 mr-2 hidden sm:block" /> Localisation</TabsTrigger>
          <TabsTrigger value="history" className="py-2.5 rounded-lg data-[state=active]:shadow-sm"><History className="h-4 w-4 mr-2 hidden sm:block" /> Historique</TabsTrigger>
          <TabsTrigger value="documents" className="py-2.5 rounded-lg data-[state=active]:shadow-sm"><FileText className="h-4 w-4 mr-2 hidden sm:block" /> Documents</TabsTrigger>
          <TabsTrigger value="comments" className="py-2.5 rounded-lg data-[state=active]:shadow-sm"><MessageSquare className="h-4 w-4 mr-2 hidden sm:block" /> Notes</TabsTrigger>
          <TabsTrigger value="audit" className="py-2.5 rounded-lg data-[state=active]:shadow-sm"><ShieldAlert className="h-4 w-4 mr-2 hidden sm:block" /> Audit</TabsTrigger>
        </TabsList>
        
        {/* ONGLET 1: GENERAL */}
        <TabsContent value="general" className="mt-0 focus-visible:ring-0 focus-visible:outline-none">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 pb-4 border-b border-border/50">
                <CardTitle className="text-base flex items-center"><Beaker className="mr-2 h-5 w-5 text-primary" /> Informations Cliniques</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Nom Commercial</p>
                    <p className="text-sm font-semibold text-foreground">{sample.commercial_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">DCI</p>
                    <p className="text-sm font-semibold text-foreground">{sample.dci || '-'}</p>
                  </div>
                  {/* Additional fields mocked */}
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Forme Pharmaceutique</p>
                    <p className="text-sm font-semibold text-foreground">Comprimé pelliculé</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Dosage</p>
                    <p className="text-sm font-semibold text-foreground">500 mg</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 pb-4 border-b border-border/50">
                <CardTitle className="text-base flex items-center"><Activity className="mr-2 h-5 w-5 text-primary" /> Détails Réglementaires</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Numéro de Lot</p>
                    <p className="text-sm font-semibold text-foreground">{sample.batch_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Quantité Actuelle</p>
                    <p className="text-sm font-semibold text-foreground">{sample.quantity} Unité(s)</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center"><Calendar className="h-3 w-3 mr-1"/> Date de Péremption</p>
                    <p className="text-sm font-semibold text-destructive">{new Date(sample.expiry_date).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50 md:col-span-2">
              <CardHeader className="bg-muted/20 pb-4 border-b border-border/50">
                <CardTitle className="text-base flex items-center"><Building2 className="mr-2 h-5 w-5 text-primary" /> Informations Fabricant</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Laboratoire</p>
                    <p className="text-sm font-semibold text-foreground">SANOFI AVENTIS</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Pays d'origine</p>
                    <p className="text-sm font-semibold text-foreground">France</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ONGLET 2: LOCALISATION */}
        <TabsContent value="location" className="mt-0 focus-visible:ring-0 focus-visible:outline-none">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Traçabilité Physique</CardTitle>
              <CardDescription>Position exacte du produit dans l'échantillothèque.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 bg-muted/20 p-6 rounded-xl border border-border/50">
                <div className="bg-primary/10 p-4 rounded-full">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-background">Magasin Central</Badge>
                    <ArrowLeft className="h-3 w-3 rotate-180 text-muted-foreground" />
                    <Badge variant="outline" className="bg-background">Zone A (Stockage froid)</Badge>
                    <ArrowLeft className="h-3 w-3 rotate-180 text-muted-foreground" />
                    <Badge variant="outline" className="bg-background border-primary text-primary">Armoire 2, Étagère 4</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Dernière vérification physique lors de l'inventaire du 01/07/2026.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Autres onglets (Mockés pour l'exemple) */}
        <TabsContent value="history" className="mt-0 focus-visible:ring-0">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Aucun mouvement enregistré récemment.</CardContent></Card>
        </TabsContent>
        <TabsContent value="documents" className="mt-0 focus-visible:ring-0">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Aucun certificat d'analyse attaché.</CardContent></Card>
        </TabsContent>
        <TabsContent value="comments" className="mt-0 focus-visible:ring-0">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Espace de discussion vide.</CardContent></Card>
        </TabsContent>
        <TabsContent value="audit" className="mt-0 focus-visible:ring-0">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Journal de sécurité chiffré.</CardContent></Card>
        </TabsContent>

      </Tabs>
    </div>
  )
}
