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

import { ArrowLeft, Save, ArrowRightLeft, FileWarning, Search, AlertCircle, CheckCircle2 } from "lucide-react"

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
      const { data } = await supabase.from('samples').select('*').order('created_at', { ascending: false });
      if (data) setSamples(data);
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
              
              {/* ÉCHANTILLON */}
              <FormField control={form.control} name="sample_id" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Sélectionner l'Échantillon</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Rechercher par n° ou nom..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {samples.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="font-medium">{s.sample_number}</span> - {s.commercial_name} (Lot: {s.batch_number}) - Stock: {s.quantity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
