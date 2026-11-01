export interface SampleCategoryConfig {
  id: string
  label: string
  shortLabel: string
  code: string
  slug: string
  description: string
  color: string
  badgeClass: string
  bgLightClass: string
  borderClass: string
  iconName: string
}

export const SAMPLE_CATEGORIES: SampleCategoryConfig[] = [
  {
    id: "pms",
    slug: "pms",
    label: "Échantillon PMS",
    shortLabel: "PMS",
    code: "PMS",
    description: "Surveillance Post-Marketing (PMS) des produits pharmaceutiques et de santé",
    color: "#2563EB", // Blue
    badgeClass: "bg-blue-600 text-white",
    bgLightClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-200 dark:border-blue-800",
    iconName: "ShieldCheck",
  },
  {
    id: "homologation-nouvelle",
    slug: "homologation-nouvelle",
    label: "Échantillon Homologation - Nouvelle demande",
    shortLabel: "Homologation (Nouvelle)",
    code: "HOM-ND",
    description: "Échantillons soumis pour première demande d'Autorisation de Mise sur le Marché (AMM)",
    color: "#16A34A", // Emerald / Green
    badgeClass: "bg-emerald-600 text-white",
    bgLightClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    iconName: "FileCheck",
  },
  {
    id: "homologation-renouvellement",
    slug: "homologation-renouvellement",
    label: "Échantillon Homologation - Renouvellement",
    shortLabel: "Homologation (Renouvellement)",
    code: "HOM-REN",
    description: "Échantillons déposés dans le cadre du renouvellement quinquennal d'homologation",
    color: "#D97706", // Amber / Orange
    badgeClass: "bg-amber-600 text-white",
    bgLightClass: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800",
    iconName: "RefreshCw",
  },
  {
    id: "inspection-post-enlevement",
    slug: "inspection-post-enlevement",
    label: "Échantillon Inspection post enlèvement",
    shortLabel: "Inspection post enlèvement",
    code: "INSP-POST",
    description: "Prélèvements réalisés lors d'opérations de contrôle et saisie post-enlèvement",
    color: "#9333EA", // Purple
    badgeClass: "bg-purple-600 text-white",
    bgLightClass: "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300",
    borderClass: "border-purple-200 dark:border-purple-800",
    iconName: "SearchCheck",
  },
  {
    id: "inspection-routine",
    slug: "inspection-routine",
    label: "Échantillon Inspection de routine",
    shortLabel: "Inspection de routine",
    code: "INSP-ROUT",
    description: "Échantillons prélevés au cours des inspections réglementaires programmées",
    color: "#0891B2", // Cyan / Teal
    badgeClass: "bg-teal-600 text-white",
    bgLightClass: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-200 dark:border-teal-800",
    iconName: "ClipboardCheck",
  },
]

/**
 * Normalise un libellé ou slug vers l'ID canonique de la catégorie
 */
export function getSampleCategorySlug(input: string | null | undefined): string | null {
  if (!input) return null
  const cleaned = input.trim().toLowerCase()

  if (cleaned.includes("pms")) return "pms"
  if (cleaned.includes("renouvellement") || cleaned.includes("hom-ren")) return "homologation-renouvellement"
  if (cleaned.includes("nouvelle") || cleaned.includes("hom-nd") || cleaned.includes("homologation")) return "homologation-nouvelle"
  if (cleaned.includes("post") || cleaned.includes("enlevement") || cleaned.includes("enlèvement") || cleaned.includes("insp-post")) return "inspection-post-enlevement"
  if (cleaned.includes("routine") || cleaned.includes("insp-rout")) return "inspection-routine"

  return null
}

/**
 * Récupère la configuration de la catégorie par slug ou libellé
 */
export function getSampleCategory(input: string | null | undefined): SampleCategoryConfig | null {
  const slug = getSampleCategorySlug(input)
  if (!slug) return null
  return SAMPLE_CATEGORIES.find((cat) => cat.slug === slug) || null
}

/**
 * Vérifie si une réception ou un échantillon correspond à une catégorie donnée
 */
export function matchesSampleCategory(
  itemType: string | null | undefined,
  targetCategorySlugOrId: string | null | undefined
): boolean {
  if (!targetCategorySlugOrId || targetCategorySlugOrId === "all") return true
  const itemSlug = getSampleCategorySlug(itemType)
  const targetSlug = getSampleCategorySlug(targetCategorySlugOrId)
  if (!itemSlug || !targetSlug) return false
  return itemSlug === targetSlug
}
