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
  Info, Box, Calendar, Activity, Building2, Beaker,
  ArrowRightLeft, ArrowUpRight, ArrowDownRight, CheckCircle2, RotateCcw, Scan
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { Sample } from "../page"
import { generateQRCodeDataUrl } from "@/utils/qrCode"
import { printLabel, downloadLabelPDF } from "@/utils/printUtils"
import { toast } from "sonner"

export default function SampleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [sample, setSample] = useState<Sample | null>(null)
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function fetchSample() {
      const [sampleRes, mvtRes] = await Promise.all([
        supabase.from('samples').select('*').eq('id', resolvedParams.id).single(),
        supabase.from('movements').select('*').eq('sample_id', resolvedParams.id).order('movement_date', { ascending: false })
      ])
      
      if (sampleRes.data) {
        setSample(sampleRes.data)
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eged-abmed.gov.bj'
        const url = `${origin}/dashboard/samples/${resolvedParams.id}`
        const qrUrl = await generateQRCodeDataUrl(url)
        setQrCodeUrl(qrUrl)
      }
      if (mvtRes.data) {
        setMovements(mvtRes.data)
      }
      setLoading(false)
    }
    fetchSample()
  }, [resolvedParams.id, supabase])

  const handlePrint = () => {
    if (!sample || !qrCodeUrl) return
    printLabel({
      itemNumber: sample.sample_number,
      productName: sample.commercial_name || sample.dci,
      batchNumber: sample.batch_number,
      expiryDate: new Date(sample.expiry_date).toLocaleDateString("fr-FR"),
      qrCodeUrl: qrCodeUrl
    })
  }

  const handleDownloadPNG = () => {
    if (!sample || !qrCodeUrl) return
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `qrcode_${sample.sample_number}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("QR Code PNG téléchargé avec succès !")
  }

  const handleDownloadPDF = () => {
    if (!sample || !qrCodeUrl) return
    downloadLabelPDF({
      itemNumber: sample.sample_number,
      productName: sample.commercial_name || sample.dci,
      batchNumber: sample.batch_number,
      expiryDate: new Date(sample.expiry_date).toLocaleDateString("fr-FR"),
      qrCodeUrl: qrCodeUrl
    })
    toast.success("Étiquette PDF téléchargée avec succès !")
  }

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
          <Button variant="outline" size="sm" onClick={handlePrint} className="bg-background cursor-pointer"><Printer className="mr-2 h-4 w-4" /> Imprimer l&apos;étiquette</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tabs Content */}
        <div className="lg:col-span-2">
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

            {/* ONGLET 3: HISTORIQUE DES MOUVEMENTS */}
            <TabsContent value="history" className="mt-0 focus-visible:ring-0">
              <Card className="shadow-sm border-border/50">
                <CardHeader>
                  <CardTitle>Historique des Mouvements</CardTitle>
                  <CardDescription>Tous les événements liés à cet échantillon depuis sa réception.</CardDescription>
                </CardHeader>
                <CardContent>
                  {movements.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-xl">Aucun mouvement enregistré.</div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-border/50">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead>N° Mouvement</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Quantité Impactée</TableHead>
                            <TableHead>Motif</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movements.map((mvt) => (
                            <TableRow key={mvt.id}>
                              <TableCell className="font-medium text-xs">{mvt.mvt_number || mvt.id.substring(0,8)}</TableCell>
                              <TableCell className="text-muted-foreground">{new Date(mvt.movement_date || mvt.created_at || Date.now()).toLocaleString("fr-FR")}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  ["Sortie", "Destruction"].includes(mvt.movement_type) ? 'text-destructive border-destructive/30 bg-destructive/5' : 
                                  ["Entrée", "Retour d'analyse"].includes(mvt.movement_type) ? 'text-emerald-500 border-emerald-500/30 bg-emerald-500/5' : 
                                  mvt.movement_type === 'Mise en quarantaine' ? 'text-warning border-warning/30 bg-warning/5' :
                                  'text-primary border-primary/30 bg-primary/5'
                                }>
                                  {["Sortie", "Destruction"].includes(mvt.movement_type) && <ArrowUpRight className="mr-1 h-3 w-3" />}
                                  {["Entrée", "Retour d'analyse"].includes(mvt.movement_type) && <ArrowDownRight className="mr-1 h-3 w-3" />}
                                  {mvt.movement_type === 'Transfert' && <ArrowRightLeft className="mr-1 h-3 w-3" />}
                                  {mvt.movement_type === 'Mise en quarantaine' && <ShieldAlert className="mr-1 h-3 w-3" />}
                                  {mvt.movement_type === 'Libération de quarantaine' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                                  {mvt.movement_type === "Correction d'inventaire" && <RotateCcw className="mr-1 h-3 w-3" />}
                                  {mvt.movement_type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{mvt.quantity}</TableCell>
                              <TableCell className="text-sm truncate max-w-[200px]" title={mvt.reason}>{mvt.reason || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
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

        {/* Right Column: QR Code & Traçabilité Card */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/50 rounded-2xl sticky top-24">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" /> Identifiant & QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
              <div className="bg-white p-3 rounded-xl border border-border/60 shadow-sm flex items-center justify-center">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Sample QR Code" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 bg-muted/30 animate-pulse rounded-lg" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identifiant Unique</p>
                <p className="text-sm font-mono font-bold bg-muted/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block text-primary">
                  {sample.sample_number}
                </p>
              </div>

              <div className="w-full pt-4 border-t border-border/50 space-y-2">
                <Button 
                  onClick={handlePrint}
                  className="w-full h-10 rounded-xl gap-2 font-semibold shadow-sm cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Imprimer l&apos;étiquette
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadPNG}
                    className="h-9 rounded-xl text-xs gap-1 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadPDF}
                    className="h-9 rounded-xl text-xs gap-1 border-border/60 hover:bg-muted cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Button>
                </div>
              </div>
              
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Collez cette étiquette standard (60x40mm) sur le contenant du produit pour permettre un accès et une traçabilité rapides.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
