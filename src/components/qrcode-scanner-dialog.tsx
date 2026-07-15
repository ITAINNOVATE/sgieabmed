"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Html5Qrcode } from "html5-qrcode"
import { createClient } from "@/utils/supabase/client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Camera, CameraOff, Scan, Search, Keyboard } from "lucide-react"

interface QRCodeScannerDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function QRCodeScannerDialog({ isOpen, onClose }: QRCodeScannerDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [cameraActive, setCameraActive] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerId = "eged-qr-reader"

  // Démarrer / Arrêter le scanner photo
  useEffect(() => {
    if (isOpen) {
      setCameraActive(true)
      setManualCode("")
      setScanError(null)
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen])

  const [scanError, setScanError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && cameraActive) {
      // Attendre que le conteneur DOM soit rendu
      setTimeout(() => {
        startScanner()
      }, 300)
    } else {
      stopScanner()
    }
  }, [cameraActive, isOpen])

  const startScanner = async () => {
    try {
      const html5Qrcode = new Html5Qrcode(scannerId)
      scannerRef.current = html5Qrcode
      
      setHasPermission(null)
      
      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        () => {
          // Callback d'erreur silencieux pour éviter les logs de parsing repetitifs
        }
      )
      
      setHasPermission(true)
    } catch (err: any) {
      console.error("Erreur d'initialisation de la caméra:", err)
      setHasPermission(false)
      setScanError("Impossible d'accéder à la caméra. Vérifiez les permissions.")
      setCameraActive(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        try {
          await scannerRef.current.stop()
        } catch (err) {
          console.error("Erreur d'arrêt du scanner:", err)
        }
      }
      scannerRef.current = null
    }
  }

  const handleScanSuccess = async (text: string) => {
    // Arrêter le scanner immédiatement pour éviter le double scan
    await stopScanner()
    setCameraActive(false)
    
    toast.success("QR Code scanné avec succès !")
    
    // Résoudre l'adresse ou le code
    resolveCode(text)
  }

  const resolveCode = async (code: string) => {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // 1. Analyser si c'est une URL interne de l'application
      if (code.includes("/dashboard/samples/")) {
        const id = code.split("/dashboard/samples/")[1]?.split("?")[0]?.split("#")[0]
        if (id) {
          router.push(`/dashboard/samples/${id}`)
          onClose()
          return
        }
      }
      if (code.includes("/dashboard/waste/")) {
        const id = code.split("/dashboard/waste/")[1]?.split("?")[0]?.split("#")[0]
        if (id) {
          router.push(`/dashboard/waste/${id}`)
          onClose()
          return
        }
      }

      // 2. Nettoyer le code
      const cleanCode = code.trim()
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode)

      // 3. Recherche dans les échantillons (par ID ou N° Échantillon)
      let sampleQuery = supabase.from("samples").select("id")
      if (isUuid) {
        sampleQuery = sampleQuery.or(`id.eq.${cleanCode},sample_number.eq.${cleanCode}`)
      } else {
        sampleQuery = sampleQuery.eq("sample_number", cleanCode)
      }
      const { data: sample } = await sampleQuery.limit(1).maybeSingle()
      
      if (sample) {
        toast.success("Échantillon identifié !")
        router.push(`/dashboard/samples/${sample.id}`)
        onClose()
        return
      }

      // 4. Recherche dans les déchets (par ID ou N° Lot déchet)
      let wasteQuery = supabase.from("waste_batches").select("id")
      if (isUuid) {
        wasteQuery = wasteQuery.or(`id.eq.${cleanCode},batch_number.eq.${cleanCode}`)
      } else {
        wasteQuery = wasteQuery.eq("batch_number", cleanCode)
      }
      const { data: waste } = await wasteQuery.limit(1).maybeSingle()
      
      if (waste) {
        toast.success("Lot de déchet identifié !")
        router.push(`/dashboard/waste/${waste.id}`)
        onClose()
        return
      }

      toast.error("Aucun échantillon ou déchet correspondant trouvé.")
      // Relancer la caméra si non trouvée
      setCameraActive(true)
    } catch (err: any) {
      console.error(err)
      toast.error("Une erreur est survenue lors de la recherche.")
      setCameraActive(true)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    resolveCode(manualCode.trim())
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/50 shadow-lg bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Scan className="h-5 w-5 text-primary" />
            Scanner / Rechercher par QR Code
          </DialogTitle>
          <DialogDescription>
            Scannez une étiquette avec votre caméra ou saisissez le code manuellement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          
          {/* Lecteur Vidéo */}
          <div className="relative aspect-square w-full max-w-[280px] mx-auto overflow-hidden rounded-xl border border-border bg-black/5 flex flex-col items-center justify-center shadow-inner">
            {cameraActive ? (
              <div id={scannerId} className="w-full h-full" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center">
                <CameraOff className="h-10 w-10 opacity-40" />
                <p className="text-xs">Caméra désactivée</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setCameraActive(true)}
                  className="mt-2 text-xs rounded-lg"
                >
                  <Camera className="h-3 w-3 mr-1.5" /> Activer la caméra
                </Button>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl z-20 backdrop-blur-xs">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Erreur caméra */}
          {scanError && !cameraActive && (
            <p className="text-center text-xs text-destructive bg-destructive/5 py-2 px-3 rounded-lg border border-destructive/20 font-medium">
              {scanError}
            </p>
          )}

          {/* Séparateur */}
          <div className="relative flex items-center justify-center py-1">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60"></span></div>
            <span className="relative bg-card px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">OU</span>
          </div>

          {/* Formulaire manuel */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-code" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5" /> Saisie manuelle de l&apos;identifiant
              </Label>
              <div className="flex gap-2">
                <Input
                  id="manual-code"
                  placeholder="Ex: ECH-2026-0001 ou UUID..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="rounded-xl h-10 bg-muted/30 focus-visible:ring-primary/40 border-none shadow-sm"
                  disabled={loading}
                />
                <Button 
                  type="submit" 
                  disabled={loading || !manualCode.trim()} 
                  className="rounded-xl h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

        </div>
      </DialogContent>
    </Dialog>
  )
}
