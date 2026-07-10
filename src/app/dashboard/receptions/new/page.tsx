"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { 
  ArrowLeft, Save, Building2, FileSignature, Truck, CheckSquare, 
  Box, Paperclip, ShieldCheck, MessageSquare, Plus, Trash2, Printer, Download, UploadCloud, CheckCircle2
} from "lucide-react"

// --- ZOD SCHEMA ---
const formSchema = z.object({
  // 1. Info Réception
  rec_number: z.string(),
  date_reception: z.string().min(1, "Date requise"),
  time_reception: z.string().min(1, "Heure requise"),
  ref_document: z.string().min(1, "Référence requise"),
  type_reception: z.string().min(1, "Type requis"),
  inspector: z.string().min(1, "Inspecteur requis"),
  status: z.string(),

  // 2. Provenance
  supplier: z.string().min(1, "Fournisseur requis"),
  manufacturer: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),

  // 3. Transport
  carrier: z.string().optional(),
  package_number: z.string().optional(),
  total_packages: z.coerce.number().optional(),
  received_packages: z.coerce.number().optional(),
  shipping_date: z.string().optional(),
  arrival_date: z.string().optional(),
  transport_mode: z.string().optional(),

  // 4. Conformité
  check_packaging: z.boolean().default(false),
  check_boxes: z.boolean().default(false),
  check_seals: z.boolean().default(false),
  check_qty: z.boolean().default(false),
  check_docs: z.boolean().default(false),
  check_damage: z.boolean().default(false),
  check_conform: z.boolean().default(false),
  obs_general: z.string().optional(),
  anomalies: z.string().optional(),
  measures: z.string().optional(),

  // 5. Échantillons (Dynamic Array)
  samples: z.array(z.object({
    commercial_name: z.string().min(1, "Requis"),
    dci: z.string().min(1, "Requis"),
    form: z.string().optional(),
    dosage: z.string().optional(),
    presentation: z.string().optional(),
    batch: z.string().min(1, "Requis"),
    mfg_date: z.string().optional(),
    exp_date: z.string().min(1, "Requis"),
    qty: z.coerce.number().min(1, "> 0"),
    unit: z.string().optional(),
    category: z.string().optional(),
  })),


  // 7. Validation
  validator_name: z.string().optional(),
  validator_role: z.string().optional(),
  validation_date: z.string().optional(),
  decision: z.string().optional(),
  decision_reason: z.string().optional(),

  // 8. Commentaires
  global_comments: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((data.decision === "Rejetée" || data.decision === "Acceptée avec réserve") && !data.decision_reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Le motif est obligatoire pour cette décision.",
      path: ["decision_reason"]
    });
  }
});

