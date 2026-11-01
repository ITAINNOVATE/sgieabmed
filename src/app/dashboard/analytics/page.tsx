import { Suspense } from "react"
import DashboardClient from "../DashboardClient"

export default function SampleDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground text-sm">Chargement du tableau de bord...</div>}>
      <DashboardClient 
        samples={[]} 
        movements={[]} 
        receptions={[]}
      />
    </Suspense>
  )
}

