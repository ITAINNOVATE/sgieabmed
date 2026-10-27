import React from "react"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Vérification Officielle de Traçabilité — ABMed eGED",
  description: "Portail public d'authentification et de traçabilité des lots pharmaceutiques et déchets — République du Bénin, ABMed",
}

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground antialiased flex flex-col justify-between selection:bg-[#003B5C]/20">
      {/* Barre tricolore officielle République du Bénin */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-[#008751]" title="Vert Bénin" />
        <div className="flex-1 bg-[#FCD116]" title="Jaune Bénin" />
        <div className="flex-1 bg-[#E8112D]" title="Rouge Bénin" />
      </div>

      {/* Contenu principal de vérification */}
      <main className="flex-1 flex flex-col items-center justify-start py-6 sm:py-10 px-3 sm:px-6 w-full max-w-4xl mx-auto">
        {children}
      </main>

      {/* Pied de page institutionnel de sécurité publique */}
      <footer className="w-full border-t border-border/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs py-6 px-4 text-center text-xs text-muted-foreground mt-8">
        <div className="max-w-3xl mx-auto space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            RÉPUBLIQUE DU BÉNIN — Agence Béninoise du Médicament et des autres Produits de Santé (ABMed)
          </p>
          <p className="text-[11px] leading-relaxed">
            Système National Sécurisé de Traçabilité des Échantillons et des Déchets Pharmaceutiques (eGED).
            Document public officiel délivré sous l&apos;autorité du Ministère de la Santé du Bénin.
          </p>
          <p className="text-[10px] text-muted-foreground/80 pt-1">
            Ce certificat de traçabilité est infalsifiable et consultable publiquement par tout contrôleur, officine, inspecteur ou citoyen.
            Aucun accès administratif ou accès à la plateforme interne n&apos;est accordé depuis cette interface.
          </p>
        </div>
      </footer>
    </div>
  )
}
