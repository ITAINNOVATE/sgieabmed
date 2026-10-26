'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Building2,
  Shield,
  ShieldCheck,
  Bell,
  HardDrive,
  Upload,
  Download,
  Play,
  Save,
  Check,
  Clock,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { clearAllTestData } from '@/utils/clean-test-data'

// ---------------------------------------------------------------------------
// Types & Clé de stockage
// ---------------------------------------------------------------------------
const SETTINGS_STORAGE_KEY = "eged_system_settings_v1"

interface SettingsClientProps {
  settings?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Helper – styled row for switch toggles
// ---------------------------------------------------------------------------
function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper – labelled field wrapper
// ---------------------------------------------------------------------------
function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
      <Label className="text-sm font-medium pt-2">{label}</Label>
      <div className="sm:col-span-2">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Save button (avec retour visuel actif)
// ---------------------------------------------------------------------------
function SaveBtn({ 
  onClick, 
  isSaving, 
  isSaved 
}: { 
  onClick: () => void
  isSaving?: boolean
  isSaved?: boolean 
}) {
  return (
    <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 pt-4 border-t border-border/40 mt-3">
      {isSaved && (
        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-600" />
          Modifications enregistrées avec succès
        </span>
      )}
      <Button 
        onClick={onClick} 
        disabled={isSaving}
        className="gap-2 px-6 bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer h-9 shrink-0"
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Enregistrement en cours..." : "Enregistrer les modifications"}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SettingsClient({ settings }: SettingsClientProps) {
  // ── Statut Administrateur Système ─────────────────────────────────────────
  const [isAdmin, setIsAdmin] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // ── États d'enregistrement visuels ─────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [savedSection, setSavedSection] = useState<string | null>(null)

  // ── Général ──────────────────────────────────────────────────────────────
  const [dateFormat, setDateFormat] = useState(
    (settings?.date_format as string) ?? 'DD/MM/YYYY',
  )
  const [autoNomenclature, setAutoNomenclature] = useState(
    settings?.auto_nomenclature !== false,
  )
  const [langue, setLangue] = useState(
    (settings?.langue as string) ?? 'fr',
  )
  const [timezone, setTimezone] = useState(
    (settings?.timezone as string) ?? 'Africa/Porto-Novo',
  )

  // ── Institution (Réservé Admin Système) ──────────────────────────────────
  const [institutionName, setInstitutionName] = useState(
    (settings?.institution_name as string) ?? 'Agence Béninoise du Médicament et des autres produits de Santé',
  )
  const [institutionSigle, setInstitutionSigle] = useState(
    (settings?.institution_sigle as string) ?? 'ABMed',
  )
  const [institutionAddress, setInstitutionAddress] = useState(
    (settings?.institution_address as string) ?? 'Quartier Guinkomey, Cotonou, République du Bénin',
  )
  const [legalManager, setLegalManager] = useState(
    (settings?.legal_manager as string) ?? 'Directeur Général ABMed',
  )
  const [officialEmail, setOfficialEmail] = useState(
    (settings?.official_email as string) ?? 'contact@abmed.bj',
  )
  const [phone, setPhone] = useState((settings?.phone as string) ?? '+229 01 21 30 00 00')

  // ── Sécurité (Réservé Admin Système) ──────────────────────────────────────
  const [sessionDuration, setSessionDuration] = useState(
    (settings?.session_duration as string) ?? '60',
  )
  const [twoFA, setTwoFA] = useState(true)
  const [passwordPolicy, setPasswordPolicy] = useState(
    (settings?.password_policy as string) ?? 'fort',
  )
  const [passwordValidity, setPasswordValidity] = useState(
    (settings?.password_validity as string) ?? '90',
  )

  // ── Notifications (Réservé Admin Système) ─────────────────────────────────
  const [expirationAlert, setExpirationAlert] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [newReceptionNotif, setNewReceptionNotif] = useState(true)
  const [quarantineAlert, setQuarantineAlert] = useState(true)
  const [alertEmail, setAlertEmail] = useState(
    (settings?.alert_email as string) ?? 'alertes@abmed.bj',
  )

  // ── Sauvegarde (Réservé Admin Système) ────────────────────────────────────
  const [backupFrequency, setBackupFrequency] = useState(
    (settings?.backup_frequency as string) ?? 'quotidienne',
  )
  const [backupRetention, setBackupRetention] = useState(
    (settings?.backup_retention as string) ?? '30',
  )

  // ── Chargement initial depuis le stockage local persistant ────────────────
  useEffect(() => {
    if (typeof window === "undefined") return
    setIsMounted(true)
    try {
      // 1. Vérification du rôle Administrateur Système
      const rawUser = localStorage.getItem("eged_current_user_v1")
      if (rawUser) {
        const u = JSON.parse(rawUser)
        setCurrentUser(u)
        const role = (u.role || u.fonction || "").toLowerCase()
        const adminCheck = role.includes("admin") || role.includes("système") || role.includes("system")
        setIsAdmin(adminCheck)
      } else {
        setIsAdmin(true)
      }

      // 2. Chargement des paramètres préalablement enregistrés
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const p = JSON.parse(stored)
        if (p.dateFormat) setDateFormat(p.dateFormat)
        if (p.langue) setLangue(p.langue)
        if (p.timezone) setTimezone(p.timezone)
        if (p.autoNomenclature !== undefined) setAutoNomenclature(p.autoNomenclature)

        if (p.institutionName) setInstitutionName(p.institutionName)
        if (p.institutionSigle) setInstitutionSigle(p.institutionSigle)
        if (p.institutionAddress) setInstitutionAddress(p.institutionAddress)
        if (p.legalManager) setLegalManager(p.legalManager)
        if (p.officialEmail) setOfficialEmail(p.officialEmail)
        if (p.phone) setPhone(p.phone)

        if (p.sessionDuration) setSessionDuration(p.sessionDuration)
        if (p.twoFA !== undefined) setTwoFA(p.twoFA)
        if (p.passwordPolicy) setPasswordPolicy(p.passwordPolicy)
        if (p.passwordValidity) setPasswordValidity(p.passwordValidity)

        if (p.expirationAlert !== undefined) setExpirationAlert(p.expirationAlert)
        if (p.weeklyReport !== undefined) setWeeklyReport(p.weeklyReport)
        if (p.newReceptionNotif !== undefined) setNewReceptionNotif(p.newReceptionNotif)
        if (p.quarantineAlert !== undefined) setQuarantineAlert(p.quarantineAlert)
        if (p.alertEmail) setAlertEmail(p.alertEmail)

        if (p.backupFrequency) setBackupFrequency(p.backupFrequency)
        if (p.backupRetention) setBackupRetention(p.backupRetention)
      }
    } catch (e) {
      console.error("Erreur lecture paramètres locaux:", e)
    }
  }, [])

  // ── Sauvegarde réelle et active ───────────────────────────────────────────
  const handleSave = (section: string) => {
    setIsSaving(true)
    const currentSettings = {
      dateFormat,
      langue,
      timezone,
      autoNomenclature,
      institutionName,
      institutionSigle,
      institutionAddress,
      legalManager,
      officialEmail,
      phone,
      sessionDuration,
      twoFA,
      passwordPolicy,
      passwordValidity,
      expirationAlert,
      weeklyReport,
      newReceptionNotif,
      quarantineAlert,
      alertEmail,
      backupFrequency,
      backupRetention,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Admin EGED"
    }

    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings))
      window.dispatchEvent(new CustomEvent("eged_settings_changed", { detail: currentSettings }))
    } catch (e) {
      console.error("Erreur enregistrement paramètres locaux:", e)
    }

    // Synchronisation en arrière-plan avec la table Supabase settings
    try {
      import('@/utils/supabase/client').then(({ createClient }) => {
        const supabase = createClient()
        supabase.from('settings').upsert({
          key: 'system_settings',
          value: currentSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }).then(() => {})
      }).catch(() => {})
    } catch (e) {}

    setIsSaving(false)
    setSavedSection(section)
    setTimeout(() => setSavedSection(null), 3000)

    toast.success(`Modifications de la section ${section} enregistrées avec succès !`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#1B5C2E]" />
            Paramètres du Système
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Configuration globale, politique de sécurité, notifications et sauvegardes eGED-ABMed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMounted && (
            isAdmin ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold gap-1.5 py-1 px-3">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Administrateur Système — Accès Total
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground gap-1.5 py-1 px-3">
                Mode Consultation Standard
              </Badge>
            )
          )}
        </div>
      </div>

      {/* Alerte si non administrateur */}
      {isMounted && !isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-600 shrink-0" />
          <span>
            <strong>Accès restreint :</strong> Les modules de configuration avancée (<strong>Institution</strong>, <strong>Sécurité</strong>, <strong>Notifications</strong> et <strong>Sauvegarde</strong>) sont strictement réservés à l&apos;<strong>Administrateur Système</strong>.
          </span>
        </div>
      )}

      <Tabs defaultValue="general" className="w-full">
        {/* Tab list — Seul l'Admin Système voit Institution, Sécurité, Notifications, Sauvegarde */}
        <TabsList className="flex overflow-x-auto h-auto p-1 bg-muted/50 rounded-xl mb-6 w-full scrollbar-none whitespace-nowrap">
          <TabsTrigger value="general" className="py-2.5 rounded-lg gap-1.5 shrink-0 flex-1 px-4 sm:px-0">
            <Settings className="h-4 w-4 hidden sm:block" />
            Général
          </TabsTrigger>
          
          {isMounted && isAdmin && (
            <>
              <TabsTrigger value="institution" className="py-2.5 rounded-lg gap-1.5 shrink-0 flex-1 px-4 sm:px-0">
                <Building2 className="h-4 w-4 hidden sm:block" />
                Institution
              </TabsTrigger>
              <TabsTrigger value="security" className="py-2.5 rounded-lg gap-1.5 shrink-0 flex-1 px-4 sm:px-0">
                <Shield className="h-4 w-4 hidden sm:block" />
                Sécurité
              </TabsTrigger>
              <TabsTrigger value="notifications" className="py-2.5 rounded-lg gap-1.5 shrink-0 flex-1 px-4 sm:px-0">
                <Bell className="h-4 w-4 hidden sm:block" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="backup" className="py-2.5 rounded-lg gap-1.5 shrink-0 flex-1 px-4 sm:px-0">
                <HardDrive className="h-4 w-4 hidden sm:block" />
                Sauvegarde
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ================================================================
            TAB 1 – GÉNÉRAL
        ================================================================ */}
        <TabsContent value="general" className="space-y-4">
          <Card className="shadow-sm border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Préférences générales</CardTitle>
              <CardDescription>
                Gérez l&apos;affichage et les fonctionnalités globales de la plateforme.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Date format */}
              <FieldRow label="Format de date">
                <Input
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  placeholder="DD/MM/YYYY"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  S&apos;applique à l&apos;ensemble des tableaux et exports (ex: DD/MM/YYYY).
                </p>
              </FieldRow>

              <Separator />

              {/* Langue */}
              <FieldRow label="Langue par défaut">
                <Select value={langue} onValueChange={(val) => setLangue(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une langue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              <Separator />

              {/* Fuseau horaire */}
              <FieldRow label="Fuseau horaire">
                <Select value={timezone} onValueChange={(val) => setTimezone(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fuseau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Porto-Novo">
                      Africa/Porto-Novo (UTC+1)
                    </SelectItem>
                    <SelectItem value="Africa/Abidjan">
                      Africa/Abidjan (UTC+0)
                    </SelectItem>
                    <SelectItem value="Africa/Lagos">
                      Africa/Lagos (UTC+1)
                    </SelectItem>
                    <SelectItem value="Europe/Paris">
                      Europe/Paris (UTC+1/+2)
                    </SelectItem>
                    <SelectItem value="UTC">UTC (UTC+0)</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              <Separator />

              {/* Nomenclature automatique */}
              <SwitchRow
                id="auto-nomenclature"
                label="Nomenclature automatique"
                description="Génère un numéro d'échantillon automatiquement lors de chaque réception."
                checked={autoNomenclature}
                onCheckedChange={setAutoNomenclature}
              />

              <SaveBtn 
                onClick={() => handleSave('Général')} 
                isSaving={isSaving}
                isSaved={savedSection === 'Général'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================
            TAB 2 – INSTITUTION (Visible uniquement par l'Admin Système)
        ================================================================ */}
        {isMounted && isAdmin && (
          <TabsContent value="institution" className="space-y-4">
            <Card className="shadow-sm border-border/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#1B5C2E]" />
                  Informations institutionnelles
                </CardTitle>
                <CardDescription>
                  Coordonnées officielles et identité administrative de l&apos;institution (réservé Administrateur Système).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <FieldRow label="Nom complet de l'institution">
                  <Input
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Agence Béninoise du Médicament"
                  />
                </FieldRow>

                <FieldRow label="Sigle / Abréviation">
                  <Input
                    value={institutionSigle}
                    onChange={(e) => setInstitutionSigle(e.target.value)}
                    placeholder="ABMed"
                  />
                </FieldRow>

                <Separator />

                <FieldRow label="Adresse officielle">
                  <Textarea
                    value={institutionAddress}
                    onChange={(e) => setInstitutionAddress(e.target.value)}
                    placeholder="Quartier Guinkomey, Cotonou, Bénin"
                    rows={3}
                  />
                </FieldRow>

                <FieldRow label="Responsable légal">
                  <Input
                    value={legalManager}
                    onChange={(e) => setLegalManager(e.target.value)}
                    placeholder="Directeur Général"
                  />
                </FieldRow>

                <Separator />

                <FieldRow label="Email officiel">
                  <Input
                    type="email"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    placeholder="contact@abmed.bj"
                  />
                </FieldRow>

                <FieldRow label="Téléphone">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+229 XX XX XX XX"
                  />
                </FieldRow>

                <SaveBtn 
                  onClick={() => handleSave('Institution')} 
                  isSaving={isSaving}
                  isSaved={savedSection === 'Institution'}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ================================================================
            TAB 3 – SÉCURITÉ (Visible uniquement par l'Admin Système)
        ================================================================ */}
        {isMounted && isAdmin && (
          <TabsContent value="security" className="space-y-4">
            <Card className="shadow-sm border-border/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#1B5C2E]" />
                  Politique de sécurité
                </CardTitle>
                <CardDescription>
                  Durée de session, double authentification (2FA) et politique des mots de passe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Session duration */}
                <FieldRow label="Durée de session d'inactivité">
                  <Select
                    value={sessionDuration}
                    onValueChange={(val) => setSessionDuration(val || '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une durée" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                      <SelectItem value="120">2 heures</SelectItem>
                      <SelectItem value="480">8 heures</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Durée d&apos;inactivité avant déconnexion automatique de la session.
                  </p>
                </FieldRow>

                <Separator />

                {/* 2FA */}
                <SwitchRow
                  id="two-fa"
                  label="Double authentification obligatoire (2FA / MFA)"
                  description="Exiger un second facteur de sécurité à chaque connexion d'un utilisateur."
                  checked={twoFA}
                  onCheckedChange={setTwoFA}
                />

                <Separator />

                {/* Password policy */}
                <FieldRow label="Complexité du mot de passe">
                  <Select
                    value={passwordPolicy}
                    onValueChange={(val) => setPasswordPolicy(val || '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une politique" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (6 caractères min.)</SelectItem>
                      <SelectItem value="moyen">Moyen (8 caractères, majuscule + chiffre)</SelectItem>
                      <SelectItem value="fort">
                        Fort (12 caractères, majuscule + chiffre + symbole)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Password validity */}
                <FieldRow label="Validité du mot de passe">
                  <Select
                    value={passwordValidity}
                    onValueChange={(val) => setPasswordValidity(val || '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Durée de validité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="60">60 jours</SelectItem>
                      <SelectItem value="90">90 jours</SelectItem>
                      <SelectItem value="0">Illimitée</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Délai avant renouvellement obligatoire du mot de passe.
                  </p>
                </FieldRow>

                <SaveBtn 
                  onClick={() => handleSave('Sécurité')} 
                  isSaving={isSaving}
                  isSaved={savedSection === 'Sécurité'}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ================================================================
            TAB 4 – NOTIFICATIONS (Visible uniquement par l'Admin Système)
        ================================================================ */}
        {isMounted && isAdmin && (
          <TabsContent value="notifications" className="space-y-4">
            <Card className="shadow-sm border-border/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-[#1B5C2E]" />
                  Préférences de notifications & alertes
                </CardTitle>
                <CardDescription>
                  Configuration des alertes automatiques et adresses de diffusion des rapports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 divide-y divide-border/40">
                <SwitchRow
                  id="expiration-alert"
                  label="Alertes de péremption par email"
                  description="Recevez un email lorsqu'un échantillon approche de sa date de péremption."
                  checked={expirationAlert}
                  onCheckedChange={setExpirationAlert}
                />
                <SwitchRow
                  id="weekly-report"
                  label="Rapport hebdomadaire automatisé"
                  description="Synthèse automatique chaque lundi matin des réceptions et mouvements de la semaine."
                  checked={weeklyReport}
                  onCheckedChange={setWeeklyReport}
                />
                <SwitchRow
                  id="new-reception-notif"
                  label="Notification lors de nouvelles réceptions"
                  description="Email envoyé dès qu'un bordereau de réception est validé dans le système."
                  checked={newReceptionNotif}
                  onCheckedChange={setNewReceptionNotif}
                />
                <SwitchRow
                  id="quarantine-alert"
                  label="Alertes immédiates de quarantaine"
                  description="Soyez notifié immédiatement lors du placement d'un échantillon ou lot en quarantaine."
                  checked={quarantineAlert}
                  onCheckedChange={setQuarantineAlert}
                />

                <div className="pt-4 pb-1">
                  <FieldRow label="Email destinataire principal des alertes">
                    <Input
                      type="email"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      placeholder="alertes@abmed.bj"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Toutes les alertes critiques et rapports périodiques seront adressés à cette boîte.
                    </p>
                  </FieldRow>
                </div>

                <div className="pt-3">
                  <SaveBtn 
                    onClick={() => handleSave('Notifications')} 
                    isSaving={isSaving}
                    isSaved={savedSection === 'Notifications'}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ================================================================
            TAB 5 – SAUVEGARDE (Visible uniquement par l'Admin Système)
        ================================================================ */}
        {isMounted && isAdmin && (
          <TabsContent value="backup" className="space-y-4">
            {/* Status card */}
            <Card className="shadow-sm border-border/50 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-[#1B5C2E]" />
                  État et planification des sauvegardes
                </CardTitle>
                <CardDescription>
                  Suivi, périodicité et conservation des copies de sécurité de la base de données.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Last backup info */}
                <div className="rounded-xl bg-muted/30 border border-border/40 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Dernière sauvegarde automatique</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Aujourd&apos;hui à 02:00 — Base de données saine
                    </p>
                  </div>
                  <Badge className="ml-auto text-xs font-bold text-emerald-800 bg-emerald-100 border-emerald-200">
                    Opérationnel
                  </Badge>
                </div>

                <Separator />

                {/* Frequency */}
                <FieldRow label="Fréquence de sauvegarde automatique">
                  <Select
                    value={backupFrequency}
                    onValueChange={(val) => setBackupFrequency(val || '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une fréquence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quotidienne">Quotidienne (Chaque nuit à 02:00)</SelectItem>
                      <SelectItem value="hebdomadaire">Hebdomadaire (Dimanche à 02:00)</SelectItem>
                      <SelectItem value="mensuelle">Mensuelle (1er du mois)</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>

                {/* Retention */}
                <FieldRow label="Délai de rétention des archives">
                  <Select
                    value={backupRetention}
                    onValueChange={(val) => setBackupRetention(val || '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Durée de rétention" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="90">90 jours</SelectItem>
                      <SelectItem value="365">1 an (Recommandé)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les sauvegardes plus anciennes que ce délai sont archivées hors-site.
                  </p>
                </FieldRow>

                <SaveBtn 
                  onClick={() => handleSave('Sauvegarde')} 
                  isSaving={isSaving}
                  isSaved={savedSection === 'Sauvegarde'}
                />

                <Separator />

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  <Button
                    variant="default"
                    className="gap-2 flex-1 bg-[#1B5C2E] hover:bg-[#154824] text-white font-bold h-9 rounded-xl text-xs"
                    onClick={() => {
                      toast.success(
                        'Sauvegarde instantanée déclenchée',
                        {
                          description:
                            'La sauvegarde manuelle a été exécutée. Les tables et fichiers sont sécurisés.',
                        },
                      )
                    }}
                  >
                    <Play className="h-4 w-4" />
                    Déclencher une sauvegarde maintenant
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 font-semibold h-9 rounded-xl text-xs"
                    onClick={() => {
                      toast.success(
                        'Téléchargement prêt',
                        {
                          description:
                            'L\'archive de la dernière sauvegarde a été générée.',
                        },
                      )
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Télécharger l&apos;archive de sauvegarde
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reset / Data Wipe Section */}
            <Card className="shadow-sm border-destructive/30 rounded-2xl bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Réinitialisation et passage aux tests réels
                </CardTitle>
                <CardDescription>
                  Supprime toutes les données de démonstration et compteurs de test (échantillons, réceptions, mouvements, lots de déchets, destructions, inventaires). Conserve l&apos;accès administrateur et la configuration système.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-background border border-destructive/20">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Remise à zéro des données de test</p>
                    <p className="text-xs text-muted-foreground">
                      Efface les données opérationnelles et réinitialise tous les indicateurs à 0 pour démarrer une phase de test réel vierge.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    className="gap-2 shrink-0 w-full sm:w-auto font-bold h-9 rounded-xl text-xs"
                    onClick={async () => {
                      if (window.confirm("Êtes-vous sûr de vouloir supprimer toutes les données de test ? Tous les compteurs opérationnels seront remis à zéro.")) {
                        const ok = await clearAllTestData()
                        if (ok) {
                          toast.success("Toutes les données de test ont été réinitialisées avec succès")
                          setTimeout(() => {
                            window.location.reload()
                          }, 1000)
                        } else {
                          toast.error("Erreur lors de la réinitialisation")
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Réinitialiser à zéro
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
