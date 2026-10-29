"use client"

import { Clock, RotateCcw, Trash2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DraftRestoreBannerProps {
  pendingDraft: {
    savedAt: string
    savedBy?: string
  } | null
  onRestore: () => void
  onDiscard: () => void
  lastSavedAt?: string | null
  entityName?: string
}

export function DraftRestoreBanner({
  pendingDraft,
  onRestore,
  onDiscard,
  lastSavedAt,
  entityName = "réception",
}: DraftRestoreBannerProps) {
  // 1. Si un brouillon antérieur a été retrouvé suite à une sortie inopinée
  if (pendingDraft) {
    const formattedDate = new Date(pendingDraft.savedAt).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
    })

    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-700/60 p-3.5 sm:p-4 text-xs shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-1.5">
              <span>Saisie précédente interrompue détectée</span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 text-[11px] sm:text-xs mt-0.5">
              Vous avez quitté une saisie de {entityName} le <strong>{formattedDate}</strong>
              {pendingDraft.savedBy ? ` (par ${pendingDraft.savedBy})` : ""}. Voulez-vous reprendre là où vous vous étiez arrêté ?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-1 sm:pt-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDiscard}
            className="h-8 text-xs font-semibold text-muted-foreground hover:text-destructive border-amber-300 dark:border-amber-700 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Ignorer
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onRestore}
            className="h-8 text-xs font-bold bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-xs cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Restaurer ma saisie
          </Button>
        </div>
      </div>
    )
  }

  // 2. Si aucune reprise n'est en attente, afficher l'indicateur rassurant de sauvegarde automatique
  if (lastSavedAt) {
    const timeOnly = new Date(lastSavedAt).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-md border border-border/40 w-fit">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        <span>Brouillon sécurisé automatiquement à <strong>{timeOnly}</strong></span>
      </div>
    )
  }

  return null
}
