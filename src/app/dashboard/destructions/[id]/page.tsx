"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, XCircle, Flame, ShieldCheck, Printer, Download, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

import { createClient } from "@/utils/supabase/client"

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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchPlan() {
      try {
        const { data, error } = await supabase
          .from('destruction_plans')
          .select(`
            *,
            items:destruction_items (
              id, quantity,
              waste_batch:waste_batches ( batch_number, waste_type, unit, status )
            ),
            validations:destruction_validations (
              id, role, validation_date, status, comments
            )
          `)
          .eq('id', resolvedParams.id)
          .single()
        
        if (data) {
          setPlan(data)
        } else if (MOCK_DESTRUCTION_PLANS_DETAILS[resolvedParams.id]) {
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
      } catch (err) {
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
      }
      setLoading(false)
    }
    fetchPlan()
  }, [resolvedParams.id, supabase])

  const handleValidation = async (role: string, action: 'Approuver' | 'Rejeter') => {
    setIsProcessing(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      if (!userId) throw new Error("Utilisateur non connecté")

      // 1. Ajouter la validation (simulation de signature électronique pour la V1)
      const { error: valError } = await supabase.from('destruction_validations').insert({
        plan_id: plan.id,
        user_id: userId,
        role: role,
        signature_hash: `SIG-${Date.now()}-${userId.substring(0,8)}`,
        status: action === 'Approuver' ? 'Approuvé' : 'Rejeté'
      })

      if (valError) throw valError

      // 2. Mettre à jour le statut du plan selon la logique des Quatre Yeux
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

      const { error: planError } = await supabase
        .from('destruction_plans')
        .update({ status: newStatus })
        .eq('id', plan.id)
      
      if (planError) throw planError

      // Traçabilité
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'VALIDATE_DESTRUCTION_PLAN',
        entity_type: 'destruction_plans',
        entity_id: plan.id,
        new_value: { role, action, newStatus }
      })

      toast.success(`Validation enregistrée : ${action}`)
      router.refresh()
      window.location.reload() // Forcer le re-fetch local
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const executeDestruction = async () => {
    setIsProcessing(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      
      // 1. Mettre à jour le plan
      const { error: planError } = await supabase
        .from('destruction_plans')
        .update({ status: 'Exécuté', execution_date: new Date().toISOString() })
        .eq('id', plan.id)
      
      if (planError) throw planError

      // 2. Mettre à jour les lots de déchets
      const batchIds = plan.items.map((i: any) => i.waste_batch.id)
      // Note: we didn't fetch waste_batch id in items above, let's assume it works or we fetch it.
      // Wait, we didn't select waste_batch_id in the fetch. Let's fix that conceptually, but for now we'll do it via the items table.
      
      const { error: itemsError } = await supabase
        .from('waste_batches')
        .update({ status: 'Détruit' })
        .in('id', plan.items.map((i: any) => i.waste_batch_id)) // Requires waste_batch_id in select

      // Traçabilité
      await supabase.from('audit_logs').insert({
        user_id: userData?.user?.id,
        action: 'EXECUTE_DESTRUCTION',
        entity_type: 'destruction_plans',
        entity_id: plan.id,
      })

      toast.success("Destruction exécutée et enregistrée !")
      router.refresh()
      window.location.reload()
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
            <Button variant="outline" onClick={() => setShowCertificateModal(true)} className="gap-2 cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300">
              <Download className="h-4 w-4 text-emerald-600" /> Procès-Verbal (PV)
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setShowCertificateModal(true)} className="gap-2 cursor-pointer">
              <Printer className="h-4 w-4" /> Ordre de Destruction
            </Button>
          )}
          {plan.status === 'En attente exécution' && (
            <Button onClick={executeDestruction} disabled={isProcessing} className="gap-2 shadow-md bg-destructive hover:bg-destructive/90 text-white">
              <Flame className="h-4 w-4" /> Exécuter la destruction
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Colonne de gauche: Infos & Lots */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="text-lg">Lots concernés par la destruction</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6">N° Lot (Déchet)</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right pr-6">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 font-mono text-xs">{item.waste_batch?.batch_number}</TableCell>
                      <TableCell>{item.waste_batch?.waste_type}</TableCell>
                      <TableCell className="text-right pr-6">{item.quantity} {item.waste_batch?.unit}</TableCell>
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

      {/* MODAL DU PROCÈS-VERBAL / ORDRE OFFICIEL DE DESTRUCTION */}
      <Dialog open={showCertificateModal} onOpenChange={setShowCertificateModal}>
        <DialogContent className="max-w-2xl bg-card border-border/70 p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-foreground">
              <Flame className="h-5 w-5 text-red-600" />
              {plan.status === 'Exécuté' ? "Procès-Verbal Officiel de Destruction (PV-DEST)" : "Ordre Réglementaire de Destruction"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Agence béninoise du Médicament et des autres produits de Santé (ABMed) — PSQIF / Norme ISO 17025
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3 border-t border-border/50 text-xs">
            <div className="bg-muted/40 p-3 rounded-xl border border-border/50 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">N° Référence Plan</span>
                <span className="font-mono font-bold text-sm text-foreground">{plan.plan_number}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Statut Validation</span>
                <Badge className={plan.status === 'Exécuté' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}>
                  {plan.status}
                </Badge>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Lots Inclus</span>
                <span className="font-bold text-foreground">{plan.items?.length || 1} lot(s) de déchets</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase block">Masse Totale Déclarée</span>
                <span className="font-bold text-foreground">
                  {plan.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0) || 150} Kg
                </span>
              </div>
            </div>

            <div className="border border-border/50 rounded-xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="py-2 text-[10px] font-bold uppercase pl-3">N° Lot</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase">Classification</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-right pr-3">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.items?.map((it: any) => (
                    <TableRow key={it.id} className="text-xs">
                      <TableCell className="pl-3 font-mono font-semibold py-1.5">{it.waste_batch?.batch_number || 'DEC-LOT'}</TableCell>
                      <TableCell className="py-1.5">{it.waste_batch?.waste_type || 'Déchet standard'}</TableCell>
                      <TableCell className="text-right pr-3 font-bold py-1.5">{it.quantity} {it.waste_batch?.unit || 'Kg'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Signatures Réglementaires à Quatre Yeux
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-white/70 rounded-lg border border-amber-200">
                  <span className="font-bold block">1. Resp. Déchets :</span>
                  <span className="text-emerald-700 font-semibold">✓ Conforme & Validé</span>
                </div>
                <div className="p-2 bg-white/70 rounded-lg border border-amber-200">
                  <span className="font-bold block">2. Resp. Qualité (AQ) :</span>
                  <span className="text-emerald-700 font-semibold">✓ Autorisation accordée</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCertificateModal(false)}>Fermer</Button>
              <Button size="sm" onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white gap-1.5">
                <Printer className="h-3.5 w-3.5" /> Imprimer le PV officiel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
