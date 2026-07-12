import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, AlertCircle } from "lucide-react"
import { login } from "./actions/auth"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-primary/5 rounded-b-[100%] scale-150 transform -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      
      <Card className="z-10 w-full max-w-md shadow-2xl border-none ring-1 ring-border/50 bg-card/95 backdrop-blur-xl p-2 sm:p-4">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-2">
            <div className="bg-primary/10 p-3 rounded-2xl shadow-inner">
              <ShieldCheck className="h-12 w-12 text-primary" strokeWidth={1.5} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">eGED</CardTitle>
          <CardDescription className="text-sm font-medium text-muted-foreground">
            Système Électronique de Gestion des Échantillons et des Déchets pharmaceutiques
            <br />
            <span className="font-semibold text-foreground/70">ABMed</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form action={login}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground/80 font-medium">Nom d'utilisateur</Label>
              <Input id="email" name="email" type="text" placeholder="Entrez votre identifiant" required className="h-11 shadow-sm transition-all focus-visible:ring-primary/50" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground/80 font-medium">Mot de passe</Label>
                <a href="#" className="text-xs font-medium text-primary hover:underline transition-colors">Mot de passe oublié ?</a>
              </div>
              <Input id="password" name="password" type="password" required className="h-11 shadow-sm transition-all focus-visible:ring-primary/50" />
            </div>
            {/* Bouton de Connexion */}
            <button type="submit" className="w-full bg-[#0B5ED7] hover:bg-[#094bb3] text-white font-medium h-11 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center mt-6">
              Connexion
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
