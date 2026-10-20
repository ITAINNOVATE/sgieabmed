"use client"

import { useState, useEffect, use, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  ArrowLeft, CheckCircle2, XCircle, Flame, ShieldCheck, Printer, 
  Download, Clock, Building2, FileText, Award, Check, Trash2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { createClient } from "@/utils/supabase/client"
import { exportDestructionCertificatePDF } from "@/utils/exportUtils"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"

const MOCK_DESTRUCTION_PLANS_DETAILS: Record<string, any> = {
  '1': {
    id: '1',
    plan_number: 'DES-2026-0042',
    planned_date: '2026-04-10',
    execution_date: null,
    status: 'En préparation',
    items: [
      { id: 'item-1', quantity: 150, waste_batch: { batch_number: 'DEC-2026-73355', waste_type: 'Médicaments périmés', unit: 'Kg', status: 'En attente de destruction' } }
    ],
    validations: []
  },
  '2': {
    id: '2',
    plan_number: 'DES-2026-0038',
    planned_date: '2026-03-20',
    execution_date: null,
    status: 'Validation Qualité',
    items: [
      { id: 'item-2', quantity: 45, waste_batch: { batch_number: 'DEC-2026-88120', waste_type: 'Produits chimiques dangereux', unit: 'L', status: 'En attente de destruction' } },
      { id: 'item-3', quantity: 12, waste_batch: { batch_number: 'DEC-2026-99201', waste_type: 'Flacons cassés', unit: 'Kg', status: 'En attente de destruction' } }
    ],
    validations: [
      { id: 'val-1', role: 'Responsable Déchets', validation_date: '2026-03-18T14:00:00.000Z', status: 'Approuvé', comments: 'Pesée et fûts vérifiés conformes.' }
    ]
  },
  '3': {
    id: '3',
    plan_number: 'DES-2026-0031',
    planned_date: '2026-02-15',
    execution_date: '2026-02-16T14:00:00.000Z',
    status: 'Exécuté',
    items: [
      { id: 'item-4', quantity: 230, waste_batch: { batch_number: 'DEC-2026-11409', waste_type: 'Déchets infectieux (DASRI)', unit: 'Kg', status: 'Détruit' } },
      { id: 'item-5', quantity: 80, waste_batch: { batch_number: 'DEC-2026-44021', waste_type: 'Emballages souillés', unit: 'Kg', status: 'Détruit' } }
    ],
    validations: [
      { id: 'val-2', role: 'Responsable Déchets', validation_date: '2026-02-14T09:30:00.000Z', status: 'Approuvé', comments: 'Lots conformes.' },
      { id: 'val-3', role: 'Responsable Qualité', validation_date: '2026-02-15T11:00:00.000Z', status: 'Approuvé', comments: 'Validation qualité accordée pour incinération.' }
    ]
  },
}

export default function DestructionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedCertStructure, setSelectedCertStructure] = useState("all")
  const router = useRouter()
  const supabase = createClient()

  // Structures représentées dans ce plan de destruction
  const structuresInPlan = useMemo(() => {
    const set = new Set<string>()
    plan?.items?.forEach((it: any) => {
      const s = it.waste_batch?.source_structure
      if (s) set.add(s)
    })
    return Array.from(set)
  }, [plan])

  const handleDownloadCertificatePdf = () => {
    if (!plan) return
    const certNum = plan.certificate_number || `CERT-DEST-${new Date().getFullYear()}-${plan.plan_number?.replace("DES-", "") || "001"}`
    const itemsToCertify = selectedCertStructure === "all"
      ? (plan.items || [])
      : (plan.items || []).filter((it: any) => it.waste_batch?.source_structure === selectedCertStructure)

    const structureName = selectedCertStructure === "all"
      ? (structuresInPlan.length > 0 ? structuresInPlan.join(", ") : "Toutes structures bénéficiaires")
      : selectedCertStructure

    exportDestructionCertificatePDF({
      certificate_number: certNum,
      destruction_date: plan.execution_date ? new Date(plan.execution_date).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
      plan_number: plan.plan_number,
      destruction_method: plan.destruction_method || "Incinération haute température (>1200°C)",
      destruction_site: plan.destruction_site || "Centre d'Incinération Agréé Cotonou",
      source_structure: structureName,
      source_type: "Officine / Grossiste / Établissement de Santé",
      city: "Cotonou",
      supervisor_name: plan.supervisor_name || "Marie ADANDE (Resp. Déchets ABMed)",
      quality_manager_name: "Dr. Christian KOSSOU (Resp. Assurance Qualité)",
      items: itemsToCertify.map((it: any) => ({
        batch_number: it.waste_batch?.batch_number || "N/A",
        waste_type: it.waste_batch?.waste_type || "Déchet pharmaceutique",
        commercial_name: it.waste_batch?.commercial_name || "",
        quantity: it.quantity,
        unit: it.waste_batch?.unit || "Kg",
        reception_number: it.waste_batch?.reception_number || "Bordereau Initial",
      })),
    })
    toast.success("Certificat officiel de destruction téléchargé en PDF !")
  }

  const fetchPlan = useCallback(async () => {
    // 1. Vérifier en priorité dans Supabase Cloud pour la cohérence multi-postes
    try {
      const { data, error } = await supabase
        .from('destruction_plans')
        .select('*')
        .or(`id.eq.${resolvedParams.id},plan_number.eq.${resolvedParams.id}`)
        .maybeSingle()
      
      if (data) {
        const formatted = {
          ...data,
          items: data.items_data && Array.isArray(data.items_data) && data.items_data.length > 0 ? data.items_data : (data.items || []),
        }
        setPlan(formatted)
        setLoading(false)
        return
      }
    } catch (err) {
      console.warn("Supabase fetch destruction plan warning:", err)
    }

    // 2. Fallback localStorage
    try {
      const stored = localStorage.getItem('destruction_plans_custom_v1')
      if (stored) {
        const list = JSON.parse(stored)
        const found = list.find((p: any) => p.id === resolvedParams.id || p.plan_number === resolvedParams.id)
        if (found) {
          setPlan(found)
          setLoading(false)
          return
        }
      }
    } catch (e) {}

    // 3. Fallback mock ou dynamique
    if (MOCK_DESTRUCTION_PLANS_DETAILS[resolvedParams.id]) {
      setPlan(MOCK_DESTRUCTION_PLANS_DETAILS[resolvedParams.id])
    } else {
      setPlan({
        id: resolvedParams.id,
        plan_number: `DES-2026-${resolvedParams.id.substring(0, 4).toUpperCase()}`,
        planned_date: '2026-04-15',
        execution_date: null,
        status: 'En préparation',
        items: [
          { id: 'item-def', quantity: 75, waste_batch: { batch_number: 'DEC-2026-73355', waste_type: 'Médicaments périmés', unit: 'Kg', status: 'En attente de destruction' } }
        ],
        validations: []
      })
    }
    setLoading(false)
  }, [resolvedParams.id, supabase])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  // Synchronisation temps réel automatique du plan et de son exécution
  useRealtimeSync({
    tables: ['destruction_plans', 'waste_batches'],
    onSync: fetchPlan,
    pollIntervalMs: 6000,
  })

  const handleValidation = async (role: string, action: 'Approuver' | 'Rejeter') => {
    setIsProcessing(true)
    try {
      // 1. Calcul du nouveau statut
      let newStatus = plan.status
      if (action === 'Rejeter') {
        newStatus = 'Rejeté'
      } else {
        if (role === 'Responsable Déchets') {
          newStatus = 'Validation Qualité' // Passe à l'étape suivante
        } else if (role === 'Responsable Qualité') {
          newStatus = 'En attente exécution' // Prêt à être détruit
        }
      }

      const newValidation = {
        id: 'val-' + Date.now(),
        role: role,
        validation_date: new Date().toISOString(),
        status: action === 'Approuver' ? 'Approuvé' : 'Rejeté',
        comments: 'Validation réglementaire effectuée.'
      }

      // 2. Mise à jour locale garantie
      try {
        const stored = localStorage.getItem('destruction_plans_custom_v1')
        if (stored) {
          const list = JSON.parse(stored)
          const updated = list.map((p: any) => {
            if (p.id === plan.id || p.plan_number === plan.plan_number) {
              const currentVals = p.validations || []
              return {
                ...p,
                status: newStatus,
                validations: [
                  ...currentVals.filter((v: any) => v.role !== role),
                  newValidation
                ]
              }
            }
            return p
          })
          localStorage.setItem('destruction_plans_custom_v1', JSON.stringify(updated))
        }
      } catch (localErr) {
        console.warn("Erreur mise à jour locale validation:", localErr)
      }

      // 3. Mettre à jour l'état React immédiat
      setPlan((prev: any) => ({
        ...prev,
        status: newStatus,
        validations: [
          ...(prev?.validations?.filter((v: any) => v.role !== role) || []),
          newValidation
        ]
      }))

      // 4. Tentative Supabase en tâche de fond
      try {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData?.user?.id

        if (userId) {
          await supabase.from('destruction_validations').insert({
            plan_id: plan.id,
            user_id: userId,
            role: role,
            signature_hash: `SIG-${Date.now()}-${userId.substring(0,8)}`,
            status: action === 'Approuver' ? 'Approuvé' : 'Rejeté'
          })

          await supabase
            .from('destruction_plans')
            .update({ status: newStatus })
            .eq('id', plan.id)

          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'VALIDATE_DESTRUCTION_PLAN',
            entity_type: 'destruction_plans',
            entity_id: plan.id,
            new_value: { role, action, newStatus }
          })
        }
      } catch (remoteErr) {
        console.warn("Supabase validation skip:", remoteErr)
      }

      toast.success(`Validation enregistrée : ${action}`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const executeDestruction = async () => {
    setIsProcessing(true)
    try {
      const nowIso = new Date().toISOString()
      const certNum = plan.certificate_number || `CERT-DEST-${new Date().getFullYear()}-${plan.plan_number?.replace("DES-", "") || Math.floor(1000 + Math.random() * 9000)}`

      // 1. Mise à jour locale garantie
      try {
        const stored = localStorage.getItem('destruction_plans_custom_v1')
        if (stored) {
          const list = JSON.parse(stored)
          const updated = list.map((p: any) => {
            if (p.id === plan.id || p.plan_number === plan.plan_number) {
              return { 
                ...p, 
                status: 'Exécuté', 
                execution_date: nowIso,
                certificate_number: certNum 
              }
            }
            return p
          })
          localStorage.setItem('destruction_plans_custom_v1', JSON.stringify(updated))
        }

        // Marquer les déchets associés comme détruits et enregistrer la traçabilité
        const storedBatches = localStorage.getItem('waste_batches_custom_v1')
        if (storedBatches) {
          const localBatches = JSON.parse(storedBatches)
          const itemBatchIds = plan.items?.map((it: any) => it.waste_batch_id || it.waste_batch?.id) || []
          const updatedBatches = localBatches.map((b: any) => 
            itemBatchIds.includes(b.id) 
              ? { 
                  ...b, 
                  status: 'Détruit', 
                  destruction_date: nowIso,
                  certificate_number: certNum,
                  destruction_plan_ref: plan.plan_number
                } 
              : b
          )
          localStorage.setItem('waste_batches_custom_v1', JSON.stringify(updatedBatches))
        }
      } catch (localErr) {
        console.warn("Erreur mise à jour locale execution:", localErr)
      }

      // 2. Mettre à jour l'état React immédiat
      setPlan((prev: any) => ({
        ...prev,
        status: 'Exécuté',
        execution_date: nowIso,
        certificate_number: certNum
      }))

      // 3. Tentative Supabase en tâche de fond
      try {
        const { data: userData } = await supabase.auth.getUser()
        
        await supabase
          .from('destruction_plans')
          .update({ 
            status: 'Exécuté', 
            execution_date: nowIso, 
            certificate_number: certNum 
          })
          .or(`id.eq.${plan.id},plan_number.eq.${plan.plan_number}`)

        const batchIds = (plan.items || []).map((i: any) => i.waste_batch_id || i.waste_batch?.id || i.id).filter(Boolean)
        if (batchIds.length > 0) {
          await supabase
            .from('waste_batches')
            .update({ 
              status: 'Détruit',
              destruction_date: nowIso,
              certificate_number: certNum,
              destruction_plan_ref: plan.plan_number 
            })
            .in('id', batchIds)
        }

        // Enregistrer la traçabilité dans la table Supabase waste_movements
        for (const item of (plan.items || [])) {
          const wb = item.waste_batch || item
          try {
            await supabase.from('waste_movements').insert({
              mvt_number: `MVT-DEST-${wb.batch_number?.replace('DEC-', '') || Math.floor(10000 + Math.random() * 90000)}`,
              date: nowIso,
              type: 'Destruction effectuée',
              batch: wb.batch_number,
              waste_type: wb.waste_type || 'Déchets pharmaceutiques',
              commercial_name: wb.commercial_name || '',
              quantity: `${item.quantity || wb.quantity || 1} ${wb.unit || 'Kg'}`,
              operator: plan.supervisor_name || 'Marie ADANDE (Resp. Déchets)',
              origin: wb.current_location || 'Zone de Quarantaine - Déchets',
              destination: plan.destruction_site || 'Centre d\'Incinération Agréé',
              certificate_number: certNum,
              source_structure: wb.source_structure || '',
              reception_number: wb.reception_number || '',
              signature_hash: `SIG-DEST-${certNum}`,
            })
          } catch (mErr) {
            console.warn("Échec insertion mvt destruction Supabase:", mErr)
          }
        }

        if (userData?.user?.id) {
          await supabase.from('audit_logs').insert({
            user_id: userData?.user?.id,
            action: 'EXECUTE_DESTRUCTION',
            entity_type: 'destruction_plans',
            entity_id: plan.id,
            new_value: { certificate_number: certNum, execution_date: nowIso }
          })
        }
      } catch (remoteErr) {
        console.warn("Supabase execute skip:", remoteErr)
      }

      toast.success("Destruction exécutée avec succès ! Les déchets sont sortis du stock.")
      setShowCertificateModal(true)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement du plan de destruction...</div>
  if (!plan) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-destructive font-bold">Plan de destruction introuvable.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/destructions"><ArrowLeft className="mr-2 h-4 w-4" /> Retour aux plans de destruction</Link>
        </Button>
      </div>
    )
  }

  const isRespDechetsValidated = plan.validations?.some((v: any) => v.role === 'Responsable Déchets' && v.status === 'Approuvé')
  const isQualiteValidated = plan.validations?.some((v: any) => v.role === 'Responsable Qualité' && v.status === 'Approuvé')

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/destructions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Plan de Destruction {plan.plan_number}
              <Badge variant="outline" className="ml-2 bg-background">{plan.status}</Badge>
            </h2>
            <p className="text-muted-foreground text-xs">Détails et flux de validation (Principe des Quatre Yeux)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {plan.status === 'Exécuté' ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleDownloadCertificatePdf} 
                className="gap-2 cursor-pointer text-[#1B5C2E] border-[#1B5C2E]/30 hover:bg-[#1B5C2E]/10"
              >
                <Download className="h-4 w-4" /> Certificat PDF
              </Button>
              <Button 
                onClick={() => setShowCertificateModal(true)} 
                className="gap-2 cursor-pointer bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm font-bold"
              >
                <Award className="h-4 w-4" /> Certificat de Destruction
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setShowCertificateModal(true)} className="gap-2 cursor-pointer">
              <Printer className="h-4 w-4" /> Ordre de Destruction
            </Button>
          )}
          {plan.status === 'En attente exécution' && (
            <Button onClick={executeDestruction} disabled={isProcessing} className="gap-2 shadow-md bg-destructive hover:bg-destructive/90 text-white font-bold">
              <Flame className="h-4 w-4" /> Exécuter la destruction & Sortir du stock
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Colonne de gauche: Infos & Lots avec Structures Déposantes */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-primary" />
                  Lots concernés par la destruction ({plan.items?.length || 0})
                </CardTitle>
                {plan.status === 'Exécuté' && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                    Sortis du stock & Archivés
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6 text-[11px] font-bold uppercase">N° Lot (Déchet)</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase">Structure Déposante</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase">Classification & Produits</TableHead>
                    <TableHead className="text-right pr-6 text-[11px] font-bold uppercase">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.items?.map((item: any) => (
                    <TableRow key={item.id} className="text-xs">
                      <TableCell className="pl-6 font-mono font-bold text-foreground">
                        {item.waste_batch?.batch_number}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {item.waste_batch?.source_structure ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{item.waste_batch.source_structure}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Dépôt interne ABMed</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{item.waste_batch?.waste_type}</p>
                        {item.waste_batch?.commercial_name && (
                          <p className="text-[10px] text-muted-foreground">{item.waste_batch.commercial_name}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6 font-black tabular-nums text-foreground">
                        {item.quantity} {item.waste_batch?.unit || 'Kg'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Colonne de droite: Workflow de validation */}
        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-orange-50 border-b border-orange-100 pb-4">
              <CardTitle className="text-lg flex items-center text-orange-800"><ShieldCheck className="mr-2 h-5 w-5" /> Circuit d'Approbation</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Etape 1: Resp Déchets */}
              <div className="relative pl-6 pb-6 border-l-2 border-muted">
                <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${isRespDechetsValidated ? 'border-emerald-500 bg-emerald-500' : 'border-orange-500'}`}></div>
                <h4 className="font-semibold text-sm leading-none">1. Validation Opérationnelle</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Responsable Déchets</p>
                
                {isRespDechetsValidated ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="mr-1 h-3 w-3" /> Approuvé</Badge>
                ) : (
                  plan.status === 'En préparation' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" onClick={() => handleValidation('Responsable Déchets', 'Approuver')} disabled={isProcessing}>Approuver</Button>
                      <Button size="sm" variant="outline" className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200" onClick={() => handleValidation('Responsable Déchets', 'Rejeter')} disabled={isProcessing}>Rejeter</Button>
                    </div>
                  )
                )}
              </div>

              {/* Etape 2: Resp Qualité */}
              <div className="relative pl-6 pb-6 border-l-2 border-muted">
                <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${isQualiteValidated ? 'border-emerald-500 bg-emerald-500' : (isRespDechetsValidated ? 'border-orange-500' : 'border-muted')}`}></div>
                <h4 className="font-semibold text-sm leading-none">2. Validation Qualité</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Responsable Qualité (AQ)</p>
                
                {isQualiteValidated ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="mr-1 h-3 w-3" /> Approuvé</Badge>
                ) : (
                  plan.status === 'Validation Qualité' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200" onClick={() => handleValidation('Responsable Qualité', 'Approuver')} disabled={isProcessing}>Approuver (Signer)</Button>
                      <Button size="sm" variant="outline" className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200" onClick={() => handleValidation('Responsable Qualité', 'Rejeter')} disabled={isProcessing}>Rejeter</Button>
                    </div>
                  )
                )}
              </div>

              {/* Etape 3: Exécution */}
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${plan.status === 'Exécuté' ? 'border-destructive bg-destructive' : (isQualiteValidated ? 'border-orange-500' : 'border-muted')}`}></div>
                <h4 className="font-semibold text-sm leading-none">3. Exécution Destruction</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {plan.status === 'Exécuté' 
                    ? (plan.execution_date ? `Exécuté le ${new Date(plan.execution_date).toLocaleDateString('fr-FR')}` : 'Destruction effectuée')
                    : (plan.planned_date ? `Prévue le ${new Date(plan.planned_date).toLocaleDateString('fr-FR')}` : 'Date non planifiée')
                  }
                </p>
                {plan.status === 'Exécuté' && <Badge className="mt-2 bg-destructive/10 text-destructive border-destructive/20"><Flame className="mr-1 h-3 w-3" /> Incinéré / Détruit</Badge>}
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* MODAL DU CERTIFICAT / ATTESTATION OFFICIELLE DE DESTRUCTION */}
      <Dialog open={showCertificateModal} onOpenChange={setShowCertificateModal}>
        <DialogContent className="max-w-4xl sm:max-w-4xl w-[95vw] md:w-full bg-card border-border/70 p-4 sm:p-6 rounded-2xl max-h-[92vh] overflow-y-auto print:max-w-full print:m-0 print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Award className="h-5 w-5 text-[#1B5C2E]" />
                {plan.status === 'Exécuté' 
                  ? "Certificat Officiel de Destruction (Attestation à délivrer à la structure)" 
                  : "Ordre Réglementaire de Destruction"}
              </DialogTitle>
              <Badge className="bg-[#1B5C2E]/10 text-[#1B5C2E] border-[#1B5C2E]/20 text-[10px]">
                {plan.status === 'Exécuté' ? "Sortie de stock certifiée" : "Planification"}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Document officiel certifiant l&apos;élimination irréversible des déchets à remettre à la structure déposante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            
            {/* SÉLECTEUR DE STRUCTURE (SI PLUSIEURS STRUCTURES DANS LE MÊME PLAN) */}
            {plan.status === 'Exécuté' && structuresInPlan.length > 1 && (
              <div className="print:hidden flex items-center justify-between p-3 bg-muted/40 border border-border/60 rounded-xl">
                <span className="text-xs font-semibold text-muted-foreground">Délivrer le certificat pour :</span>
                <Select value={selectedCertStructure} onValueChange={(val) => setSelectedCertStructure(val || "all")}>
                  <SelectTrigger className="h-8 text-xs bg-background w-64">
                    <SelectValue placeholder="Choisir la structure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les structures (Consolidé)</SelectItem>
                    {structuresInPlan.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* DOCUMENT OFFICIEL FORMAT CERTIFICAT (A4 PRINTABLE) */}
            <div id="printable-destruction-cert" className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm space-y-5 print:border-none print:p-4 print:shadow-none">
              
              {/* EN-TÊTE OFFICIEL ABMed */}
              <div className="border-b-2 border-[#1B5C2E] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                    RÉPUBLIQUE DU BÉNIN — MINISTÈRE DE LA SANTÉ
                  </p>
                  <h1 className="text-base sm:text-lg font-black text-[#1B5C2E] tracking-tight">
                    AGENCE BÉNINOISE DU MÉDICAMENT (ABMed)
                  </h1>
                  <p className="text-[11px] font-semibold text-slate-700">
                    Direction de la Gestion des Déchets Pharmaceutiques (PSQIF)
                  </p>
                </div>
                <div className="text-right sm:text-right">
                  <span className="inline-block px-2.5 py-1 rounded bg-[#1B5C2E]/10 border border-[#1B5C2E]/30 text-xs font-mono font-bold text-[#1B5C2E]">
                    {plan.certificate_number || `CERT-DEST-2026-${plan.plan_number?.replace('DES-', '') || '001'}`}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Date : {plan.execution_date ? new Date(plan.execution_date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* TITRE DU CERTIFICAT */}
              <div className="text-center py-1.5 bg-slate-50 rounded border border-slate-200">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                  CERTIFICAT OFFICIEL DE DESTRUCTION DE DÉCHETS PHARMACEUTIQUES
                </h2>
              </div>

              {/* GRILLE 2 CADRES : STRUCTURE & OPÉRATION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                
                {/* CADRE 1 : STRUCTURE BÉNÉFICIAIRE */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">
                    1. Structure / Établissement Bénéficiaire
                  </p>
                  <p className="pt-1">
                    <span className="text-slate-500">Établissement :</span>{" "}
                    <strong className="text-slate-900">
                      {selectedCertStructure === 'all' 
                        ? (structuresInPlan.length > 0 ? structuresInPlan.join(', ') : 'Établissements Mandataires')
                        : selectedCertStructure}
                    </strong>
                  </p>
                  <p><span className="text-slate-500">Réf. Plan ABMed :</span> <span className="font-mono font-semibold">{plan.plan_number}</span></p>
                  <p><span className="text-slate-500">Localité :</span> Cotonou / République du Bénin</p>
                  <p><span className="text-slate-500">Statut :</span> <strong className="text-emerald-700">Détruit & Radié des stocks</strong></p>
                </div>

                {/* CADRE 2 : DÉTAILS DE L'OPÉRATION */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">
                    2. Modalités d&apos;Élimination
                  </p>
                  <p className="pt-1"><span className="text-slate-500">Méthode :</span> {plan.destruction_method || "Incinération haute température (>1200°C)"}</p>
                  <p><span className="text-slate-500">Site :</span> {plan.destruction_site || "Centre d'Incinération Agréé Cotonou"}</p>
                  <p><span className="text-slate-500">Contrôle :</span> Procédure réglementaire à Quatre Yeux</p>
                  <p><span className="text-slate-500">Superviseur :</span> {plan.supervisor_name || "Marie ADANDE (Resp. Déchets)"}</p>
                </div>

              </div>

              {/* TABLEAU DES DÉCHETS DÉTRUITS */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  3. Inventaire des Lots de Déchets Neutralisés
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-300 rounded overflow-hidden">
                    <thead className="bg-[#1B5C2E] text-white text-[11px]">
                      <tr>
                        <th className="p-2 border-r border-[#1B5C2E]/30 whitespace-nowrap">N° Lot Déchet</th>
                        <th className="p-2 border-r border-[#1B5C2E]/30">Structure Apportrice</th>
                        <th className="p-2 border-r border-[#1B5C2E]/30">Classification & Produits</th>
                        <th className="p-2 text-right whitespace-nowrap">Quantité Détruite</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(selectedCertStructure === 'all'
                        ? (plan.items || [])
                        : (plan.items || []).filter((it: any) => it.waste_batch?.source_structure === selectedCertStructure)
                      ).map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            {item.waste_batch?.batch_number}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-800 font-medium">
                            {item.waste_batch?.source_structure || "Dépôt direct"}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <p className="font-semibold text-slate-900">{item.waste_batch?.waste_type}</p>
                            {item.waste_batch?.commercial_name && (
                              <p className="text-[10px] text-slate-600">{item.waste_batch.commercial_name}</p>
                            )}
                          </td>
                          <td className="p-2 text-right font-black text-slate-900 whitespace-nowrap">
                            {item.quantity} {item.waste_batch?.unit || 'Kg'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan={3} className="p-2 text-right border-r border-slate-300">
                          MASSE TOTALE DÉTRUITE :
                        </td>
                        <td className="p-2 text-right font-black text-[#1B5C2E] whitespace-nowrap">
                          {(selectedCertStructure === 'all'
                            ? (plan.items || [])
                            : (plan.items || []).filter((it: any) => it.waste_batch?.source_structure === selectedCertStructure)
                          ).reduce((acc: number, it: any) => acc + (Number(it.quantity) || 0), 0).toFixed(2)} Kg/Unités
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ATTESTATION LÉGALE DE DESTRUCTION ET SORTIE DE STOCK */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 text-[11px] leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="h-4 w-4 text-[#1B5C2E]" />
                  Attestation & Certification Légale de Destruction Définitive
                </p>
                <p>
                  L&apos;Agence Béninoise du Médicament (ABMed) certifie par la présente que les produits et déchets pharmaceutiques ci-dessus décrits ont été intégralement, définitivement et irréversiblement détruits conformément aux normes environnementales et directives sanitaires nationales. Ces lots sont définitivement radiés des registres et stocks. La présente attestation est délivrée à la structure mandataire pour servir et valoir ce que de droit.
                </p>
              </div>

              {/* DOUBLE BLOC DE SIGNATURE OFFICIEL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                
                {/* SIGNATURE RESP DECHETS */}
                <div className="border border-slate-300 rounded-lg p-3 min-h-[110px] flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-slate-900 uppercase text-[10px]">
                      LE RESPONSABLE GESTION DES DÉCHETS
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {plan.supervisor_name || "Marie ADANDE"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Direction de la Gestion des Déchets — ABMed
                    </p>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[9px] text-slate-400">
                    Signature & Cachet officiel
                  </div>
                </div>

                {/* SIGNATURE RESP QUALITÉ */}
                <div className="border border-slate-300 rounded-lg p-3 min-h-[110px] flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-slate-900 uppercase text-[10px]">
                      LE RESPONSABLE ASSURANCE QUALITÉ
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Dr. Christian KOSSOU
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Direction de l&apos;Assurance Qualité — ABMed
                    </p>
                  </div>
                  <div className="border-t border-dashed border-slate-300 pt-1 text-[9px] text-slate-400">
                    Visa de conformité & Cachet
                  </div>
                </div>

              </div>

              {/* PIED DE PAGE */}
              <div className="text-[9px] text-center text-slate-400 pt-2 border-t border-slate-200">
                Document officiel délivré par le Système de Gestion de l&apos;Échantillothèque et des Déchets (SGIE - ABMed) — République du Bénin
              </div>

            </div>

            {/* BOUTONS ACTIONS MODAL */}
            <div className="print:hidden flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setShowCertificateModal(false)}>
                Fermer
              </Button>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDownloadCertificatePdf}
                  className="gap-1.5 text-xs text-[#1B5C2E] border-[#1B5C2E]/30 hover:bg-[#1B5C2E]/10"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger Certificat (PDF)
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs font-bold bg-[#1B5C2E] hover:bg-[#144723] text-white shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimer pour la Structure
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

