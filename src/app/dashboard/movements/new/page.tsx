"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import { ArrowLeft, Save, ArrowRightLeft, Search, AlertCircle, CheckCircle2, ChevronDown, Upload, Paperclip, FileText, Eye, ShieldCheck, RotateCcw, TrendingDown, TrendingUp, MapPin, ClipboardList } from "lucide-react"

// --- COMPOSANT RECHERCHABLE POUR ÉCHANTILLON ---
function SearchableSampleSelect({
  samples,
  value,
  onChange
}: {
  samples: any[],
  value: string,
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedSample = samples.find(s => s.id === value)

  const filteredSamples = samples.filter(s => {
    if (!query) return true
    const q = query.toUpperCase()
    const num = (s.sample_number || s.id || '').toUpperCase()
    const name = (s.commercial_name || '').toUpperCase()
    const batch = (s.batch_number || '').toUpperCase()
    return num.includes(q) || name.includes(q) || batch.includes(q)
  })

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <Input
          type="text"
          placeholder="TAPEZ POUR RECHERCHER PAR N° D'ÉCHANTILLON, NOM OU LOT..."
          value={open ? query : (selectedSample ? `${selectedSample.sample_number || selectedSample.id} — ${selectedSample.commercial_name} (LOT: ${selectedSample.batch_number || 'N/A'})` : query)}
          onFocus={() => {
            setOpen(true)
            setQuery("")
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          className="pl-9 pr-10 h-11 text-xs bg-background border-border/80 shadow-2xs font-medium cursor-text uppercase"
        />
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange("")
              setQuery("")
              setOpen(false)
            }}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs font-bold"
          >
            ✕
          </button>
        ) : (
          <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 w-full mt-1 bg-card border border-border/80 rounded-lg shadow-lg max-h-64 overflow-y-auto p-1.5 space-y-1">
            {filteredSamples.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground font-medium">
                Aucun échantillon ne correspond à votre recherche "{query}"
              </div>
            ) : (
              filteredSamples.map((s) => (
                <div
                  key={s.id}
                  onClick={() => {
                    onChange(s.id)
                    setOpen(false)
                  }}
                  className={`p-2.5 rounded-md text-xs cursor-pointer hover:bg-muted/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 transition-colors border border-transparent ${
                    value === s.id ? "bg-[#1B5C2E]/10 border-[#1B5C2E]/30 font-bold" : ""
                  }`}
                >
                  <div className="truncate uppercase">
                    <span className="font-bold font-mono text-foreground">{s.sample_number || s.id}</span>
                    {" — "}
                    <span className="font-extrabold text-[#1B5C2E] uppercase">{s.commercial_name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    LOT: <span className="font-semibold text-foreground">{s.batch_number || 'N/A'}</span> — EXP: <span className="font-semibold text-destructive">{s.expiry_date || '2028-12-31'}</span> — Stock: <strong className="text-foreground">{s.quantity} {s.unit || ''}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// --- SCHEMA ZOD ---
const formSchema = z.object({
  sample_id: z.string().min(1, "Veuillez sélectionner un échantillon"),
  movement_type: z.string().min(1, "Type de mouvement requis"),
  quantity: z.coerce.number().min(1, "La quantité doit être d'au moins 1").optional(),
  destination_location: z.string().optional(),
  reason: z.string().min(1, "Le motif est requis"),
  observations: z.string().optional(),
}).superRefine((data, ctx) => {
  if (["Déplacer vers autre localisation", "Transfert"].includes(data.movement_type) && !data.destination_location) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La destination est requise pour un déplacement.",
      path: ["destination_location"]
    });
  }
  if (data.movement_type === "Correction d'inventaire" && data.reason.trim().length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Une justification détaillée est obligatoire pour une correction.",
      path: ["reason"]
    });
  }
});

// Calcul aperçu du stock après mouvement
function computeStockPreview(sample: any, values: z.infer<typeof formSchema>) {
  let newQuantity = sample.quantity;
  let newStatus = sample.status;
  let newLocation = sample.current_location;
  const mvtQty = values.quantity || 0;

  if (["Sortie", "Expression de besoin"].includes(values.movement_type)) {
    newQuantity -= mvtQty;
  } else if (["Transfert vers Magasin des déchets", "Destruction"].includes(values.movement_type)) {
    newQuantity -= mvtQty;
    if (newQuantity <= 0) { newQuantity = 0; newStatus = "Magasin des déchets"; }
  } else if (["Contrôle qualité", "Retour d'analyse"].includes(values.movement_type)) {
    newQuantity += mvtQty;
  } else if (values.movement_type === "Correction d'inventaire") {
    newQuantity = mvtQty;
  } else if (values.movement_type === "Mise en quarantaine") {
    newStatus = "En quarantaine";
  } else if (values.movement_type === "Libération de quarantaine") {
    newStatus = "Disponible";
  } else if (["Déplacer vers autre localisation", "Transfert"].includes(values.movement_type)) {
    newLocation = values.destination_location || newLocation;
  }

  return { newQuantity, newStatus, newLocation };
}

export default function NewMovementPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [proofFile, setProofFile] = useState<{ name: string, size?: string, url?: string } | null>(null);
  // step: 'form' | 'preview'
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchSamples() {
      let remoteSamples: any[] = []
      try {
        const { data } = await supabase.from('samples').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) remoteSamples = data
      } catch (e) {
        console.warn("Erreur Supabase samples:", e)
      }

      const defaultSamples = [
        { id: 'sample-1', sample_number: 'ECH-2026-8832', commercial_name: 'AMOXICILLINE 500MG', batch_number: 'LOT-8832', expiry_date: '2028-11-30', quantity: 150, unit: 'Boîtes', status: 'Disponible', current_location: 'MAG-A1-E3' },
        { id: 'sample-2', sample_number: 'ECH-2026-1192', commercial_name: 'PARACÉTAMOL 1G', batch_number: 'LOT-1192', expiry_date: '2027-08-15', quantity: 50, unit: 'Flacons', status: 'Disponible', current_location: 'MAG-A2-E1' },
        { id: 'sample-3', sample_number: 'ECH-2026-9920', commercial_name: 'IBUPROFÈNE 400MG', batch_number: 'LOT-9920', expiry_date: '2027-05-20', quantity: 20, unit: 'Boîtes', status: 'En quarantaine', current_location: 'QUAR-01' },
        { id: 'sample-4', sample_number: 'ECH-2026-7331', commercial_name: 'CÉFOTAXIME 1G', batch_number: 'LOT-7331', expiry_date: '2028-03-10', quantity: 10, unit: 'Ampoules', status: 'Disponible', current_location: 'MAG-A3-E2' },
        { id: 'sample-5', sample_number: 'ECH-2026-4410', commercial_name: 'ARTEMETHER + LUMEFANTRINE 80/480MG', batch_number: 'LOT-4410', expiry_date: '2029-01-31', quantity: 200, unit: 'Boîtes', status: 'Disponible', current_location: 'MAG-B1-E4' },
      ]

      let localSamples: any[] = []
      try {
        const historyRecords = JSON.parse(localStorage.getItem('reception_history_records') || '[]')
        const deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
        historyRecords.forEach((rec: any) => {
          if (deletedIds.includes(rec.rec_number) || deletedIds.includes(rec.id)) return
          const rawDetails = localStorage.getItem('reception_draft_details_' + rec.rec_number)
          if (rawDetails) {
            const parsed = JSON.parse(rawDetails)
            if (parsed.formData && parsed.formData.samples) {
              parsed.formData.samples.forEach((s: any, idx: number) => {
                if (s.commercial_name && s.commercial_name.trim() !== '') {
                  localSamples.push({
                    id: `local-sample-${rec.rec_number}-${idx}`,
                    sample_number: `ECH-${rec.rec_number.replace('REC-', '')}-${idx + 1}`,
                    commercial_name: s.commercial_name.toUpperCase(),
                    batch_number: (s.batch || 'LOT-TEMP').toUpperCase(),
                    expiry_date: s.expiry_date || s.expiryDate || s.exp_date || '2028-12-31',
                    quantity: Number(s.qty) || 1,
                    unit: s.unit || 'Boîtes',
                    status: 'Disponible',
                    current_location: 'Magasin Central (Zone A)',
                  })
                }
              })
            }
          }
        })
      } catch (e) {}

      const sampleMap = new Map<string, any>()
      defaultSamples.forEach(s => sampleMap.set(s.id, s))
      localSamples.forEach(s => sampleMap.set(s.id, s))
      remoteSamples.forEach(s => sampleMap.set(s.id || s.sample_number, s))

      // Appliquer les mises à jour de stock issues des mouvements validés
      try {
        const overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
        const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]')

        sampleMap.forEach((sample, key) => {
          const comboKey = sample.commercial_name && sample.batch_number 
            ? `${sample.commercial_name.toUpperCase()}___${sample.batch_number.toUpperCase()}`
            : null;

          let override = overrides[key] || 
                         (sample.id ? overrides[sample.id] : null) || 
                         (sample.sample_number ? overrides[sample.sample_number] : null) ||
                         (sample.commercial_name ? overrides[sample.commercial_name.toUpperCase()] : null) ||
                         (comboKey ? overrides[comboKey] : null);

          if (!override && localMovements.length > 0) {
            const matchingMvt = localMovements.find((m: any) => {
              if (m.sample_id && sample.id && m.sample_id === sample.id) return true;
              if (m.sample_number && sample.sample_number && m.sample_number === sample.sample_number) return true;
              if (m.commercial_name && sample.commercial_name && m.commercial_name.toUpperCase() === sample.commercial_name.toUpperCase()) {
                if (!m.batch_number || !sample.batch_number || m.batch_number.toUpperCase() === sample.batch_number.toUpperCase()) {
                  return true;
                }
              }
              return false;
            });

            if (matchingMvt && typeof matchingMvt.new_quantity === 'number') {
              override = {
                quantity: matchingMvt.new_quantity,
                status: matchingMvt.new_status || sample.status,
                current_location: matchingMvt.new_location || sample.current_location
              };
            }
          }

          if (override) {
            sampleMap.set(key, { 
              ...sample, 
              quantity: override.quantity !== undefined ? Number(override.quantity) : sample.quantity,
              status: override.status || sample.status,
              current_location: override.current_location || sample.current_location
            });
          }
        });
      } catch (e) {
        console.warn("Error applying stock overrides in form:", e);
      }

      setSamples(Array.from(sampleMap.values()))
    }
    fetchSamples();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      movement_type: "",
      quantity: 1,
      destination_location: "",
      reason: "",
      observations: "",
    },
  });

  const mvtType = form.watch("movement_type");
  const isQuantityModifying = ["Sortie", "Expression de besoin", "Contrôle qualité", "Retour d'analyse", "Transfert vers Magasin des déchets", "Destruction", "Correction d'inventaire"].includes(mvtType);

  const currentSampleId = form.watch("sample_id");
  useEffect(() => {
    if (currentSampleId) {
      const s = samples.find(x => x.id === currentSampleId);
      setSelectedSample(s);
    } else {
      setSelectedSample(null);
    }
  }, [currentSampleId, samples]);

  // ÉTAPE 1 : Valider le formulaire et passer à l'aperçu
  const handleSaveAndPreview = async (values: z.infer<typeof formSchema>) => {
    if (!selectedSample) { toast.error("Veuillez sélectionner un échantillon valide."); return; }
    if (values.movement_type === "Expression de besoin" && !proofFile) {
      toast.error("Veuillez joindre la fiche d'expression de besoin comme preuve de l'opération.");
      return;
    }
    const mvtQty = values.quantity || 0;
    if (["Sortie", "Expression de besoin", "Transfert vers Magasin des déchets"].includes(values.movement_type) && mvtQty > selectedSample.quantity) {
      toast.error(`La quantité demandée (${mvtQty}) dépasse le stock disponible (${selectedSample.quantity} ${selectedSample.unit || ''}) !`);
      return;
    }
    setPendingValues(values);
    setStep('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ÉTAPE 2 : Valider définitivement et impacter le stock
  const handleValidate = async () => {
    if (!pendingValues || !selectedSample) return;
    setIsSaving(true);

    try {
      const values = pendingValues;
      const { newQuantity, newStatus, newLocation } = computeStockPreview(selectedSample, values);
      const mvtQty = values.quantity || 0;
      const isQtyModifying = ["Sortie", "Expression de besoin", "Contrôle qualité", "Retour d'analyse", "Transfert vers Magasin des déchets", "Destruction", "Correction d'inventaire"].includes(values.movement_type);

      const mvtData: any = {
        id: `mvt-${Date.now()}`,
        mvt_number: `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        sample_id: selectedSample.id,
        sample_number: selectedSample.sample_number || selectedSample.id,
        commercial_name: selectedSample.commercial_name,
        batch_number: selectedSample.batch_number,
        movement_type: values.movement_type,
        quantity: isQtyModifying ? mvtQty : selectedSample.quantity,
        source_location: selectedSample.current_location,
        destination_location: ["Déplacer vers autre localisation", "Transfert"].includes(values.movement_type) ? values.destination_location : null,
        reason: values.reason,
        observations: values.observations || "",
        proof_file_name: proofFile ? proofFile.name : null,
        movement_date: new Date().toISOString(),
        operator: "MARIE ADANDE",
        status: "Validé",
        new_quantity: newQuantity,
        new_status: newStatus,
        new_location: newLocation,
      };

      // 1. Sauvegarde locale immédiate du mouvement
      try {
        const localMovements = JSON.parse(localStorage.getItem('local_movements_history') || '[]');
        localMovements.unshift(mvtData);
        localStorage.setItem('local_movements_history', JSON.stringify(localMovements));
      } catch (e) { console.warn("LocalStorage save error:", e); }

      // 1b. Persister l'override de stock pour cet échantillon sous toutes ses clés d'accès
      try {
        const overrides = JSON.parse(localStorage.getItem('local_sample_overrides') || '{}')
        const overrideData = {
          quantity: newQuantity,
          status: newStatus,
          current_location: newLocation,
        }
        if (selectedSample.id) overrides[selectedSample.id] = overrideData;
        if (selectedSample.sample_number) overrides[selectedSample.sample_number] = overrideData;
        if (selectedSample.commercial_name) overrides[selectedSample.commercial_name.toUpperCase()] = overrideData;
        if (selectedSample.commercial_name && selectedSample.batch_number) {
          const comboKey = `${selectedSample.commercial_name.toUpperCase()}___${selectedSample.batch_number.toUpperCase()}`;
          overrides[comboKey] = overrideData;
        }
        localStorage.setItem('local_sample_overrides', JSON.stringify(overrides))
      } catch (e) { console.warn("Override save error:", e); }

      // 2. Sync Supabase si UUID valide
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedSample.id);
      if (isUUID) {
        try {
          await supabase.from('movements').insert({
            mvt_number: mvtData.mvt_number,
            sample_id: selectedSample.id,
            movement_type: values.movement_type,
            quantity: mvtData.quantity,
            source_location: mvtData.source_location,
            destination_location: mvtData.destination_location,
            reason: values.reason,
            observations: values.observations,
          });
          await supabase.from('samples').update({
            quantity: newQuantity,
            status: newStatus,
            current_location: newLocation,
          }).eq('id', selectedSample.id);
        } catch (e) { console.warn("Supabase sync warning:", e); }
      }

      toast.success(`✅ Mouvement "${values.movement_type}" validé et stock mis à jour avec succès !`);
      router.push("/dashboard/movements");
    } catch (error: any) {
      console.error("Erreur validation mouvement:", error);
      toast.error(error.message || "Impossible de valider le mouvement.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDU APERÇU ---
  if (step === 'preview' && pendingValues && selectedSample) {
    const preview = computeStockPreview(selectedSample, pendingValues);
    const mvtQty = pendingValues.quantity || 0;
    const isQtyModifying = ["Sortie", "Expression de besoin", "Contrôle qualité", "Retour d'analyse", "Transfert vers Magasin des déchets", "Destruction", "Correction d'inventaire"].includes(pendingValues.movement_type);
    const stockDiff = preview.newQuantity - selectedSample.quantity;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-[900px] mx-auto pb-20">

        {/* HEADER APERÇU */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setStep('form')} className="h-10 w-10 shrink-0 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Eye className="h-5 w-5 text-amber-600" />
                Aperçu du Mouvement
              </h2>
              <p className="text-muted-foreground text-xs">Vérifiez les informations avant validation définitive</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStep('form')} className="gap-2 text-xs h-9">
              <RotateCcw className="h-3.5 w-3.5" />
              Modifier
            </Button>
            <Button
              onClick={handleValidate}
              disabled={isSaving}
              className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-md gap-2 font-bold"
            >
              <ShieldCheck className="h-4 w-4" />
              {isSaving ? "Validation en cours..." : "Valider le mouvement"}
            </Button>
          </div>
        </div>

        {/* BADGE STATUT */}
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/60 rounded-xl">
          <Eye className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-sm text-amber-800 dark:text-amber-400">Mouvement en attente de validation</p>
            <p className="text-xs text-amber-700 dark:text-amber-500">Ce mouvement n'est pas encore confirmé. Vérifiez les détails ci-dessous puis cliquez sur <strong>Valider le mouvement</strong> pour appliquer les incidences sur le stock.</p>
          </div>
        </div>

        {/* RÉCAPITULATIF DU MOUVEMENT */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
            <CardTitle className="flex items-center text-lg gap-2">
              <ClipboardList className="h-5 w-5 text-[#1B5C2E]" />
              Récapitulatif du mouvement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">

            {/* Infos échantillon */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Échantillon</p>
                <p className="font-black text-sm text-foreground uppercase">{selectedSample.commercial_name}</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedSample.sample_number}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Lot & Péremption</p>
                <p className="font-bold text-sm">{selectedSample.batch_number}</p>
                <p className="text-xs text-destructive font-semibold">Exp: {selectedSample.expiry_date || '2028-12-31'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Type d'opération</p>
                <Badge className="bg-[#1B5C2E] text-white text-xs">{pendingValues.movement_type}</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Localisation Source</p>
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {selectedSample.current_location || "Non définie"}
                </p>
              </div>
              {pendingValues.destination_location && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Destination</p>
                  <p className="font-semibold text-sm flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#1B5C2E]" />
                    {pendingValues.destination_location}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Motif</p>
                <p className="text-sm font-medium">{pendingValues.reason}</p>
              </div>
              {pendingValues.observations && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Observations</p>
                  <p className="text-sm text-muted-foreground">{pendingValues.observations}</p>
                </div>
              )}
              {proofFile && (
                <div className="space-y-1 sm:col-span-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Fiche jointe</p>
                  <div className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded-md border border-border">
                    <FileText className="h-4 w-4 text-[#1B5C2E]" />
                    <span className="font-semibold">{proofFile.name}</span>
                    {proofFile.size && <span className="text-muted-foreground">({proofFile.size})</span>}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* INCIDENCES SUR LE STOCK */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                Incidences sur le Stock après Validation
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* Avant */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 text-center">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Stock Avant</p>
                  <p className="text-2xl font-black text-foreground">{selectedSample.quantity}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedSample.unit || 'unités'}</p>
                </div>
                {/* Opération */}
                <div className="p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1 bg-amber-50 dark:bg-amber-950/20 border-amber-300/60">
                  {isQtyModifying ? (
                    <>
                      {stockDiff < 0 ? (
                        <TrendingDown className="h-5 w-5 text-destructive" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      )}
                      <p className="text-lg font-black" style={{ color: stockDiff < 0 ? 'hsl(var(--destructive))' : '#1B5C2E' }}>
                        {stockDiff > 0 ? '+' : ''}{stockDiff}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{pendingValues.movement_type}</p>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                      <p className="text-[10px] text-center text-muted-foreground font-bold">{pendingValues.movement_type}</p>
                    </>
                  )}
                </div>
                {/* Après */}
                <div className={`p-3 rounded-xl border text-center ${preview.newQuantity <= 0 ? 'bg-destructive/10 border-destructive/40' : 'bg-[#1B5C2E]/10 border-[#1B5C2E]/40'}`}>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Stock Après</p>
                  <p className={`text-2xl font-black ${preview.newQuantity <= 0 ? 'text-destructive' : 'text-[#1B5C2E]'}`}>
                    {preview.newQuantity}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{selectedSample.unit || 'unités'}</p>
                </div>
              </div>
              {/* Changement de statut / localisation */}
              {(preview.newStatus !== selectedSample.status || preview.newLocation !== selectedSample.current_location) && (
                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  {preview.newStatus !== selectedSample.status && (
                    <div className="flex items-center gap-1.5 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <span className="text-muted-foreground">Statut :</span>
                      <Badge variant="outline" className="text-[10px]">{selectedSample.status}</Badge>
                      <span>→</span>
                      <Badge className="bg-blue-600 text-white text-[10px]">{preview.newStatus}</Badge>
                    </div>
                  )}
                  {preview.newLocation !== selectedSample.current_location && (
                    <div className="flex items-center gap-1.5 p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Localisation :</span>
                      <span className="font-semibold">{selectedSample.current_location}</span>
                      <span>→</span>
                      <span className="font-bold text-purple-700 dark:text-purple-400">{preview.newLocation}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* BOUTONS EN BAS */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => setStep('form')} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Modifier le formulaire
          </Button>
          <Button
            onClick={handleValidate}
            disabled={isSaving}
            className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-lg gap-2 font-bold px-8"
          >
            <ShieldCheck className="h-4 w-4" />
            {isSaving ? "Validation en cours..." : "Valider et appliquer au stock"}
          </Button>
        </div>
      </div>
    );
  }

  // --- RENDU FORMULAIRE ---
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-[900px] mx-auto pb-20">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/movements"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Nouveau Mouvement</h2>
            <p className="text-muted-foreground text-xs">Déclarer un transfert, une sortie ou un retour</p>
          </div>
        </div>
        <Button type="button" onClick={form.handleSubmit(handleSaveAndPreview)} disabled={isSaving} className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-md gap-2 font-bold">
          <Eye className="h-4 w-4" /> Enregistrer & Visualiser
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSaveAndPreview)} className="space-y-6">

          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg"><ArrowRightLeft className="mr-2 h-5 w-5 text-primary" /> Détails du mouvement</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6 pt-6">

              {/* ÉCHANTILLON */}
              <FormField control={form.control} name="sample_id" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel className="font-bold text-xs">Sélectionner l'Échantillon <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <SearchableSampleSelect
                      samples={samples}
                      value={field.value || ""}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* INFO ECHANTILLON */}
              {selectedSample && (
                <div className="sm:col-span-2 p-4 bg-primary/5 rounded-lg border border-primary/20 flex gap-4 items-center">
                  <AlertCircle className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <h4 className="font-semibold uppercase">{selectedSample.commercial_name} <Badge variant="outline" className="ml-2">{selectedSample.status}</Badge></h4>
                    <p className="text-sm text-muted-foreground">
                      Lot: <strong className="text-foreground">{selectedSample.batch_number}</strong> | Stock Actuel: <strong className="text-foreground">{selectedSample.quantity} {selectedSample.unit}</strong> | Date de péremption: <strong className="text-destructive font-bold">{selectedSample.expiry_date || '2028-12-31'}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">Localisation: <strong className="text-foreground">{selectedSample.current_location || "Non définie"}</strong></p>
                  </div>
                </div>
              )}

              {/* TYPE DE MOUVEMENT */}
              <FormField control={form.control} name="movement_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type d'opération</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Sortie">Sortie</SelectItem>
                      <SelectItem value="Expression de besoin">Expression de besoin (Demande personnel)</SelectItem>
                      <SelectItem value="Déplacer vers autre localisation">Déplacer vers autre localisation</SelectItem>
                      <SelectItem value="Contrôle qualité">Contrôle qualité</SelectItem>
                      <SelectItem value="Mise en quarantaine">Mise en quarantaine</SelectItem>
                      <SelectItem value="Libération de quarantaine">Libération de quarantaine</SelectItem>
                      <SelectItem value="Transfert vers Magasin des déchets">Transfert vers Magasin des déchets</SelectItem>
                      <SelectItem value="Correction d'inventaire">Correction d'inventaire</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* QUANTITÉ */}
              {isQuantityModifying && (
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-xs flex items-center justify-between">
                      <span>{mvtType === "Correction d'inventaire" ? "Nouvelle quantité absolue" : "Quantité concernée"}</span>
                      {selectedSample && ["Sortie", "Expression de besoin", "Transfert vers Magasin des déchets"].includes(mvtType) && (
                        <span className="text-muted-foreground font-normal text-[11px]">
                          (Stock dispo max : <strong className="text-[#1B5C2E] font-bold">{selectedSample.quantity} {selectedSample.unit || ''}</strong>)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max={selectedSample && ["Sortie", "Expression de besoin", "Transfert vers Magasin des déchets"].includes(mvtType) ? selectedSample.quantity : undefined}
                        {...field}
                        onChange={(e) => {
                          let val = Number(e.target.value);
                          const maxVal = selectedSample?.quantity;
                          if (selectedSample && ["Sortie", "Expression de besoin", "Transfert vers Magasin des déchets"].includes(mvtType) && maxVal && val > maxVal) {
                            val = maxVal;
                            e.target.value = String(maxVal);
                            toast.error(`Quantité supérieure refusée ! La valeur a été ramenée au stock disponible (${maxVal} ${selectedSample.unit || ''}).`);
                          }
                          field.onChange(val);
                        }}
                        onInput={(e: any) => {
                          let val = Number(e.target.value);
                          const maxVal = selectedSample?.quantity;
                          if (selectedSample && ["Sortie", "Expression de besoin", "Transfert vers Magasin des déchets"].includes(mvtType) && maxVal && val > maxVal) {
                            e.target.value = String(maxVal);
                            form.setValue("quantity", maxVal);
                            toast.error(`Saisie refusée ! Quantité maximale en stock : ${maxVal} ${selectedSample.unit || ''}`);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* DESTINATION */}
              {["Déplacer vers autre localisation", "Transfert"].includes(mvtType) && (
                <FormField control={form.control} name="destination_location" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nouveau Code Emplacement</FormLabel>
                    <FormControl>
                      <Input placeholder="" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* FICHE EXPRESSION DE BESOIN */}
              {mvtType === "Expression de besoin" && (
                <div className="sm:col-span-2 space-y-2 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg border border-emerald-300/60 dark:border-emerald-800/60">
                  <div className="flex items-center justify-between">
                    <FormLabel className="font-bold text-xs flex items-center gap-2 text-[#1B5C2E]">
                      <Paperclip className="h-4 w-4 text-[#1B5C2E]" />
                      Fiche d'Expression de besoin (Preuve requise) <span className="text-destructive">*</span>
                    </FormLabel>
                    <span className="text-[11px] text-muted-foreground">PDF, PNG, JPG ou DOC (max 10 Mo)</span>
                  </div>
                  {proofFile ? (
                    <div className="flex items-center justify-between p-3 bg-card rounded-md border border-border text-xs shadow-2xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                        <span className="font-bold text-foreground truncate">{proofFile.name}</span>
                        {proofFile.size && <span className="text-[10px] text-muted-foreground font-mono">({proofFile.size})</span>}
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setProofFile(null)} className="h-7 text-xs text-destructive hover:bg-destructive/10 font-medium">
                        Supprimer la fiche
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-xs font-bold ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#1B5C2E] hover:bg-[#154824] text-white h-9 px-4 py-2 shadow-2xs">
                        <Upload className="mr-2 h-4 w-4" /> Joindre la fiche d'expression de besoin
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
                              setProofFile({ name: file.name, size: sizeStr, url: URL.createObjectURL(file) });
                              toast.success(`Fiche "${file.name}" jointe avec succès !`);
                            }
                          }}
                        />
                      </label>
                      <span className="text-xs text-muted-foreground italic">Demande d'échantillon formalisée par le personnel</span>
                    </div>
                  )}
                </div>
              )}

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Motif de l'opération <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="observations" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observations complémentaires (Optionnel)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notes supplémentaires..." className="h-20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            </CardContent>
          </Card>

          {/* BOUTON EN BAS DU FORMULAIRE */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href="/dashboard/movements">
                <ArrowLeft className="h-4 w-4" /> Annuler
              </Link>
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-lg gap-2 font-bold px-8"
            >
              <Eye className="h-4 w-4" />
              Enregistrer & Visualiser
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}
