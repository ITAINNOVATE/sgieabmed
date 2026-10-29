"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { UseFormReturn, FieldValues } from "react-hook-form"
import { getCurrentUser } from "@/app/dashboard/admin/adminMockData"

/**
 * Sauvegarde automatique (brouillon) d'un formulaire de réception.
 *
 * - Enregistre régulièrement la saisie en cours (à chaque modification + toutes les 5 s + à la fermeture/changement d'onglet).
 * - Si l'agent quitte la page par mégarde, le brouillon est proposé à la restauration à son retour.
 * - Le brouillon est propre à chaque agent et à chaque poste (stocké localement, jamais diffusé aux autres postes).
 *
 * IMPORTANT : la clé de stockage ne doit contenir aucun des mots surveillés par l'intercepteur de synchronisation
 * temps réel (reception, waste, sample, user, ...) afin de ne pas déclencher de rafraîchissement sur les autres postes.
 */

export interface FormDraft<TValues, TExtra> {
  values: TValues
  extra?: TExtra
  savedAt: string
  savedBy?: string
}

interface UseFormAutosaveOptions<TValues extends FieldValues, TExtra> {
  /** Identifiant du formulaire, ex: "ech" ou "dech" */
  formKey: string
  form: UseFormReturn<TValues>
  /** Désactiver (ex: en mode modification d'une réception existante) */
  enabled?: boolean
  /** États React hors formulaire à sauvegarder (pièces jointes, listes DCI, ...) */
  getExtra?: () => TExtra
  setExtra?: (extra: TExtra) => void
  /** Valeurs supplémentaires qui doivent déclencher une sauvegarde lorsqu'elles changent */
  extraDeps?: unknown[]
  intervalMs?: number
}

const DRAFT_PREFIX = "eged_brouillon_auto_"

function buildStorageKey(formKey: string) {
  let uid = "anonyme"
  try {
    uid = getCurrentUser()?.id || "anonyme"
  } catch {}
  return `${DRAFT_PREFIX}${formKey}_${uid}`
}

export function useFormAutosave<TValues extends FieldValues, TExtra = unknown>({
  formKey,
  form,
  enabled = true,
  getExtra,
  setExtra,
  extraDeps = [],
  intervalMs = 5000,
}: UseFormAutosaveOptions<TValues, TExtra>) {
  const [pendingDraft, setPendingDraft] = useState<FormDraft<TValues, TExtra> | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const storageKeyRef = useRef<string>("")
  const touchedRef = useRef(false) // l'agent a réellement commencé à saisir
  const clearedRef = useRef(false) // réception enregistrée -> ne plus sauvegarder
  const awaitingDecisionRef = useRef(false) // brouillon en attente de décision -> ne pas l'écraser
  const lastSnapshotRef = useRef<string>("")
  const initialExtraRef = useRef<string | null>(null)
  const getExtraRef = useRef(getExtra)
  getExtraRef.current = getExtra

  const saveNow = useCallback(() => {
    if (!enabled || clearedRef.current || awaitingDecisionRef.current || !touchedRef.current) return
    if (typeof window === "undefined" || !storageKeyRef.current) return
    try {
      const values = form.getValues()
      const extra = getExtraRef.current ? getExtraRef.current() : undefined
      const snapshot = JSON.stringify({ values, extra })
      if (snapshot === lastSnapshotRef.current) return

      const user = getCurrentUser()
      const draft: FormDraft<TValues, TExtra> = {
        values,
        extra,
        savedAt: new Date().toISOString(),
        savedBy: user ? `${user.first_name} ${user.last_name}`.trim() : undefined,
      }
      try {
        localStorage.setItem(storageKeyRef.current, JSON.stringify(draft))
      } catch {
        // Espace local insuffisant (pièces jointes volumineuses) : on garde au moins la saisie du formulaire
        localStorage.setItem(storageKeyRef.current, JSON.stringify({ ...draft, extra: undefined }))
      }
      lastSnapshotRef.current = snapshot
      setLastSavedAt(draft.savedAt)
    } catch (e) {
      console.warn("[Autosave] Échec sauvegarde brouillon:", e)
    }
  }, [enabled, form])

  // 1. Au chargement : détecter un brouillon existant
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    storageKeyRef.current = buildStorageKey(formKey)
    try {
      const raw = localStorage.getItem(storageKeyRef.current)
      if (raw) {
        const parsed = JSON.parse(raw) as FormDraft<TValues, TExtra>
        if (parsed && parsed.values) {
          awaitingDecisionRef.current = true
          setPendingDraft(parsed)
        }
      }
    } catch {}
  }, [enabled, formKey])

  // 2. Détecter la saisie réelle de l'agent et sauvegarder (léger délai)
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const sub = form.watch((_value, info) => {
      if (info?.type === "change") touchedRef.current = true
      if (!touchedRef.current) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(saveNow, 800)
    })
    return () => {
      sub.unsubscribe()
      if (timer) clearTimeout(timer)
    }
  }, [enabled, form, saveNow])

  // 3. Changement des états hors formulaire (pièces jointes, DCI...)
  useEffect(() => {
    if (!enabled || !getExtraRef.current) return
    const current = JSON.stringify(getExtraRef.current())
    if (initialExtraRef.current === null) {
      initialExtraRef.current = current
      return
    }
    if (current !== initialExtraRef.current) touchedRef.current = true
    saveNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, saveNow, ...extraDeps])

  // 4. Sauvegarde régulière + à la fermeture / changement d'onglet / quitter la page
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return
    const interval = setInterval(saveNow, intervalMs)
    const onHide = () => saveNow()
    const onVisibility = () => {
      if (document.visibilityState === "hidden") saveNow()
    }
    window.addEventListener("beforeunload", onHide)
    window.addEventListener("pagehide", onHide)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(interval)
      window.removeEventListener("beforeunload", onHide)
      window.removeEventListener("pagehide", onHide)
      document.removeEventListener("visibilitychange", onVisibility)
      // Navigation interne (menu, bouton retour...) : dernière sauvegarde
      saveNow()
    }
  }, [enabled, intervalMs, saveNow])

  /** Restaurer le brouillon proposé */
  const restoreDraft = useCallback(() => {
    if (!pendingDraft) return
    form.reset(pendingDraft.values)
    if (pendingDraft.extra !== undefined && setExtra) {
      setExtra(pendingDraft.extra)
    }
    lastSnapshotRef.current = JSON.stringify({ values: pendingDraft.values, extra: pendingDraft.extra })
    awaitingDecisionRef.current = false
    touchedRef.current = true
    setLastSavedAt(pendingDraft.savedAt)
    setPendingDraft(null)
  }, [form, pendingDraft, setExtra])

  /** Ignorer le brouillon et repartir d'une réception vierge */
  const discardDraft = useCallback(() => {
    try {
      if (storageKeyRef.current) localStorage.removeItem(storageKeyRef.current)
    } catch {}
    awaitingDecisionRef.current = false
    lastSnapshotRef.current = ""
    setPendingDraft(null)
  }, [])

  /** À appeler après l'enregistrement réussi de la réception */
  const clearDraft = useCallback(() => {
    clearedRef.current = true
    awaitingDecisionRef.current = false
    try {
      const key = storageKeyRef.current || buildStorageKey(formKey)
      localStorage.removeItem(key)
    } catch {}
    setPendingDraft(null)
    setLastSavedAt(null)
  }, [formKey])

  return { pendingDraft, restoreDraft, discardDraft, clearDraft, lastSavedAt, saveNow }
}
