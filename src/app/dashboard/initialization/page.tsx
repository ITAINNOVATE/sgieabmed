import InitializationClient from "./InitializationClient"

export default function InitializationPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-7xl mx-auto pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Initialisation du Stock</h2>
        <p className="text-muted-foreground mt-1">
          Module de reprise des données pour charger le stock initial (échantillons & déchets).
        </p>
      </div>

      <InitializationClient />
    </div>
  )
}

