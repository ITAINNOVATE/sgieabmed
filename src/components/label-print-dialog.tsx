"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { 
  Printer, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  Info, 
  Sparkles, 
  FileText,
  Image as ImageIcon
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { generateQRCodeDataUrl } from "@/utils/qrCode"
import { 
  printLabels, 
  downloadLabelsPDF, 
  LabelData, 
  LabelFormat,
  abMedLogoSvg,
  egedLogoSvg,
  getStatusColor
} from "@/utils/printUtils"
import { createClient } from "@/utils/supabase/client"

interface LabelPrintDialogProps {
  isOpen: boolean
  onClose: () => void
  type: 'sample' | 'waste'
  items: Array<{ id: string; [key: string]: any }>
}

export function LabelPrintDialog({ isOpen, onClose, type, items }: LabelPrintDialogProps) {
  const [format, setFormat] = useState<LabelFormat>('60x40')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [enrichedData, setEnrichedData] = useState<LabelData[]>([])
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // 1. Charger les données enrichies (Localisation & Plan de destruction)
  useEffect(() => {
    async function loadData() {
      if (!isOpen || items.length === 0) return
      setLoading(true)
      const supabase = createClient()
      const ids = items.map(it => it.id)
      
      try {
        if (type === 'sample') {
          const { data, error } = await supabase
            .from('samples')
            .select(`
              *,
              shelf:shelves(
                name,
                level,
                cabinet:cabinets(
                  name,
                  zone:zones(
                    name,
                    room:rooms(
                      name
                    )
                  )
                )
              )
            `)
            .in('id', ids)

          if (error) throw error

          const parsed = (data || []).map(row => {
            const shelf = row.shelf as any
            const cabinet = shelf?.cabinet
            const zone = cabinet?.zone
            const room = zone?.room

            return {
              id: row.id,
              itemNumber: row.sample_number,
              productName: row.commercial_name,
              dci: row.dci,
              dosage: row.dosage,
              presentation: row.pharmaceutical_form || row.presentation,
              batchNumber: row.batch_number,
              expiryDate: row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('fr-FR') : undefined,
              status: row.status,
              location: {
                salle: room?.name?.replace(/Salle\s+/gi, '') || 'Labo A',
                zone: zone?.name || 'Stock',
                armoire: cabinet?.name || 'Arm 1',
                etagere: shelf?.name || 'Etg 2',
                position: row.position_details || 'A-1'
              }
            } as LabelData
          })
          setEnrichedData(parsed)
        } else {
          // Type Waste
          const { data, error } = await supabase
            .from('waste_batches')
            .select(`
              *,
              sample:samples(
                id,
                sample_number,
                commercial_name,
                dci,
                dosage,
                presentation,
                batch_number,
                expiry_date
              ),
              destruction_items(
                plan:destruction_plans(
                  plan_number
                )
              )
            `)
            .in('id', ids)

          if (error) throw error

          const parsed = (data || []).map(row => {
            const sample = row.sample as any
            const plan = row.destruction_items?.[0]?.plan as any

            // Tenter de parser la localisation brute si présente
            let salle = 'Déch. A'
            let zone = 'Zone R'
            let armoire = 'Bac 1'
            let etagere = 'N/A'
            let position = 'N/A'

            if (row.current_location) {
              const parts = row.current_location.split(',')
              if (parts[0]) salle = parts[0].trim()
              if (parts[1]) zone = parts[1].trim()
              if (parts[2]) armoire = parts[2].trim()
            }

            return {
              id: row.id,
              itemNumber: row.batch_number,
              productName: sample ? sample.commercial_name : row.waste_type,
              batchNumber: sample ? sample.batch_number : 'N/A',
              status: row.status,
              location: {
                salle,
                zone,
                armoire,
                etagere,
                position
              },
              extraData: {
                category: row.waste_type,
                weight: `${row.quantity} ${row.unit}`,
                declarationDate: new Date(row.created_at).toLocaleDateString('fr-FR'),
                destructionPlan: plan?.plan_number || 'Aucun'
              }
            } as LabelData
          })
          setEnrichedData(parsed)
        }
      } catch (err) {
        console.error("Erreur de chargement des métadonnées d'étiquette:", err)
        toast.error("Impossible de récupérer les localisations réelles.")
        // Fallback avec les données reçues
        const fallback = items.map(it => ({
          id: it.id,
          itemNumber: it.sample_number || it.batch_number || 'Ref',
          productName: it.commercial_name || it.waste_type || 'Produit',
          dci: it.dci,
          dosage: it.dosage,
          presentation: it.pharmaceutical_form || it.presentation,
          batchNumber: it.batch_number || 'N/A',
          expiryDate: it.expiry_date ? new Date(it.expiry_date).toLocaleDateString('fr-FR') : undefined,
          status: it.status || 'Disponible',
          location: {
            salle: 'Labo A',
            zone: 'Stock',
            armoire: 'Arm 1',
            etagere: 'Etg 2',
            position: it.position_details || 'A-1'
          }
        } as LabelData))
        setEnrichedData(fallback)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, items, type])

  // 2. Générer les QR codes pour tous les items du lot
  useEffect(() => {
    async function generateQrs() {
      const qrs: Record<string, string> = {}
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eged-abmed.gov.bj'
      
      for (const item of items) {
        const path = type === 'sample' ? `/dashboard/samples/${item.id}` : `/dashboard/waste/${item.id}`
        const qrUrl = await generateQRCodeDataUrl(`${origin}${path}`)
        qrs[item.id] = qrUrl
      }
      setQrCodes(qrs)
    }

    if (isOpen && items.length > 0) {
      generateQrs()
    }
  }, [isOpen, items, type])

  const handlePrint = () => {
    if (enrichedData.length === 0) return
    printLabels(enrichedData, type, qrCodes, format)
    toast.success("Impression lancée")
  }

  const handleDownloadPDF = () => {
    if (enrichedData.length === 0) return
    downloadLabelsPDF(enrichedData, type, qrCodes, format)
    toast.success("Téléchargement du PDF lancé")
  }

  const handleDownloadPNG = () => {
    const currentItem = enrichedData[currentIndex]
    if (!currentItem) return
    const qrUrl = qrCodes[currentItem.id]
    if (!qrUrl) return

    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `QR_Code_${currentItem.itemNumber}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success("Téléchargement du QR Code (PNG) réussi")
  }

  const currentItem = enrichedData[currentIndex]
  const statusInfo = currentItem ? getStatusColor(currentItem.status) : null
  const dateStr = new Date().toLocaleDateString('fr-FR')
  const isWaste = type === 'waste'

  // Styles de prévisualisation responsive selon le format choisi
  const getPreviewDimensions = () => {
    switch (format) {
      case '50x30': return 'w-[350px] h-[210px]'
      case '60x40': return 'w-[420px] h-[280px]'
      case '100x70': return 'w-[480px] h-[336px]'
      case 'A4': return 'w-[420px] h-[594px] overflow-y-auto p-4 bg-slate-100'
      default: return 'w-[420px] h-[280px]'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl rounded-3xl border border-border/50 shadow-2xl bg-card p-0 overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[75vh]">
        {/* Partie gauche : Prévisualisation interactive */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 p-6 flex flex-col items-center justify-between min-w-0 border-b md:border-b-0 md:border-r border-border/50">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" /> Prévisualisation réglementaire
            </span>
            {enrichedData.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-bold text-foreground font-mono">
                  {currentIndex + 1} / {enrichedData.length}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setCurrentIndex(prev => Math.min(enrichedData.length - 1, prev + 1))}
                  disabled={currentIndex === enrichedData.length - 1}
                  className="h-8 w-8 rounded-lg"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Rendu dynamique de l'étiquette prévisualisée */}
          <div className="flex-1 flex items-center justify-center w-full">
            {loading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <span className="text-xs font-semibold">Récupération des localisations...</span>
              </div>
            ) : currentItem ? (
              format === 'A4' ? (
                // Mode Planche A4
                <div className="border border-slate-300 rounded-xl bg-white shadow-lg p-3 w-[360px] h-[500px] overflow-y-auto space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 border-b pb-1 mb-2 text-center uppercase">Planche A4 (Grille 3 colonnes)</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {enrichedData.map((item, idx) => (
                      <div key={item.id} className={`border p-1.5 rounded bg-white text-[5px] scale-[0.8] origin-top-left overflow-hidden h-[100px] ${idx === currentIndex ? 'ring-2 ring-primary border-transparent' : 'border-slate-200'}`}>
                        {/* Miniature A4 */}
                        <div className="flex items-center justify-between border-b pb-0.5 mb-1">
                          <span className="font-bold font-mono">{item.itemNumber}</span>
                          <span className="text-slate-400">ABMed</span>
                        </div>
                        <div className="font-extrabold text-[6px] truncate mb-0.5">{item.productName.toUpperCase()}</div>
                        <div className="text-[4px] text-slate-500 line-clamp-2">
                          {!isWaste ? `DCI: ${item.dci || '-'} | Lot: ${item.batchNumber}` : `Cat: ${item.extraData?.category}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Mode Rôle thermique (Aperçu à l'échelle)
                <div className={`bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col justify-between p-4 ${getPreviewDimensions()} transition-all duration-300 select-none text-black`}>
                  {/* En-tête */}
                  <div className="flex justify-between items-center border-b pb-1.5" style={{ borderColor: isWaste ? '#F97316' : '#1E40AF' }}>
                    <div className="flex items-center gap-1">
                      <div dangerouslySetInnerHTML={{ __html: abMedLogoSvg }} className="scale-75 origin-left" />
                      <div dangerouslySetInnerHTML={{ __html: egedLogoSvg }} className="scale-75 origin-left" />
                    </div>
                    <div className="text-center flex-1 px-2">
                      <h3 className="m-0 font-extrabold text-[10px] tracking-wider uppercase" style={{ color: isWaste ? '#F97316' : '#1E40AF' }}>
                        {isWaste ? 'LOT DE DÉCHETS PHARMACEUTIQUES' : 'ÉTIQUETTE OFFICIELLE'}
                      </h3>
                      <p className="m-0 text-[5px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                        Plateforme nationale de gestion des échantillons
                      </p>
                    </div>
                    <div className="text-right text-[6px] text-slate-400 font-bold leading-tight">
                      <div>N°: {currentItem.itemNumber}</div>
                      <div>Le: {dateStr}</div>
                    </div>
                  </div>

                  {/* Corps */}
                  <div className="flex flex-1 items-center gap-3 py-2 min-h-0">
                    {/* QR Code gauche */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="bg-white border border-slate-200 rounded-lg p-1 w-16 h-16 shadow-sm">
                        {qrCodes[currentItem.id] ? (
                          <img src={qrCodes[currentItem.id]} alt="QR" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
                        )}
                      </div>
                      <span className="text-[5px] font-extrabold text-slate-400 mt-1 uppercase tracking-wider">Scanner la fiche</span>
                    </div>

                    {/* Informations droite */}
                    <div className="flex flex-col justify-center flex-1 min-w-0 h-full">
                      <h4 className="m-0 font-extrabold text-slate-900 text-sm uppercase leading-tight line-clamp-2 truncate mb-1">
                        {currentItem.productName}
                      </h4>

                      <div className="text-[7.5px] text-slate-600 font-medium leading-relaxed">
                        {!isWaste ? (
                          <>
                            <div><strong className="text-slate-800">DCI :</strong> {currentItem.dci || '-'}</div>
                            <div><strong className="text-slate-800">Lot :</strong> {currentItem.batchNumber} • <strong className="text-slate-800">Périm :</strong> {currentItem.expiryDate || '-'}</div>
                            <div><strong className="text-slate-800">Dos :</strong> {currentItem.dosage || '-'} • <strong className="text-slate-800">Forme :</strong> {currentItem.presentation || '-'}</div>
                          </>
                        ) : (
                          <>
                            <div><strong className="text-slate-800">Catégorie :</strong> {currentItem.extraData?.category}</div>
                            <div><strong className="text-slate-800">Déclaré le :</strong> {currentItem.extraData?.declarationDate}</div>
                            <div><strong className="text-slate-800">Plan Destr :</strong> {currentItem.extraData?.destructionPlan}</div>
                          </>
                        )}
                      </div>

                      {/* Localisation et Statut */}
                      <div className="flex justify-between items-center mt-2 gap-2">
                        <div className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[7px] font-bold text-slate-600 font-mono flex gap-1">
                          {currentItem.location ? (
                            <>
                              <span>S:{currentItem.location.salle}</span>
                              <span>Z:{currentItem.location.zone}</span>
                              <span>A:{currentItem.location.armoire}</span>
                              <span>E:{currentItem.location.etagere}</span>
                              <span>P:{currentItem.location.position}</span>
                            </>
                          ) : (
                            <span>Loc: Non défini</span>
                          )}
                        </div>

                        {statusInfo && (
                          <div className={`px-1.5 py-0.5 rounded-full text-[6.5px] font-extrabold border uppercase tracking-wider ${statusInfo.bg}`}>
                            {statusInfo.text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pied de page */}
                  <div className="border-t border-dashed border-slate-200 pt-1 flex justify-between items-center text-[5.5px] text-slate-400 font-bold uppercase tracking-wider">
                    <span>Autorité Béninoise de Régulation du Médicament</span>
                    <span className="font-mono text-primary">www.abmed.bj</span>
                  </div>
                </div>
              )
            ) : null}
          </div>

          <div className="w-full flex items-center justify-between text-[10px] text-muted-foreground mt-4 border-t pt-3 border-border/50">
            <span className="flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Résolution : 300 dpi minimum</span>
            <span>eGED-ABMed • Système LIMS</span>
          </div>
        </div>

        {/* Partie droite : Configuration & Actions */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between bg-card shrink-0">
          <div className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Printer className="h-5 w-5 text-primary" /> Configuration
              </DialogTitle>
              <DialogDescription>
                Réglez les options d&apos;impression réglementaires.
              </DialogDescription>
            </DialogHeader>

            {/* Sélections des Formats */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" /> Format de l&apos;étiquette
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['50x30', '60x40', '100x70', 'A4'] as LabelFormat[]).map((f) => (
                  <Button
                    key={f}
                    variant={format === f ? 'default' : 'outline'}
                    onClick={() => setFormat(f)}
                    className="h-11 rounded-xl text-xs font-bold shadow-xs border border-border/50"
                  >
                    {f === 'A4' ? 'Planche A4' : `${f} mm`}
                  </Button>
                ))}
              </div>
            </div>

            {/* Infos sur les supports compatibles */}
            <div className="p-4 bg-muted/30 border border-border/40 rounded-2xl text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-bold text-foreground mb-1">Compatibilité imprimantes :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Format rouleau pour Zebra, Brother, Dymo.</li>
                <li>Format Planche A4 pour imprimantes laser.</li>
                <li>Design calibré à 300 DPI pour papier thermique.</li>
              </ul>
            </div>
          </div>

          {/* Boutons d'export/print */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <Button
              onClick={handlePrint}
              disabled={loading || enrichedData.length === 0}
              className="w-full h-11 rounded-xl font-bold gap-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              <Printer className="h-4 w-4" /> Imprimer les étiquettes
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={loading || enrichedData.length === 0}
                className="h-10 rounded-xl text-xs font-bold gap-1.5 shadow-xs border border-border/50"
              >
                <FileText className="h-3.5 w-3.5 text-primary" /> Exporter PDF
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadPNG}
                disabled={loading || enrichedData.length === 0 || format === 'A4'}
                className="h-10 rounded-xl text-xs font-bold gap-1.5 shadow-xs border border-border/50"
                title="Télécharger l'image QR code individuelle"
              >
                <ImageIcon className="h-3.5 w-3.5 text-primary" /> Télécharger QR
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
