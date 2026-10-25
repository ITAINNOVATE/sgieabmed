export const WASTE_STORE_NAME = "MAGASIN DES DECHETS"

export interface WasteZoneDefinition {
  id: "solides" | "liquides" | "dangereuses"
  zoneName: string
  fullLocation: string
  shortCode: string
  description: string
  badgeColor: string
}

export const WASTE_ZONES: WasteZoneDefinition[] = [
  {
    id: "solides",
    zoneName: "Zone déchets solides",
    fullLocation: "MAGASIN DES DECHETS — Zone déchets solides",
    shortCode: "Z-SOLIDES",
    description: "Comprimés, gélules, poudres, blisters, emballages et cartons pharmaceutiques solides.",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    id: "liquides",
    zoneName: "Zone déchets Liquide",
    fullLocation: "MAGASIN DES DECHETS — Zone déchets Liquide",
    shortCode: "Z-LIQUIDES",
    description: "Sirops, suspensions buvables, ampoules injectables, solutés et flacons liquides.",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
  },
  {
    id: "dangereuses",
    zoneName: "Zone déchets dangereuses",
    fullLocation: "MAGASIN DES DECHETS — Zone déchets dangereuses",
    shortCode: "Z-DANGEREUSES",
    description: "Produits chimiques, solvants, DASRI, piquants/tranchants, cytotoxiques et produits toxiques.",
    badgeColor: "bg-red-50 text-red-800 border-red-200",
  },
]

export const WASTE_LOCATION_OPTIONS = WASTE_ZONES.map((z) => z.fullLocation)

/**
 * Normalise n'importe quel ancien libellé d'emplacement déchet vers l'une des 3 zones officielles
 * du MAGASIN DES DECHETS, ou suggère la zone appropriée selon le type de déchet.
 */
export function normalizeWasteLocation(rawLocation?: string | null, wasteType?: string | null): string {
  const loc = (rawLocation || "").toLowerCase()
  const wType = (wasteType || "").toLowerCase()

  // Si c'est déjà l'une des 3 zones exactes
  for (const z of WASTE_ZONES) {
    if (
      rawLocation === z.fullLocation ||
      rawLocation === z.zoneName ||
      loc.includes(z.zoneName.toLowerCase())
    ) {
      return z.fullLocation
    }
  }

  // Détection par mots-clés dans l'ancien emplacement
  if (loc.includes("liquide") || loc.includes("sirop") || loc.includes("a2")) {
    return WASTE_ZONES[1].fullLocation
  }
  if (
    loc.includes("danger") ||
    loc.includes("dasri") ||
    loc.includes("chimique") ||
    loc.includes("toxique") ||
    loc.includes("infectieux") ||
    loc.includes("piquant")
  ) {
    return WASTE_ZONES[2].fullLocation
  }
  if (loc.includes("solide") || loc.includes("a1")) {
    return WASTE_ZONES[0].fullLocation
  }

  // Sinon, détection intelligente selon le type de déchet
  if (wType.includes("liquide") || wType.includes("sirop")) {
    return WASTE_ZONES[1].fullLocation
  }
  if (
    wType.includes("danger") ||
    wType.includes("chimique") ||
    wType.includes("dasri") ||
    wType.includes("infectieux") ||
    wType.includes("piquant") ||
    wType.includes("cassé") ||
    wType.includes("solvant")
  ) {
    return WASTE_ZONES[2].fullLocation
  }

  return WASTE_ZONES[0].fullLocation
}