export default function NewReceptionPage() {
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      rec_number: "REC-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
      date_reception: new Date().toISOString().split('T')[0],
      time_reception: new Date().toTimeString().split(' ')[0].substring(0, 5),
      status: "En attente",
      samples: [{ commercial_name: "", dci: "", batch: "", exp_date: "", qty: 1 }],
      check_packaging: false,
      check_boxes: false,
      check_seals: false,
      check_qty: false,
      check_docs: false,
      check_damage: false,
      check_conform: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "samples",
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    
    try {
      // 1. Inserer la réception
      const { error: receptionError } = await supabase.from('receptions').insert({
        rec_number: values.rec_number,
        date_reception: values.date_reception,
        time_reception: values.time_reception,
        ref_document: values.ref_document,
        type_reception: values.type_reception,
        inspector: values.inspector,
        status: values.status,
        supplier: values.supplier,
        manufacturer: values.manufacturer,
        country: values.country,
        city: values.city,
        contact_person: values.contact_person,
        phone: values.phone,
        email: values.email,
        carrier: values.carrier,
        package_number: values.package_number,
        total_packages: values.total_packages,
        received_packages: values.received_packages,
        shipping_date: values.shipping_date || null,
        arrival_date: values.arrival_date || null,
        transport_mode: values.transport_mode,
        check_packaging: values.check_packaging,
        check_boxes: values.check_boxes,
        check_seals: values.check_seals,
        check_qty: values.check_qty,
        check_docs: values.check_docs,
        check_damage: values.check_damage,
        check_conform: values.check_conform,
        anomalies: values.anomalies,
        measures: values.measures,
        validator_name: values.validator_name,
        validator_role: values.validator_role,
        validation_date: values.validation_date || null,
        decision: values.decision,
        decision_reason: values.decision_reason,
        global_comments: values.global_comments,
      });

      if (receptionError) throw receptionError;

      // 2. Inserer les échantillons
      if (values.samples && values.samples.length > 0) {
        const samplesToInsert = values.samples.map(sample => ({
          sample_number: `ECH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          reception_ref: values.rec_number,
          commercial_name: sample.commercial_name,
          dci: sample.dci,
          form: sample.form,
          dosage: sample.dosage,
          presentation: sample.presentation,
          batch_number: sample.batch,
          mfg_date: sample.mfg_date || null,
          expiry_date: sample.exp_date,
          quantity: sample.qty,
          unit: sample.unit,
          category: sample.category,
          status: 'À localiser'
        }));

        const { data: insertedSamples, error: samplesError } = await supabase.from('samples').insert(samplesToInsert).select();
        if (samplesError) throw samplesError;

        if (insertedSamples && insertedSamples.length > 0) {
          const movementsToInsert = insertedSamples.map(sample => ({
            mvt_number: `MVT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
            sample_id: sample.id,
            movement_type: 'Entrée',
            quantity: sample.quantity,
            reason: 'Réception initiale',
            observations: `Création automatique suite à la réception ${values.rec_number}`,
          }));
          const { error: mvtError } = await supabase.from('movements').insert(movementsToInsert);
          if (mvtError) throw mvtError;
        }
      }

      toast.success("Réception validée et échantillons générés avec succès !");
      router.push("/dashboard/receptions");
    } catch (error: any) {
      console.error("Erreur d'insertion:", error);
      toast.error(`Erreur: ${error.message || "Impossible de sauvegarder la réception."}`);
    } finally {
      setIsSaving(false);
    }
  };

  const onDraft = () => {
    toast.info("Brouillon sauvegardé automatiquement.");
  }

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-[1400px] mx-auto pb-20">
      
      {/* BARRE D'ACTIONS (Header Fixe) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/80 backdrop-blur-md p-4 rounded-xl border border-border/50 shadow-sm sticky top-20 z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0 rounded-full">
            <Link href="/dashboard/receptions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Nouvelle Réception</h2>
            <p className="text-muted-foreground text-xs">Formulaire de contrôle et d'enregistrement</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Button type="button" variant="ghost" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Imprimer</Button>
          <Button type="button" variant="ghost"><Download className="mr-2 h-4 w-4" /> PDF</Button>
          <Button type="button" variant="secondary" onClick={onDraft}><Save className="mr-2 h-4 w-4" /> Brouillon</Button>
          <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSaving} className="shadow-md">
            {isSaving ? "Traitement..." : <><CheckCircle2 className="mr-2 h-4 w-4" /> Valider la réception</>}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* 1. INFORMATIONS DE LA RÉCEPTION */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><FileSignature className="mr-2 h-5 w-5 text-primary" /> 1. Informations de la réception</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
                <FormField control={form.control} name="rec_number" render={({ field }) => (
                  <FormItem><FormLabel>N° Réception</FormLabel><FormControl><Input {...field} disabled className="bg-muted/50 font-mono" /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="type_reception" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Inspection">Inspection</SelectItem>
                        <SelectItem value="Depot">Dépôt</SelectItem>
                        <SelectItem value="Livraison">Livraison standard</SelectItem>
                        <SelectItem value="Echantillonnage">Échantillonnage terrain</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="date_reception" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="time_reception" render={({ field }) => (
                  <FormItem><FormLabel>Heure</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ref_document" render={({ field }) => (
                  <FormItem><FormLabel>Réf. Document (BL, Facture...)</FormLabel><FormControl><Input placeholder="BL-2026-..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="inspector" render={({ field }) => (
                  <FormItem><FormLabel>Inspecteur / Agent</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* 2. PROVENANCE */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><Building2 className="mr-2 h-5 w-5 text-primary" /> 2. Provenance</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
                <FormField control={form.control} name="supplier" render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Fournisseur / Laboratoire</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner ou saisir..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Sanofi Aventis">Sanofi Aventis</SelectItem>
                        <SelectItem value="Pfizer">Pfizer</SelectItem>
                        <SelectItem value="Moderna">Moderna</SelectItem>
                        <SelectItem value="OMS">OMS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="manufacturer" render={({ field }) => (
                  <FormItem><FormLabel>Fabricant (si différent)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem><FormLabel>Pays d'origine</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="contact_person" render={({ field }) => (
                  <FormItem><FormLabel>Personne de contact</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </CardContent>
            </Card>

            {/* 3. TRANSPORT */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><Truck className="mr-2 h-5 w-5 text-primary" /> 3. Informations sur le transport</CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4 pt-6">
                <FormField control={form.control} name="carrier" render={({ field }) => (
                  <FormItem><FormLabel>Transporteur</FormLabel><FormControl><Input placeholder="Ex: DHL, Interne..." {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="transport_mode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moyen de transport</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Aerien">Aérien</SelectItem>
                        <SelectItem value="Terrestre">Terrestre (Camion frigorifique)</SelectItem>
                        <SelectItem value="Maritime">Maritime</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="package_number" render={({ field }) => (
                  <FormItem><FormLabel>N° de colis (Tracking)</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <div className="flex gap-4">
                  <FormField control={form.control} name="received_packages" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Colis Reçus</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="total_packages" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Colis Total</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* 4. CONFORMITÉ */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><CheckSquare className="mr-2 h-5 w-5 text-primary" /> 4. Contrôle de conformité</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-3 bg-muted/20 p-4 rounded-lg border border-border/50">
                  {[
                    { name: "check_packaging", label: "Emballage intact" },
                    { name: "check_boxes", label: "Colis conformes" },
                    { name: "check_seals", label: "Scellés conformes" },
                    { name: "check_qty", label: "Quantité conforme" },
                    { name: "check_docs", label: "Documents conformes" },
                    { name: "check_damage", label: "Aucun dommage constaté" },
                  ].map((chk) => (
                    <FormField key={chk.name} control={form.control} name={chk.name as any} render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        <FormLabel className="font-normal cursor-pointer">{chk.label}</FormLabel>
                      </FormItem>
                    )} />
                  ))}
                  <FormField control={form.control} name="check_conform" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 col-span-2 pt-2 border-t border-border/50 mt-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" /></FormControl>
                      <FormLabel className="font-bold text-emerald-600 cursor-pointer">RÉCEPTION GLOBALE CONFORME</FormLabel>
                    </FormItem>
                  )} />
                </div>
                <div className="space-y-3">
                  <FormField control={form.control} name="anomalies" render={({ field }) => (
                    <FormItem><FormLabel>Anomalies constatées</FormLabel><FormControl><Textarea className="h-16" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="measures" render={({ field }) => (
                    <FormItem><FormLabel>Mesures prises</FormLabel><FormControl><Textarea className="h-16" {...field} /></FormControl></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* 5. ÉCHANTILLONS REÇUS (TABLEAU DYNAMIQUE) */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="bg-primary/5 border-b border-border/50 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center text-lg"><Box className="mr-2 h-5 w-5 text-primary" /> 5. Échantillons reçus</CardTitle>
                  <CardDescription className="mt-1">Saisie multiple des produits contenus dans cette réception.</CardDescription>
                </div>
                <Badge variant="outline" className="text-sm px-3 py-1 bg-background">Total Produits : {fields.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="min-w-[200px]">Nom commercial / DCI</TableHead>
                      <TableHead className="min-w-[150px]">Forme & Dosage</TableHead>
                      <TableHead className="min-w-[150px]">N° Lot & Péremption</TableHead>
                      <TableHead className="min-w-[120px]">Quantité</TableHead>
                      <TableHead className="w-[80px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((item, index) => (
                      <TableRow key={item.id} className="align-top">
                        <TableCell className="space-y-2">
                          <FormField control={form.control} name={`samples.${index}.commercial_name`} render={({ field }) => (
                            <FormItem><FormControl><Input placeholder="Nom commercial..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`samples.${index}.dci`} render={({ field }) => (
                            <FormItem><FormControl><Input placeholder="DCI..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </TableCell>
                        <TableCell className="space-y-2">
                          <FormField control={form.control} name={`samples.${index}.form`} render={({ field }) => (
                            <FormItem><FormControl><Input placeholder="Ex: Comprimé..." {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={form.control} name={`samples.${index}.dosage`} render={({ field }) => (
                            <FormItem><FormControl><Input placeholder="Ex: 500mg..." {...field} /></FormControl></FormItem>
                          )} />
                        </TableCell>
                        <TableCell className="space-y-2">
                          <FormField control={form.control} name={`samples.${index}.batch`} render={({ field }) => (
                            <FormItem><FormControl><Input placeholder="Lot N°..." {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`samples.${index}.exp_date`} render={({ field }) => (
                            <FormItem><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                        </TableCell>
                        <TableCell className="space-y-2">
                          <FormField control={form.control} name={`samples.${index}.qty`} render={({ field }) => (
                            <FormItem><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`samples.${index}.unit`} render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Unité" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="Boite">Boîte</SelectItem>
                                  <SelectItem value="Flacon">Flacon</SelectItem>
                                  <SelectItem value="Ampoule">Ampoule</SelectItem>
                                  <SelectItem value="Seringue">Seringue</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        </TableCell>
                        <TableCell className="text-center pt-4">
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button type="button" variant="outline" className="mt-4 border-dashed border-2 w-full bg-muted/10 hover:bg-muted/30" onClick={() => append({ commercial_name: "", dci: "", batch: "", exp_date: "", qty: 1 })}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter un produit à cette réception
              </Button>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* 6. DOCUMENTS JOINTS */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><Paperclip className="mr-2 h-5 w-5 text-primary" /> 6. Documents joints</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border-2 border-dashed border-border/50 rounded-xl p-8 flex flex-col items-center justify-center bg-muted/10 text-muted-foreground hover:bg-muted/20 transition-colors cursor-pointer">
                  <UploadCloud className="h-10 w-10 mb-3 text-primary/50" />
                  <p className="font-medium text-foreground">Glissez-déposez vos fichiers ici</p>
                  <p className="text-sm mt-1 mb-4">BL, Facture, Certificats d'analyse (PDF, JPG, PNG)</p>
                  <Button type="button" variant="secondary" size="sm">Parcourir les fichiers</Button>
                </div>
              </CardContent>
            </Card>

            {/* 7. VALIDATION */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><ShieldCheck className="mr-2 h-5 w-5 text-primary" /> 7. Validation Officielle</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 pt-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="validator_name" render={({ field }) => (
                    <FormItem><FormLabel>Responsable validation</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="validation_date" render={({ field }) => (
                    <FormItem><FormLabel>Date de validation</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="decision" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Décision finale</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner une décision" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Acceptée">Acceptée</SelectItem>
                        <SelectItem value="Acceptée avec réserve">Acceptée avec réserve</SelectItem>
                        <SelectItem value="Rejetée">Rejetée</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {form.watch("decision") && form.watch("decision") !== "Acceptée" && (
                  <FormField control={form.control} name="decision_reason" render={({ field }) => (
                    <FormItem><FormLabel className="text-destructive">Motif (Obligatoire)</FormLabel><FormControl><Textarea className="border-destructive/50" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
              </CardContent>
            </Card>

            {/* 8. COMMENTAIRES */}
            <Card className="shadow-sm border-border/50">
              <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <CardTitle className="flex items-center text-lg"><MessageSquare className="mr-2 h-5 w-5 text-primary" /> 8. Commentaires généraux</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <FormField control={form.control} name="global_comments" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observations complémentaires</FormLabel>
                    <FormControl><Textarea placeholder="Notes libres relatives à cette réception..." className="min-h-[150px]" {...field} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

          </div>
        </form>
      </Form>
    </div>
  )
}
