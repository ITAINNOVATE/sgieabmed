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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"

import { ArrowLeft, Save, ArrowRightLeft, FileWarning, Search, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react"

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
                  <div className="truncate">
                    <span className="font-bold font-mono text-foreground">{s.sample_number || s.id}</span>
                    {" — "}
                    <span className="font-extrabold text-[#1B5C2E]">{s.commercial_name}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">
                    LOT: <span className="font-semibold text-foreground">{s.batch_number || 'N/A'}</span> — Stock: <strong className="text-foreground">{s.quantity} {s.unit || ''}</strong>
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
  quantity: z.coerce.number().min(0, "La quantité ne peut pas être négative").optional(),
  destination_location: z.string().optional(),
  reason: z.string().min(1, "Le motif est requis"),
  observations: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.movement_type === "Transfert" && !data.destination_location) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La destination est requise pour un transfert.",
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

export default function NewMovementPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  
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

      // Échantillons de démonstration par défaut
      const defaultSamples = [
        { id: 'sample-1', sample_number: 'ECH-2026-8832', commercial_name: 'Amoxicilline 500mg', batch_number: 'LOT-8832', quantity: 150, unit: 'Boîtes', status: 'Disponible', current_location: 'MAG-A1-E3' },
        { id: 'sample-2', sample_number: 'ECH-2026-1192', commercial_name: 'Paracétamol 1g', batch_number: 'LOT-1192', quantity: 50, unit: 'Flacons', status: 'Disponible', current_location: 'MAG-A2-E1' },
        { id: 'sample-3', sample_number: 'ECH-2026-9920', commercial_name: 'Ibuprofène 400mg', batch_number: 'LOT-9920', quantity: 20, unit: 'Boîtes', status: 'En quarantaine', current_location: 'QUAR-01' },
        { id: 'sample-4', sample_number: 'ECH-2026-7331', commercial_name: 'Céfotaxime 1g', batch_number: 'LOT-7331', quantity: 10, unit: 'Ampoules', status: 'Disponible', current_location: 'MAG-A3-E2' },
        { id: 'sample-5', sample_number: 'ECH-2026-4410', commercial_name: 'Artemether + Lumefantrine 80/480mg', batch_number: 'LOT-4410', quantity: 200, unit: 'Boîtes', status: 'Disponible', current_location: 'MAG-B1-E4' },
      ]

      // Échantillons issus des réceptions sauvegardées localement
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
                    commercial_name: s.commercial_name,
                    batch_number: s.batch || 'LOT-TEMP',
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

      // Fusionner tous les échantillons sans doublons
      const sampleMap = new Map<string, any>()
      defaultSamples.forEach(s => sampleMap.set(s.id, s))
      localSamples.forEach(s => sampleMap.set(s.id, s))
      remoteSamples.forEach(s => sampleMap.set(s.id || s.sample_number, s))

      const allSamples = Array.from(sampleMap.values())
      setSamples(allSamples)
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

  // Règle: Quantité est-elle requise / modifiable pour ce type de mouvement ?
  const isQuantityModifying = ["Sortie", "Retour d'analyse", "Destruction", "Correction d'inventaire"].includes(mvtType);

  // Mettre à jour l'échantillon sélectionné quand sample_id change
  const currentSampleId = form.watch("sample_id");
  useEffect(() => {
    if (currentSampleId) {
      const s = samples.find(x => x.id === currentSampleId);
      setSelectedSample(s);
    } else {
      setSelectedSample(null);
    }
  }, [currentSampleId, samples]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedSample) {
      toast.error("Veuillez sélectionner un échantillon valide.");
      return;
    }

    setIsSaving(true);
    
    try {
      let newQuantity = selectedSample.quantity;
      let newStatus = selectedSample.status;
      let newLocation = selectedSample.current_location;
      const mvtQty = values.quantity || 0;

      // --- LOGIQUE METIER (Logique de stock) ---
      if (values.movement_type === "Sortie") {
        if (mvtQty > newQuantity) throw new Error("Stock insuffisant pour cette sortie !");
        newQuantity -= mvtQty;
      } else if (values.movement_type === "Destruction") {
        if (mvtQty > newQuantity) throw new Error("Stock insuffisant pour cette destruction !");
        newQuantity -= mvtQty;
        if (newQuantity === 0) newStatus = "Détruit"; // Optionnel : changer statut si tout est détruit
      } else if (values.movement_type === "Retour d'analyse") {
        newQuantity += mvtQty;
      } else if (values.movement_type === "Correction d'inventaire") {
        // En correction, on demande à l'utilisateur de saisir la "nouvelle" quantité réelle (ou la différence, ici on va dire qu'il saisit la différence)
        // Mais pour simplifier l'UI on peut avoir un champ "Ajustement (+ ou -)".
        // S'il saisit une correction, on va l'appliquer directement comme un delta (si la valeur est positive ou négative).
        // Mais on a restreint à >= 0 dans Zod. On va dire que quantity en correction est la NOUVELLE quantité absolue pour éviter les confusions,
        // ou on laisse l'utilisateur saisir la différence. Prenons Nouvelle Quantité :
        newQuantity = mvtQty;
      } else if (values.movement_type === "Mise en quarantaine") {
        newStatus = "En quarantaine";
      } else if (values.movement_type === "Libération de quarantaine") {
        newStatus = "Disponible";
      } else if (values.movement_type === "Transfert") {
        newLocation = values.destination_location;
      }

      if (newQuantity < 0) throw new Error("Le stock ne peut pas être négatif !");

      // 1. Inserer le mouvement
      const { error: mvtError } = await supabase.from('movements').insert({
        mvt_number: `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        sample_id: selectedSample.id,
        movement_type: values.movement_type,
        quantity: isQuantityModifying ? mvtQty : selectedSample.quantity, // Tracer la qté impactée
        source_location: selectedSample.current_location,
        destination_location: values.movement_type === "Transfert" ? values.destination_location : null,
        reason: values.reason,
        observations: values.observations,
        // user_id et validated_by devraient venir de l'Auth, mais ignorés pour la démo
      });

      if (mvtError) throw mvtError;

      // 2. Mettre à jour l'échantillon
      const { error: sampleError } = await supabase.from('samples').update({
        quantity: newQuantity,
        status: newStatus,
        current_location: newLocation,
      }).eq('id', selectedSample.id);

      if (sampleError) throw sampleError;

      toast.success("Mouvement enregistré avec succès !");
      router.push("/dashboard/movements");
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error.message || "Impossible d'enregistrer le mouvement.");
    } finally {
      setIsSaving(false);
    }
  };

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
        <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="shadow-md">
          {isSaving ? "Enregistrement..." : <><Save className="mr-2 h-4 w-4" /> Enregistrer</>}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
              <CardTitle className="flex items-center text-lg"><ArrowRightLeft className="mr-2 h-5 w-5 text-primary" /> Détails du mouvement</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6 pt-6">
              
              {/* ÉCHANTILLON RECHERCHABLE PAR SAISIE DIRECTE */}
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

              {/* INFO ECHANTILLON (Read Only) */}
              {selectedSample && (
                <div className="sm:col-span-2 p-4 bg-primary/5 rounded-lg border border-primary/20 flex gap-4 items-center">
                  <AlertCircle className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <h4 className="font-semibold">{selectedSample.commercial_name} <Badge variant="outline" className="ml-2">{selectedSample.status}</Badge></h4>
                    <p className="text-sm text-muted-foreground">Lot: {selectedSample.batch_number} | Stock Actuel: <strong className="text-foreground">{selectedSample.quantity} {selectedSample.unit}</strong></p>
                    <p className="text-sm text-muted-foreground">Localisation: {selectedSample.current_location || "Non définie"}</p>
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
                      <SelectItem value="Sortie">Sortie (Analyse, Prêt...)</SelectItem>
                      <SelectItem value="Transfert">Transfert de localisation</SelectItem>
                      <SelectItem value="Retour d'analyse">Retour d'analyse</SelectItem>
                      <SelectItem value="Mise en quarantaine">Mise en quarantaine</SelectItem>
                      <SelectItem value="Libération de quarantaine">Libération de quarantaine</SelectItem>
                      <SelectItem value="Destruction">Destruction</SelectItem>
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
                    <FormLabel>
                      {mvtType === "Correction d'inventaire" ? "Nouvelle quantité absolue" : "Quantité concernée"}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {/* DESTINATION (Uniquement Transfert) */}
              {mvtType === "Transfert" && (
                <FormField control={form.control} name="destination_location" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nouveau Code Emplacement</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: MAG1-A1-E2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Motif de l'opération <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Prélèvement pour analyse labo..." {...field} />
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
        </form>
      </Form>
    </div>
  )
}
