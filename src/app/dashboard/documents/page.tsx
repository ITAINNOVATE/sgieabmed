import { Suspense } from "react"
import DocumentsClient from "./DocumentsClient"

export default function DocumentsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out">
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-xs animate-pulse">Chargement de la documentation des échantillons...</div>}>
        <DocumentsClient initialDocuments={[]} samplesList={[]} />
      </Suspense>
    </div>
  )
}
