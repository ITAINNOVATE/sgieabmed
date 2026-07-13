"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  UploadCloud, FileSpreadsheet, Plus, Trash2, AlertCircle, 
  CheckCircle2, Download, RefreshCw, Lock, Trash, ArrowRight 
} from "lucide-react"
import { initializeStock } from "./actions"

interface StockItem {
  id: string
  type: "Échantillon" | "Déchet"
  commercial_name: string // or waste_type
  dci: string
  batch_number: string
  quantity: string
  unit: string
  expiry_date: string
  current_location: string
  category: string
  isValid: boolean
  errorMsg?: string
}

const CATEGORIES = [
  "Antibiotiques", "Antalgiques", "Anti-inflammatoires", 
  "Antipaludiques", "Antihypertenseurs", "Antidiabétiques", 
  "Vaccins", "Produits biologiques", "Dispositifs médicaux", 
  "Autres"
]

const UNITS = ["Boite", "Flacon", "Ampoule", "Seringue", "Kg", "Graine", "Unité"]

export default function InitializationClient() {
  const router = useRouter()
  const [mode, setMode] = useState<"csv" | "manual">("manual")
  const [items, setItems] = useState<StockItem[]>([
    {
      id: "1",
      type: "Échantillon",
      commercial_name: "",
      dci: "",
      batch_number: "",
      quantity: "",
      unit: "Boite",
      expiry_date: "",
      current_location: "",
      category: "Autres",
      isValid: false
    }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Manual Item addition ───────────────────────────────────
  const addRow = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(),
        type: "Échantillon",
        commercial_name: "",
        dci: "",
        batch_number: "",
        quantity: "",
        unit: "Boite",
        expiry_date: "",
        current_location: "",
        category: "Autres",
        isValid: false
      }
    ])
  }

  const deleteRow = (id: string) => {
    if (items.length === 1) {
      toast.warning("Vous devez initialiser au moins un article.")
      return
    }
    setItems(items.filter(item => item.id !== id))
  }

  // ── Inline Edit logic ──────────────────────────────────────
  const handleEdit = (id: string, field: keyof StockItem, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newItem = { ...item, [field]: value }
        return validateSingleItem(newItem)
      }
      return item
    })
    setItems(updated)
  }

  // ── Validation logic ───────────────────────────────────────
  const validateSingleItem = (item: StockItem): StockItem => {
    const name = item.commercial_name.trim()
    const batch = item.batch_number.trim()
    const qty = parseFloat(item.quantity)
    const exp = item.expiry_date.trim()
    
    if (!name) {
      return { ...item, isValid: false, errorMsg: "Nom commercial requis" }
    }
    if (!batch) {
      return { ...item, isValid: false, errorMsg: "N° Lot requis" }
    }
    if (isNaN(qty) || qty <= 0) {
      return { ...item, isValid: false, errorMsg: "Quantité doit être > 0" }
    }
    if (item.type === "Échantillon" && !exp) {
      return { ...item, isValid: false, errorMsg: "Date de péremption requise pour les échantillons" }
    }
    if (item.type === "Échantillon" && exp) {
      const expDate = new Date(exp)
      if (isNaN(expDate.getTime())) {
        return { ...item, isValid: false, errorMsg: "Format de date invalide (AAAA-MM-JJ)" }
      }
    }
    
    return { ...item, isValid: true, errorMsg: undefined }
  }

  // ── Download template CSV ──────────────────────────────────
  const downloadTemplate = () => {
    const header = "Type;Nom;DCI;Lot;Quantite;Unite;Peremption;Emplacement;Categorie\n"
    const example1 = "Échantillon;Amoxicilline 500mg;Amoxicilline;LOT-001;150;Boite;2027-12-31;A1-E3;Antibiotiques\n"
    const example2 = "Déchet;Médicaments périmés;;DEC-2026-01;12.5;Kg;;Zone de Quarantaine - Déchets;\n"
    
    const blob = new Blob([header + example1 + example2], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", "modèle_reprise_GED.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ── CSV File Parsing ───────────────────────────────────────
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return

      try {
        const lines = text.split(/\r?\n/)
        if (lines.length <= 1) {
          toast.error("Le fichier CSV est vide ou invalide.")
          return
        }

        const parsedItems: StockItem[] = []
        // Read header line to detect separator
        const header = lines[0]
        const separator = header.includes(";") ? ";" : ","

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue // skip empty rows

          // Split line columns, accounting for simple CSV values
          const cols = line.split(separator)
          const typeVal = cols[0]?.trim()
          const type: "Échantillon" | "Déchet" = (typeVal === "Déchet" || typeVal?.toLowerCase() === "dechet") ? "Déchet" : "Échantillon"
          
          const rawItem: StockItem = {
            id: Math.random().toString(),
            type,
            commercial_name: cols[1]?.trim() || "",
            dci: cols[2]?.trim() || "",
            batch_number: cols[3]?.trim() || "",
            quantity: cols[4]?.trim() || "",
            unit: cols[5]?.trim() || (type === "Déchet" ? "Kg" : "Boite"),
            expiry_date: cols[6]?.trim() || "",
            current_location: cols[7]?.trim() || "",
            category: cols[8]?.trim() || "Autres",
            isValid: false
          }

          parsedItems.push(validateSingleItem(rawItem))
        }

        if (parsedItems.length === 0) {
          toast.error("Aucune ligne de données exploitable trouvée.")
          return
        }

        setItems(parsedItems)
        toast.success(`${parsedItems.length} articles importés avec succès depuis le fichier.`)
      } catch (err: any) {
        console.error(err)
        toast.error("Erreur lors de la lecture du fichier. Veuillez utiliser un format CSV propre.")
      }
    }

    reader.readAsText(file, "UTF-8")
  }

  // ── Final validation & Database insert ─────────────────────
  const handleFinalSubmit = async () => {
    // 1. Run validation check on all items
    const validated = items.map(item => validateSingleItem(item))
    setItems(validated)

    const invalidItems = validated.filter(item => !item.isValid)
    if (invalidItems.length > 0) {
      toast.error(`Veuillez corriger les ${invalidItems.length} ligne(s) invalide(s) (surlignées en rouge) avant de finaliser.`)
      return
    }

    const confirmAction = window.confirm(
      "ATTENTION: Cette action est irréversible.\n\n" +
      "La validation de cette reprise de données va initialiser le stock et verrouiller définitivement ce module.\n" +
      "Toute modification ou ajout ultérieur devra passer par le module de Réception.\n\n" +
      "Souhaitez-vous enregistrer le stock et verrouiller la mise en production ?"
    )

    if (!confirmAction) return

    setIsSubmitting(true)

    try {
      const response = await initializeStock(validated)
      if (response.success) {
        toast.success("Initialisation du stock réussie ! La plateforme est en production.")
        router.refresh()
      } else {
        toast.error(`Erreur d'initialisation: ${response.error}`)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Une erreur inattendue est survenue: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const validCount = items.filter(item => item.isValid).length
  const invalidCount = items.length - validCount

  return (
    <div className="space-y-6">
      
      {/* Selector Mode */}
      <div className="flex bg-muted/60 p-1 rounded-xl w-fit border border-border/50">
        <Button 
          variant={mode === "manual" ? "secondary" : "ghost"}
          className="rounded-lg h-9 text-xs px-4"
          onClick={() => setMode("manual")}
        >
          Saisie manuelle en lot
        </Button>
        <Button 
          variant={mode === "csv" ? "secondary" : "ghost"}
          className="rounded-lg h-9 text-xs px-4"
          onClick={() => setMode("csv")}
        >
          Importation par fichier Excel (CSV)
        </Button>
      </div>

      {mode === "csv" && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-base">Téléversement de fichier</CardTitle>
                <CardDescription>
                  Importez un fichier CSV contenant l'état initial des stocks d'échantillons et de déchets.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 h-9">
                <Download className="h-4 w-4" />
                Télécharger le modèle CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/50 rounded-2xl p-10 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer text-muted-foreground"
            >
              <UploadCloud className="h-12 w-12 mb-3 text-primary" />
              <p className="font-semibold text-foreground">Glissez-déposez votre fichier ici, ou cliquez pour parcourir</p>
              <p className="text-xs mt-1">Fichier CSV (séparateur point-virgule ou virgule) codé en UTF-8</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleCSVUpload} 
                accept=".csv" 
                className="hidden" 
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main spreadsheet interface */}
      <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/50 bg-muted/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Articles à importer
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Remplissez ou ajustez les détails des produits. Les cellules rouges comportent des erreurs.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
              {validCount} ligne(s) valide(s)
            </Badge>
            {invalidCount > 0 && (
              <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">
                {invalidCount} ligne(s) incomplète(s)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-40 pl-4">Type de stock</TableHead>
                  <TableHead className="min-w-[200px]">Nom Commercial / Type déchet</TableHead>
                  <TableHead className="min-w-[150px]">DCI</TableHead>
                  <TableHead className="w-36">Catégorie</TableHead>
                  <TableHead className="w-36">N° Lot</TableHead>
                  <TableHead className="w-32">Quantité & Unité</TableHead>
                  <TableHead className="w-44">Expiration (AAAA-MM-JJ)</TableHead>
                  <TableHead className="w-40">Localisation</TableHead>
                  <TableHead className="w-12 text-center pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Aucune donnée importée ou saisie. Cliquez sur "Ajouter une ligne" ci-dessous.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow 
                      key={item.id} 
                      className={`hover:bg-muted/10 align-middle transition-colors ${!item.isValid && item.errorMsg ? "bg-red-50/40 dark:bg-red-950/10 border-l-2 border-l-destructive" : ""}`}
                    >
                      {/* Type Select */}
                      <TableCell className="pl-4">
                        <Select 
                          value={item.type} 
                          onValueChange={(val) => handleEdit(item.id, "type", val)}
                        >
                          <SelectTrigger className="h-8 text-xs font-semibold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Échantillon">Échantillon</SelectItem>
                            <SelectItem value="Déchet">Déchet</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Name Input */}
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            placeholder={item.type === "Déchet" ? "Ex: Déchets d'antalgiques..." : "Ex: Paracétamol 1g..."}
                            className="h-8 text-xs font-medium"
                            value={item.commercial_name}
                            onChange={(e) => handleEdit(item.id, "commercial_name", e.target.value)}
                          />
                          {!item.isValid && item.errorMsg && item.errorMsg.includes("Nom") && (
                            <p className="text-[10px] text-destructive font-medium">{item.errorMsg}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* DCI Input */}
                      <TableCell>
                        <Input
                          placeholder="DCI..."
                          className="h-8 text-xs"
                          value={item.dci}
                          disabled={item.type === "Déchet"}
                          onChange={(e) => handleEdit(item.id, "dci", e.target.value)}
                        />
                      </TableCell>

                      {/* Category Select */}
                      <TableCell>
                        <Select 
                          value={item.category} 
                          disabled={item.type === "Déchet"}
                          onValueChange={(val) => handleEdit(item.id, "category", val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Batch Number */}
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            placeholder="Lot..."
                            className="h-8 text-xs font-mono"
                            value={item.batch_number}
                            onChange={(e) => handleEdit(item.id, "batch_number", e.target.value)}
                          />
                          {!item.isValid && item.errorMsg && item.errorMsg.includes("Lot") && (
                            <p className="text-[10px] text-destructive font-medium">{item.errorMsg}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Quantity & Unit */}
                      <TableCell>
                        <div className="flex gap-1.5 items-center">
                          <div className="space-y-1 flex-1">
                            <Input
                              type="number"
                              placeholder="Qté"
                              className="h-8 text-xs text-center font-bold"
                              value={item.quantity}
                              onChange={(e) => handleEdit(item.id, "quantity", e.target.value)}
                            />
                            {!item.isValid && item.errorMsg && item.errorMsg.includes("Quantité") && (
                              <p className="text-[10px] text-destructive font-medium">{item.errorMsg}</p>
                            )}
                          </div>
                          <Select 
                            value={item.unit} 
                            onValueChange={(val) => handleEdit(item.id, "unit", val)}
                          >
                            <SelectTrigger className="h-8 w-16 text-xs px-1.5 shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>

                      {/* Expiration date */}
                      <TableCell>
                        <div className="space-y-1">
                          <Input
                            type="date"
                            className="h-8 text-xs"
                            value={item.expiry_date}
                            disabled={item.type === "Déchet"}
                            onChange={(e) => handleEdit(item.id, "expiry_date", e.target.value)}
                          />
                          {!item.isValid && item.errorMsg && item.errorMsg.includes("péremption") && (
                            <p className="text-[10px] text-destructive font-medium">{item.errorMsg}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <Input
                          placeholder="Ex: A1-E2..."
                          className="h-8 text-xs font-mono"
                          value={item.current_location}
                          onChange={(e) => handleEdit(item.id, "current_location", e.target.value)}
                        />
                      </TableCell>

                      {/* Delete Action */}
                      <TableCell className="text-center pr-4">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteRow(item.id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <Button variant="outline" className="h-10 border-dashed" onClick={addRow}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un article
        </Button>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button 
              variant="destructive" 
              className="h-10 px-6 gap-2"
              onClick={() => setItems([])}
            >
              <Trash2 className="h-4 w-4" />
              Vider la liste
            </Button>
          )}
          <Button 
            className="h-10 px-8 gap-2 bg-[#0B5ED7] hover:bg-[#094bb3] text-white shadow-md"
            onClick={handleFinalSubmit}
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Initialisation...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Finaliser et Verrouiller l'Initialisation
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
