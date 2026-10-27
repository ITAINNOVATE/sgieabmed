"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { 
  Building2, Plus, Search, Filter, Phone, Mail, MapPin, 
  Trash2, Package, Boxes, Eye, Download, Copy, Check, Calendar,
  ShieldCheck, FileSpreadsheet, ArrowUpDown, ChevronRight, X, Edit3, Sparkles
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { 
  Center, 
  CENTER_TYPES, 
  getRegisteredCenters, 
  saveCenter, 
  deleteCenter, 
  calculateCentersData, 
  CenterDetailedStats,
  generateNextCenterCode
} from "@/utils/centers-storage"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { exportToExcel, exportWasteReceptionSlipPDF, exportReceptionVoucherPDF } from "@/utils/exportUtils"

export default function CentersPage() {
  const [centers, setCenters] = useState<Center[]>([])
  const [receptions, setReceptions] = useState<any[]>([])
  const [wasteBatches, setWasteBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const hasLoadedOnceRef = useRef(false)

  // Filtres
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [activityFilter, setActivityFilter] = useState("all") // all, waste_only, samples_only, both, inactive

  // Modal création / édition
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCenter, setEditingCenter] = useState<Partial<Center> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Drawer détails centre
  const [selectedCenterStats, setSelectedCenterStats] = useState<CenterDetailedStats | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const supabase = createClient()

  // ─── Chargement des données ────────────────────────────────────────────────
  const loadData = useCallback(async (isInitial = false) => {
    if (isInitial || !hasLoadedOnceRef.current) {
      setLoading(true)
    }
    try {
      // 1. Charger centres
      const fetchedCenters = await getRegisteredCenters()
      setCenters(fetchedCenters)

      // 2. Charger réceptions d'échantillons (local + remote)
      let localRecs: any[] = []
      try {
        const storedRecs = localStorage.getItem("reception_history_records")
        if (storedRecs) localRecs = JSON.parse(storedRecs)
      } catch (e) {}

      let remoteRecs: any[] = []
      try {
        const { data } = await supabase.from("receptions").select("*").order("created_at", { ascending: false })
        if (data) remoteRecs = data
      } catch (e) {}

      const recsMap = new Map<string, any>()
      localRecs.forEach(r => recsMap.set(r.rec_number || r.id, r))
      remoteRecs.forEach(r => recsMap.set(r.rec_number || r.id, r))
      const mergedRecs = Array.from(recsMap.values())
      setReceptions(mergedRecs)

      // 3. Charger lots de déchets (local + remote)
      let localBatches: any[] = []
      try {
        const storedBatches = localStorage.getItem("waste_batches_custom_v1")
        if (storedBatches) localBatches = JSON.parse(storedBatches)
      } catch (e) {}

      let remoteBatches: any[] = []
      try {
        const { data } = await supabase.from("waste_batches").select("*").order("created_at", { ascending: false })
        if (data) remoteBatches = data
      } catch (e) {}

      const batchesMap = new Map<string, any>()
      localBatches.forEach(b => batchesMap.set(b.batch_number || b.id, b))
      remoteBatches.forEach(b => batchesMap.set(b.batch_number || b.id, b))
      const mergedBatches = Array.from(batchesMap.values())
      setWasteBatches(mergedBatches)

    } catch (err) {
      console.warn("Erreur chargement centres & données:", err)
    } finally {
      setLoading(false)
      hasLoadedOnceRef.current = true
    }
  }, [supabase])

  useEffect(() => {
    loadData(true)
  }, [loadData])

  useRealtimeSync({
    tables: ["centers", "receptions", "waste_batches"],
    onSync: () => loadData(false),
    pollIntervalMs: 5000,
  })

  // ─── Consolidation des statistiques par centre ─────────────────────────────
  const consolidatedStats = useMemo(() => {
    return calculateCentersData(centers, receptions, wasteBatches)
  }, [centers, receptions, wasteBatches])

  // ─── Filtrage ─────────────────────────────────────────────────────────────
  const filteredStats = useMemo(() => {
    return consolidatedStats.filter(({ center, samplesReceptionsCount, wasteBatchesCount }) => {
      // Recherche textuelle
      const q = searchQuery.toLowerCase().trim()
      const matchSearch = !q || 
        (center.center_code || "").toLowerCase().includes(q) ||
        (center.name || "").toLowerCase().includes(q) ||
        (center.city || "").toLowerCase().includes(q) ||
        (center.contact_person || "").toLowerCase().includes(q) ||
        (center.phone || "").toLowerCase().includes(q) ||
        (center.center_type || "").toLowerCase().includes(q)

      if (!matchSearch) return false

      // Filtre Type
      if (typeFilter !== "all" && center.center_type !== typeFilter) {
        return false
      }

      // Filtre Activité
      if (activityFilter === "waste_only" && (wasteBatchesCount === 0 || samplesReceptionsCount > 0)) {
        return false
      }
      if (activityFilter === "samples_only" && (samplesReceptionsCount === 0 || wasteBatchesCount > 0)) {
        return false
      }
      if (activityFilter === "both" && (samplesReceptionsCount === 0 || wasteBatchesCount === 0)) {
        return false
      }
      if (activityFilter === "active" && (samplesReceptionsCount === 0 && wasteBatchesCount === 0)) {
        return false
      }

      return true
    })
  }, [consolidatedStats, searchQuery, typeFilter, activityFilter])

  // ─── Métriques Globales ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = centers.length
    const withWaste = consolidatedStats.filter(s => s.wasteBatchesCount > 0).length
    const withSamples = consolidatedStats.filter(s => s.samplesReceptionsCount > 0).length
    const totalWasteKg = consolidatedStats.reduce((acc, s) => acc + s.wasteTotalWeightKg, 0)
    const totalSamples = consolidatedStats.reduce((acc, s) => acc + s.samplesCount, 0)
    const uniqueCities = new Set(centers.map(c => (c.city || "").trim().toUpperCase()).filter(Boolean)).size

    return {
      total,
      withWaste,
      withSamples,
      totalWasteKg: Math.round(totalWasteKg * 10) / 10,
      totalSamples,
      uniqueCities,
    }
  }, [centers, consolidatedStats])

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Identifiant ${code} copié`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleOpenCreateModal = () => {
    const nextCode = generateNextCenterCode(centers)
    setEditingCenter({
      center_code: nextCode,
      name: "",
      center_type: "Officine privée de pharmacie",
      city: "Cotonou",
      country: "Bénin",
      contact_person: "",
      phone: "",
      email: "",
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (center: Center) => {
    setEditingCenter({ ...center })
    setIsModalOpen(true)
  }

  const handleSaveModal = async () => {
    if (!editingCenter?.name?.trim()) {
      toast.error("Le nom de la structure / centre est obligatoire")
      return
    }

    setIsSaving(true)
    try {
      const saved = await saveCenter(editingCenter)
      toast.success(`Centre ${saved.center_code} enregistré avec succès`)
      setIsModalOpen(false)
      setEditingCenter(null)
      await loadData()
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement du centre")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (center: Center) => {
    if (!confirm(`Supprimer le centre ${center.center_code} - ${center.name} ?`)) return
    try {
      await deleteCenter(center.id || center.center_code)
      toast.success(`Centre ${center.center_code} supprimé`)
      if (selectedCenterStats?.center.center_code === center.center_code) {
        setSelectedCenterStats(null)
      }
      await loadData()
    } catch (e) {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleExportAllToExcel = () => {
    const dataToExport = consolidatedStats.map(s => ({
      "Identifiant Unique": s.center.center_code,
      "Nom du Centre / Structure": s.center.name,
      "Type d'Établissement": s.center.center_type,
      "Ville": s.center.city,
      "Pays": s.center.country || "Bénin",
      "Personne de Contact": s.center.contact_person || "-",
      "Téléphone": s.center.phone || "-",
      "Email": s.center.email || "-",
      "Nb Réceptions Échantillons": s.samplesReceptionsCount,
      "Nb Échantillons": s.samplesCount,
      "Nb Lots de Déchets": s.wasteBatchesCount,
      "Poids Déchets (Kg)": s.wasteTotalWeightKg,
      "Dernière Activité": s.lastActivityDate || "Aucune",
      "Date Enregistrement": s.center.created_at ? new Date(s.center.created_at).toLocaleDateString("fr-FR") : "-",
    }))

    const headers = [
      "Identifiant Unique",
      "Nom du Centre / Structure",
      "Type d'Établissement",
      "Ville",
      "Pays",
      "Personne de Contact",
      "Téléphone",
      "Email",
      "Nb Réceptions Échantillons",
      "Nb Échantillons",
      "Nb Lots de Déchets",
      "Poids Déchets (Kg)",
      "Dernière Activité",
      "Date Enregistrement"
    ]

    exportToExcel(dataToExport, headers, `Repertoire-Centres-ABMed-${new Date().getFullYear()}`)
    toast.success("Répertoire des centres exporté en Excel")
  }

  return (
    <div className="space-y-6 pb-12">
      {/* EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1B5C2E]/10 rounded-xl text-[#1B5C2E]">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Répertoire des Centres Apporteurs
              </h1>
              <p className="text-xs text-muted-foreground">
                Attribution automatique des identifiants uniques (CTR-YYYY-XXXX) et consolidation des flux par structure
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportAllToExcel}
            className="h-9 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Exporter Excel
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-9 text-xs font-bold gap-1.5 shadow-md bg-[#1B5C2E] hover:bg-[#154824] text-white"
          >
            <Plus className="h-4 w-4" />
            Nouveau Centre
          </Button>
        </div>
      </div>

      {/* CARTES KPI SYNTHÉTIQUES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="shadow-2xs border-border/70 bg-card">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Centres Enregistrés
              <Building2 className="h-4 w-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-foreground pt-1">
              {metrics.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-[11px] text-muted-foreground">
              Couvrant <span className="font-bold text-foreground">{metrics.uniqueCities}</span> ville(s)
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/70 bg-card">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Apporteurs de Déchets
              <Boxes className="h-4 w-4 text-red-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-red-600 pt-1">
              {metrics.withWaste}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-[11px] text-muted-foreground">
              Total apporté : <span className="font-bold text-foreground">{metrics.totalWasteKg} Kg</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/70 bg-card">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Apporteurs d&apos;Échantillons
              <Package className="h-4 w-4 text-blue-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-blue-600 pt-1">
              {metrics.withSamples}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-[11px] text-muted-foreground">
              Total réceptionné : <span className="font-bold text-foreground">{metrics.totalSamples} éch.</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-border/70 bg-card">
          <CardHeader className="p-3.5 pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              Traçabilité eGED
              <Sparkles className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-[#1B5C2E] pt-1">
              100%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-[11px] text-muted-foreground">
              Identifiant unique garanti dès 1er dépôt
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARRE DE FILTRES ET RECHERCHE */}
      <Card className="shadow-2xs border-border/70 bg-card">
        <CardContent className="p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par identifiant CTR, nom du centre, ville, contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Type d'établissement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Tous les types d&apos;établissements</SelectItem>
                {CENTER_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select value={activityFilter} onValueChange={(val) => setActivityFilter(val || "all")}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Activité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Toutes activités confondues</SelectItem>
                <SelectItem value="active" className="text-xs">Centres actifs (dépôts réels)</SelectItem>
                <SelectItem value="both" className="text-xs">Mixtes (Déchets + Échantillons)</SelectItem>
                <SelectItem value="waste_only" className="text-xs">Déchets uniquement</SelectItem>
                <SelectItem value="samples_only" className="text-xs">Échantillons uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* TABLEAU DES CENTRES */}
      <Card className="shadow-2xs border-border/70 overflow-hidden">
        <CardHeader className="p-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              Liste des Structures & Identifiants Uniques
            </CardTitle>
            <CardDescription className="text-xs">
              {filteredStats.length} centre(s) affiché(s) sur {centers.length} au total
            </CardDescription>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs">
                <TableHead className="w-[140px] font-bold">Identifiant Unique</TableHead>
                <TableHead className="font-bold">Centre / Structure Apportrice</TableHead>
                <TableHead className="font-bold">Type d&apos;Établissement</TableHead>
                <TableHead className="font-bold">Ville / Commune</TableHead>
                <TableHead className="font-bold">Contact / Téléphone</TableHead>
                <TableHead className="text-center font-bold">Dépôts Déchets</TableHead>
                <TableHead className="text-center font-bold">Dépôts Échantillons</TableHead>
                <TableHead className="text-right font-bold pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                    Chargement des centres apporteurs...
                  </TableCell>
                </TableRow>
              ) : filteredStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                    Aucun centre ne correspond aux critères de recherche.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStats.map((stat) => {
                  const { center, wasteBatchesCount, wasteTotalWeightKg, samplesReceptionsCount, samplesCount } = stat
                  return (
                    <TableRow key={center.center_code || center.id} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-1.5">
                          <Badge 
                            variant="secondary" 
                            className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 font-bold px-2 py-0.5"
                          >
                            {center.center_code}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopyCode(center.center_code)}
                            title="Copier l'identifiant"
                          >
                            {copiedCode === center.center_code ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="font-semibold text-foreground">
                        <div className="flex flex-col">
                          <span>{center.name}</span>
                          {center.address && (
                            <span className="text-[10.5px] text-muted-foreground font-normal">
                              {center.address}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        <Badge variant="outline" className="text-[10.5px] font-medium bg-background">
                          {center.center_type}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{center.city}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col text-[11px]">
                          {center.contact_person && (
                            <span className="font-medium text-foreground">{center.contact_person}</span>
                          )}
                          {center.phone ? (
                            <span className="text-muted-foreground font-mono">{center.phone}</span>
                          ) : (
                            <span className="text-muted-foreground/60 italic">—</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {wasteBatchesCount > 0 ? (
                          <div className="flex flex-col items-center">
                            <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                              {wasteBatchesCount} lot(s)
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              {wasteTotalWeightKg} Kg
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px]">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        {samplesReceptionsCount > 0 ? (
                          <div className="flex flex-col items-center">
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
                              {samplesReceptionsCount} réc.
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              {samplesCount} éch.
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px]">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 gap-1"
                            onClick={() => setSelectedCenterStats(stat)}
                            title="Consulter toutes les données de ce centre"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Données
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditModal(center)}
                            title="Modifier les coordonnées du centre"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(center)}
                            title="Supprimer ce centre"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* MODAL CRÉATION / ÉDITION DE CENTRE */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              {editingCenter?.id ? "Modifier les Informations du Centre" : "Enregistrer un Nouveau Centre"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Chaque centre dispose d&apos;un identifiant unique pérenne permettant d&apos;agréger ses données de dépôt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 block">
                  Identifiant Unique ABMed (Automatique)
                </span>
                <span className="font-mono text-sm font-extrabold text-[#1B5C2E]">
                  {editingCenter?.center_code}
                </span>
              </div>
              <Badge className="bg-[#1B5C2E] text-white text-[10px]">Attribution Officielle</Badge>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Nom du Centre / Établissement <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ex: Pharmacie de l'Étoile, Hôpital Ménontin..."
                value={editingCenter?.name || ""}
                onChange={(e) => setEditingCenter(prev => prev ? { ...prev, name: e.target.value.toUpperCase() } : null)}
                className="h-9 text-xs uppercase font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Type d&apos;Établissement
                </label>
                <Select
                  value={editingCenter?.center_type || "Officine privée de pharmacie"}
                  onValueChange={(val) => setEditingCenter(prev => prev ? { ...prev, center_type: val || undefined } : null)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CENTER_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Ville / Commune
                </label>
                <Input
                  placeholder="Ex: Cotonou"
                  value={editingCenter?.city || ""}
                  onChange={(e) => setEditingCenter(prev => prev ? { ...prev, city: e.target.value } : null)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Adresse Géographique / Quartier
              </label>
              <Input
                placeholder="Ex: Quartier Cadjèhoun, Carré 124"
                value={editingCenter?.address || ""}
                onChange={(e) => setEditingCenter(prev => prev ? { ...prev, address: e.target.value } : null)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Personne de Contact
                </label>
                <Input
                  placeholder="Ex: Dr. AHOUNOU"
                  value={editingCenter?.contact_person || ""}
                  onChange={(e) => setEditingCenter(prev => prev ? { ...prev, contact_person: e.target.value } : null)}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Téléphone
                </label>
                <Input
                  placeholder="Ex: +229 97 00 00 00"
                  value={editingCenter?.phone || ""}
                  onChange={(e) => setEditingCenter(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Email
              </label>
              <Input
                type="email"
                placeholder="Ex: contact@pharmacie.bj"
                value={editingCenter?.email || ""}
                onChange={(e) => setEditingCenter(prev => prev ? { ...prev, email: e.target.value } : null)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="h-9 text-xs"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSaveModal}
              disabled={isSaving}
              className="h-9 text-xs font-bold bg-[#1B5C2E] hover:bg-[#154824] text-white"
            >
              {isSaving ? "Enregistrement..." : "Enregistrer le Centre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TIROIR DÉTAILLÉ DU CENTRE (DONNÉES PAR CENTRE) */}
      <Sheet open={!!selectedCenterStats} onOpenChange={(open) => !open && setSelectedCenterStats(null)}>
        <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col bg-card overflow-hidden">
          {selectedCenterStats && (
            <>
              {/* Entête du tiroir */}
              <div className="p-5 border-b border-border/60 bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="bg-[#1B5C2E] text-white font-mono font-bold text-xs px-2.5 py-0.5">
                        {selectedCenterStats.center.center_code}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {selectedCenterStats.center.center_type}
                      </Badge>
                    </div>
                    <h2 className="text-lg font-black text-foreground">
                      {selectedCenterStats.center.name}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedCenterStats.center.city}
                      </span>
                      {selectedCenterStats.center.phone && (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3" />
                          {selectedCenterStats.center.phone}
                        </span>
                      )}
                      {selectedCenterStats.center.contact_person && (
                        <span>Contact : {selectedCenterStats.center.contact_person}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Synthèse des flux du centre */}
                <div className="grid grid-cols-3 gap-2.5 mt-4">
                  <div className="p-2.5 rounded-xl bg-background border border-border/70 text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Lots Déchets
                    </span>
                    <span className="text-base font-black text-red-600">
                      {selectedCenterStats.wasteBatchesCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-semibold">
                      {selectedCenterStats.wasteTotalWeightKg} Kg
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-background border border-border/70 text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Réceptions Éch.
                    </span>
                    <span className="text-base font-black text-blue-600">
                      {selectedCenterStats.samplesReceptionsCount}
                    </span>
                    <span className="text-[10px] text-muted-foreground block font-semibold">
                      {selectedCenterStats.samplesCount} échantillon(s)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-background border border-border/70 text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      Dernier Dépôt
                    </span>
                    <span className="text-xs font-bold text-foreground block mt-1">
                      {selectedCenterStats.lastActivityDate
                        ? new Date(selectedCenterStats.lastActivityDate).toLocaleDateString("fr-FR")
                        : "Aucun dépôt"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Onglets des données du centre */}
              <div className="flex-1 overflow-y-auto p-5">
                <Tabs defaultValue="waste" className="w-full">
                  <TabsList className="grid grid-cols-2 w-full mb-4">
                    <TabsTrigger value="waste" className="text-xs font-bold gap-1.5">
                      <Boxes className="h-3.5 w-3.5 text-red-600" />
                      Déchets ({selectedCenterStats.wasteBatchesCount})
                    </TabsTrigger>
                    <TabsTrigger value="samples" className="text-xs font-bold gap-1.5">
                      <Package className="h-3.5 w-3.5 text-blue-600" />
                      Échantillons ({selectedCenterStats.samplesReceptionsCount})
                    </TabsTrigger>
                  </TabsList>

                  {/* ONGLET DÉCHETS */}
                  <TabsContent value="waste" className="space-y-3">
                    {selectedCenterStats.wasteBatches.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                        Aucun lot de déchet apporté par ce centre pour l&apos;instant.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedCenterStats.wasteBatches.map((b) => (
                          <div 
                            key={b.batch_number || b.id} 
                            className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-bold text-xs text-foreground">
                                  {b.batch_number}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9.5px] font-bold ${
                                    b.status === "Détruit" ? "bg-emerald-50 text-emerald-800" :
                                    b.status === "En attente de destruction" ? "bg-amber-50 text-amber-800" :
                                    "bg-blue-50 text-blue-800"
                                  }`}
                                >
                                  {b.status}
                                </Badge>
                              </div>
                              <p className="text-xs font-semibold text-foreground line-clamp-1">
                                {b.commercial_name || b.waste_type}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                                <span>Réc. : {b.reception_number || "-"}</span>
                                <span>Date : {b.reception_date ? new Date(b.reception_date).toLocaleDateString("fr-FR") : "-"}</span>
                                <span className="font-bold text-foreground">{b.quantity} {b.unit || "Kg"}</span>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10.5px] font-bold gap-1 shrink-0"
                              onClick={() => {
                                exportWasteReceptionSlipPDF({
                                  reception_number: b.reception_number || `BORD-${b.batch_number}`,
                                  reception_date: b.reception_date ? new Date(b.reception_date).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR"),
                                  source_structure: selectedCenterStats.center.name,
                                  source_type: selectedCenterStats.center.center_type,
                                  city: selectedCenterStats.center.city,
                                  depositor_name: b.depositor_name || selectedCenterStats.center.contact_person || "-",
                                  depositor_phone: b.depositor_phone || selectedCenterStats.center.phone || "-",
                                  recipient_agent: b.recipient_agent || "Agent ABMed",
                                  items: [{
                                    batch_number: b.batch_number,
                                    waste_type: b.waste_type || "Médicaments périmés",
                                    commercial_name: b.commercial_name || b.waste_type || "Déchet",
                                    quantity: Number(b.quantity) || 1,
                                    unit: b.unit || "Kg",
                                    packaging: b.packaging || "Carton",
                                    location: b.current_location || "Magasin Déchets",
                                  }]
                                })
                              }}
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* ONGLET ÉCHANTILLONS */}
                  <TabsContent value="samples" className="space-y-3">
                    {selectedCenterStats.receptions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                        Aucune réception d&apos;échantillons enregistrée pour ce centre.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedCenterStats.receptions.map((r) => {
                          const count = Array.isArray(r.samples_data) 
                            ? r.samples_data.length 
                            : (Array.isArray(r.samples) ? (r.samples[0]?.count ?? r.samples.length) : 1)
                          return (
                            <div 
                              key={r.rec_number || r.id} 
                              className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono font-bold text-xs text-foreground">
                                    {r.rec_number}
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[9.5px] font-bold ${
                                      r.status === "Validée" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                                    }`}
                                  >
                                    {r.status || "En cours"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                                  <span>Date : {r.date_reception ? new Date(r.date_reception).toLocaleDateString("fr-FR") : "-"}</span>
                                  <span>Type : {r.type_reception || "Enregistrement"}</span>
                                  <span className="font-bold text-blue-700">{count} produit(s)</span>
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10.5px] font-bold gap-1 shrink-0"
                                onClick={() => {
                                  exportReceptionVoucherPDF(r, r.samples_data || [])
                                }}
                              >
                                <Download className="h-3 w-3" />
                                Bordereau
                              </Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
