"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Box, Trash2, Printer, MapPin, Archive, Download, FileText, Scan } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { createClient } from "@/utils/supabase/client"
import { generateQRCodeDataUrl } from "@/utils/qrCode"
import { printLabel, downloadLabelPDF } from "@/utils/printUtils"

export default function WasteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [wasteBatch, setWasteBatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchWasteBatch() {
      const { data, error } = await supabase
        .from('waste_batches')
        .select(`
          *,
          sample:samples(commercial_name, batch_number),
          creator:users!created_by(first_name, last_name)
        `)
        .eq('id', resolvedParams.id)
        .single()
      
      if (data) {
        setWasteBatch(data)
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eged-abmed.gov.bj'
        const url = `${origin}/dashboard/waste/${resolvedParams.id}`
        const qrUrl = await generateQRCodeDataUrl(url)
        setQrCodeUrl(qrUrl)
      } else {
        toast.error("Lot de déchet introuvable.")
      }
      setLoading(false)
    }
    fetchWasteBatch()
  }, [resolvedParams.id, supabase])

  const handlePrint = () => {
    if (!wasteBatch || !qrCodeUrl) return
    printLabel({
      itemNumber: wasteBatch.batch_number,
      productName: wasteBatch.sample ? `DECHET : ${wasteBatch.sample.commercial_name}` : `DECHET : ${wasteBatch.waste_type}`,
      batchNumber: wasteBatch.sample?.batch_number || 'N/A',
      qrCodeUrl: qrCodeUrl
    })
  }

  const handleDownloadPNG = () => {
    if (!wasteBatch || !qrCodeUrl) return
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `qrcode_dechet_${wasteBatch.batch_number}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("QR Code PNG téléchargé avec succès !")
  }

  const handleDownloadPDF = () => {
    if (!wasteBatch || !qrCodeUrl) return
    downloadLabelPDF({
      itemNumber: wasteBatch.batch_number,
      productName: wasteBatch.sample ? `DECHET : ${wasteBatch.sample.commercial_name}` : `DECHET : ${wasteBatch.waste_type}`,
      batchNumber: wasteBatch.sample?.batch_number || 'N/A',
      qrCodeUrl: qrCodeUrl
    })
    toast.success("Étiquette PDF téléchargée avec succès !")
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement...</div>
  if (!wasteBatch) return null

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-6xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/waste"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Lot {wasteBatch.batch_number}
              <Badge variant="outline" className="ml-2 bg-background">{wasteBatch.status}</Badge>
            </h2>
            <p className="text-muted-foreground text-xs">Déclaré le {new Date(wasteBatch.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2 cursor-pointer"><Printer className="h-4 w-4" /> Imprimer l&apos;étiquette</Button>
          {wasteBatch.status === 'Détruit' && (
            <Button variant="secondary" className="gap-2"><Archive className="h-4 w-4" /> Voir le certificat</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Waste details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="text-lg flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive" /> Informations du Déchet</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type de déchet</p>
                  <p className="text-base font-semibold">{wasteBatch.waste_type}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantité / Poids</p>
                    <p className="text-base">{wasteBatch.quantity} {wasteBatch.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Localisation</p>
                    <p className="text-base flex items-center"><MapPin className="h-4 w-4 mr-1 text-muted-foreground"/> {wasteBatch.current_location || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Déclaré par</p>
                  <p className="text-base">{wasteBatch.creator ? `${wasteBatch.creator.first_name} ${wasteBatch.creator.last_name}` : 'Utilisateur système'}</p>
                </div>

                {wasteBatch.observations && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Observations</p>
                    <p className="text-sm bg-muted/30 p-3 rounded-md mt-1 border border-border/50">{wasteBatch.observations}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="text-lg flex items-center"><Box className="mr-2 h-5 w-5 text-primary" /> Origine (Traçabilité)</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {wasteBatch.sample ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 border border-border/50 rounded-lg bg-primary/5">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{wasteBatch.sample.commercial_name}</p>
                        <p className="text-sm text-muted-foreground">Lot d'origine: {wasteBatch.sample.batch_number}</p>
                        <Button variant="link" className="p-0 h-auto mt-2 text-primary" asChild>
                          <Link href={`/dashboard/samples/${wasteBatch.sample_id}`}>Voir l'échantillon source &rarr;</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-muted/20 rounded-lg text-muted-foreground border border-dashed border-border/50">
                    Ce déchet n'est pas lié à un échantillon spécifique de l'inventaire.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                  <img src={qrCodeUrl} alt="Waste QR Code" className="w-40 h-40" />
                ) : (
                  <div className="w-40 h-40 bg-muted/30 animate-pulse rounded-lg" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identifiant de Lot</p>
                <p className="text-sm font-mono font-bold bg-muted/50 px-3 py-1.5 rounded-lg border border-border/40 inline-block text-primary">
                  {wasteBatch.batch_number}
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
                Collez cette étiquette standard (60x40mm) sur le bac de stockage pour faciliter l&apos;enregistrement et l&apos;inventaire des déchets.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}
