import { createClient } from "@/utils/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Lock, ShieldAlert } from "lucide-react"
import InitializationClient from "./InitializationClient"

export const dynamic = 'force-dynamic'

export default async function InitializationPage() {
  const supabase = await createClient()

  // 1. Check if already initialized
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'is_stock_initialized')
    .maybeSingle()

  const isInitialized = setting?.value === 'true'

  // 2. Check if user is Administrator
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    isAdmin = profile?.role === 'Administrateur'
  } else {
    // En dev/prototypage local si pas de session, on autorise
    isAdmin = true
  }

  // 3. Render restrictions if not authorized
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">Accès Refusé</CardTitle>
            <CardDescription>
              Ce module est strictement réservé aux membres possédant le rôle **Administrateur**.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
            Veuillez contacter le support ou l'administrateur principal de l'ABMed si vous pensez que c'est une erreur.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-blue-200 dark:border-blue-900/30 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-blue-100 dark:bg-blue-950/40 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">Module Verrouillé</CardTitle>
            <CardDescription className="text-sm mt-1">
              L'initialisation du stock historique de la plateforme eGED-ABMed a déjà été validée et enregistrée.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50 space-y-4">
            <p>
              Pour préserver la traçabilité réglementaire et la conformité du stock, toute nouvelle entrée d'échantillons doit impérativement passer par le module de <strong>Réception</strong>.
            </p>
            <div className="bg-muted/50 p-3 rounded-xl border border-border/50 flex items-start gap-2.5 text-left">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-normal">
                Si vous devez forcer une modification de quantité pour correction d'erreur physique, veuillez utiliser le module d'<strong>Inventaire</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
