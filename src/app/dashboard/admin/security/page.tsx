"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ShieldCheck, Save, RefreshCw, KeyRound, Lock, EyeOff } from "lucide-react"
import { 
  getSecuritySettings, saveSecuritySettings, SecuritySettings, logAdminAction 
} from "../adminMockData"
import { toast } from "sonner"

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Fields state
  const [minPasswordLength, setMinPasswordLength] = useState(12)
  const [requireComplexity, setRequireComplexity] = useState(true)
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5)
  const [lockoutDuration, setLockoutDuration] = useState(15)
  const [maxSessionDuration, setMaxSessionDuration] = useState(30)
  const [passwordValidityDays, setPasswordValidityDays] = useState(90)
  const [mfaEnabled, setMfaEnabled] = useState(true)
  const [loggingPolicy, setLoggingPolicy] = useState("Complète")

  useEffect(() => {
    async function load() {
      const activeSettings = await getSecuritySettings()
      setSettings(activeSettings)
      
      // Bind form
      setMinPasswordLength(activeSettings.min_password_length)
      setRequireComplexity(activeSettings.require_complexity)
      setMaxLoginAttempts(activeSettings.max_login_attempts)
      setLockoutDuration(activeSettings.lockout_duration)
      setMaxSessionDuration(activeSettings.max_session_duration)
      setPasswordValidityDays(activeSettings.password_validity_days)
      setMfaEnabled(activeSettings.mfa_enabled)
      setLoggingPolicy(activeSettings.logging_policy)
    }
    load()
  }, [])

  if (!settings) {
    return <div className="text-center py-10">Chargement...</div>
  }

  const handleSave = async () => {
    setIsSaving(true)

    const updated: SecuritySettings = {
      min_password_length: minPasswordLength,
      require_complexity: requireComplexity,
      max_login_attempts: maxLoginAttempts,
      lockout_duration: lockoutDuration,
      max_session_duration: maxSessionDuration,
      password_validity_days: passwordValidityDays,
      mfa_enabled: mfaEnabled,
      logging_policy: loggingPolicy
    }

    const success = await saveSecuritySettings(updated)
    setIsSaving(false)
    if (success) {
      toast.success("Paramètres de sécurité mis à jour avec succès !")
    } else {
      toast.error("Erreur lors de la mise à jour des paramètres.")
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out max-w-4xl mx-auto pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Paramètres de Sécurité d'Accès</h2>
          <p className="text-muted-foreground mt-1">
            Configurez la politique de mot de passe, de verrouillage brute-force et de double authentification.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="shadow-md bg-[#0B5ED7] hover:bg-[#094bb3] text-white">
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Section: Passwords Policy */}
        <Card className="border-border/50 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-4 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Politique des Mots de Passe
            </CardTitle>
            <CardDescription className="text-xs">
              Directives de force et de complexité des mots de passe.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Longueur minimale du mot de passe</label>
              <Input 
                type="number"
                value={minPasswordLength}
                onChange={e => setMinPasswordLength(parseInt(e.target.value) || 8)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Durée de validité des mots de passe (jours)</label>
              <Input 
                type="number"
                value={passwordValidityDays}
                onChange={e => setPasswordValidityDays(parseInt(e.target.value) || 90)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-bold text-foreground">Exiger la complexité</p>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Exiger lettres majuscules, minuscules, chiffres et caractères spéciaux.
                </p>
              </div>
              <Switch 
                checked={requireComplexity}
                onCheckedChange={setRequireComplexity}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="space-y-0.5 pr-4">
                <p className="text-xs font-bold text-foreground">Double Authentification (MFA) Obligatoire</p>
                <p className="text-[10px] text-muted-foreground leading-normal">
                  Imposer la configuration d'un OTP par e-mail ou application d'authentification.
                </p>
              </div>
              <Switch 
                checked={mfaEnabled}
                onCheckedChange={setMfaEnabled}
              />
            </div>

          </CardContent>
        </Card>

        {/* Section: Brute-Force & Lockout Policy */}
        <Card className="border-border/50 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-4 bg-muted/10 border-b border-border/50">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Politique de Verrouillage & Sessions
            </CardTitle>
            <CardDescription className="text-xs">
              Limites de sécurité contre les attaques par force brute et gestion d'inactivité.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Nombre maximal de tentatives de connexion</label>
              <Input 
                type="number"
                value={maxLoginAttempts}
                onChange={e => setMaxLoginAttempts(parseInt(e.target.value) || 5)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Durée de verrouillage temporaire (minutes)</label>
              <Input 
                type="number"
                value={lockoutDuration}
                onChange={e => setLockoutDuration(parseInt(e.target.value) || 15)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground/80">Durée d'inactivité avant déconnexion automatique (minutes)</label>
              <Input 
                type="number"
                value={maxSessionDuration}
                onChange={e => setMaxSessionDuration(parseInt(e.target.value) || 30)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1 pt-2 border-t border-border/50">
              <label className="text-xs font-semibold text-foreground/80">Politique de journalisation d'audit</label>
              <Select value={loggingPolicy} onValueChange={(val) => setLoggingPolicy(val || "Complète")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basique">Basique (Connexions et erreurs)</SelectItem>
                  <SelectItem value="Moyenne">Moyenne (Actions critiques de stock)</SelectItem>
                  <SelectItem value="Complète">Complète (Toutes les actions d'administration et d'audit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

      </div>

    </div>
  )
}
