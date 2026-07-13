'use client'

import { useState } from 'react'
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
  Bell,
  HardDrive,
  Upload,
  Download,
  Play,
  Save,
  Clock,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SettingsClientProps {
  settings: Record<string, unknown>
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
// Save button (shared)
// ---------------------------------------------------------------------------
function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onClick} className="gap-2 px-6">
        <Save className="h-4 w-4" />
        Enregistrer
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SettingsClient({ settings }: SettingsClientProps) {
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

  // ── Institution ───────────────────────────────────────────────────────────
  const [institutionName, setInstitutionName] = useState(
    (settings?.institution_name as string) ?? 'Agence Béninoise des Médicaments',
  )
  const [institutionSigle, setInstitutionSigle] = useState(
    (settings?.institution_sigle as string) ?? 'ABMed',
  )
  const [institutionAddress, setInstitutionAddress] = useState(
    (settings?.institution_address as string) ?? '',
  )
  const [legalManager, setLegalManager] = useState(
    (settings?.legal_manager as string) ?? '',
  )
  const [officialEmail, setOfficialEmail] = useState(
    (settings?.official_email as string) ?? '',
  )
  const [phone, setPhone] = useState((settings?.phone as string) ?? '')

  // ── Sécurité ──────────────────────────────────────────────────────────────
  const [sessionDuration, setSessionDuration] = useState(
    (settings?.session_duration as string) ?? '60',
  )
  const [twoFA, setTwoFA] = useState(settings?.two_fa === true)
  const [passwordPolicy, setPasswordPolicy] = useState(
    (settings?.password_policy as string) ?? 'moyen',
  )
  const [passwordValidity, setPasswordValidity] = useState(
    (settings?.password_validity as string) ?? '90',
  )

  // ── Notifications ─────────────────────────────────────────────────────────
  const [expirationAlert, setExpirationAlert] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(false)
  const [newReceptionNotif, setNewReceptionNotif] = useState(true)
  const [quarantineAlert, setQuarantineAlert] = useState(true)
  const [alertEmail, setAlertEmail] = useState(
    (settings?.alert_email as string) ?? '',
  )

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const [backupFrequency, setBackupFrequency] = useState(
    (settings?.backup_frequency as string) ?? 'quotidienne',
  )
  const [backupRetention, setBackupRetention] = useState(
    (settings?.backup_retention as string) ?? '30',
  )

  // ── Save handlers ─────────────────────────────────────────────────────────
  const handleSave = (section?: string) => {
    const label = section ? `Paramètres ${section} sauvegardés` : 'Paramètres sauvegardés avec succès'
    toast.success(label)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Paramètres du Système
        </h2>
        <p className="text-muted-foreground text-sm">
          Configuration globale de la plateforme eGED-ABMed.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        {/* Tab list */}
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="general" className="py-2.5 rounded-lg gap-1.5">
            <Settings className="h-4 w-4 hidden sm:block" />
            Général
          </TabsTrigger>
          <TabsTrigger value="institution" className="py-2.5 rounded-lg gap-1.5">
            <Building2 className="h-4 w-4 hidden sm:block" />
            Institution
          </TabsTrigger>
          <TabsTrigger value="security" className="py-2.5 rounded-lg gap-1.5">
            <Shield className="h-4 w-4 hidden sm:block" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="notifications" className="py-2.5 rounded-lg gap-1.5">
            <Bell className="h-4 w-4 hidden sm:block" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="backup" className="py-2.5 rounded-lg gap-1.5">
            <HardDrive className="h-4 w-4 hidden sm:block" />
            Sauvegarde
          </TabsTrigger>
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
                <Select value={langue} onValueChange={setLangue}>
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
                <Select value={timezone} onValueChange={setTimezone}>
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

              <SaveBtn onClick={() => handleSave('généraux')} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================
            TAB 2 – INSTITUTION
        ================================================================ */}
        <TabsContent value="institution" className="space-y-4">
          <Card className="shadow-sm border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">
                Informations institutionnelles
              </CardTitle>
              <CardDescription>
                Coordonnées officielles et identité visuelle de l&apos;institution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FieldRow label="Nom complet de l'institution">
                <Input
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Agence Béninoise des Médicaments"
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

              <FieldRow label="Adresse">
                <Textarea
                  value={institutionAddress}
                  onChange={(e) => setInstitutionAddress(e.target.value)}
                  placeholder="Avenue Jean-Paul II, Cotonou, Bénin"
                  rows={3}
                />
              </FieldRow>

              <FieldRow label="Responsable légal">
                <Input
                  value={legalManager}
                  onChange={(e) => setLegalManager(e.target.value)}
                  placeholder="Nom et prénom du directeur général"
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

              <Separator />

              {/* Logo upload placeholder */}
              <FieldRow label="Logo de l'institution">
                <div className="border-2 border-dashed border-border/60 rounded-xl p-6 flex flex-col items-center gap-3 text-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Cliquez pour importer un logo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, SVG — max 2 Mo
                    </p>
                  </div>
                  <Button variant="outline" size="sm" type="button">
                    Parcourir…
                  </Button>
                </div>
              </FieldRow>

              <SaveBtn onClick={() => handleSave('institution')} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================
            TAB 3 – SÉCURITÉ
        ================================================================ */}
        <TabsContent value="security" className="space-y-4">
          <Card className="shadow-sm border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">
                Politique de sécurité
              </CardTitle>
              <CardDescription>
                Durée de session, authentification et complexité des mots de passe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Session duration */}
              <FieldRow label="Durée de session">
                <Select
                  value={sessionDuration}
                  onValueChange={setSessionDuration}
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
                  Durée d&apos;inactivité avant déconnexion automatique.
                </p>
              </FieldRow>

              <Separator />

              {/* 2FA */}
              <SwitchRow
                id="two-fa"
                label="Double authentification (2FA)"
                description="Exiger un second facteur (TOTP) à chaque connexion utilisateur."
                checked={twoFA}
                onCheckedChange={setTwoFA}
              />

              <Separator />

              {/* Password policy */}
              <FieldRow label="Politique de mot de passe">
                <Select
                  value={passwordPolicy}
                  onValueChange={setPasswordPolicy}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une politique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple (6 caractères min.)</SelectItem>
                    <SelectItem value="moyen">Moyen (8 car., majuscule + chiffre)</SelectItem>
                    <SelectItem value="fort">
                      Fort (12 car., maj + chiffre + symbole)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Password validity */}
              <FieldRow label="Durée de validité">
                <Select
                  value={passwordValidity}
                  onValueChange={setPasswordValidity}
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
                  Délai avant expiration obligatoire du mot de passe.
                </p>
              </FieldRow>

              <SaveBtn onClick={() => handleSave('sécurité')} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================
            TAB 4 – NOTIFICATIONS
        ================================================================ */}
        <TabsContent value="notifications" className="space-y-4">
          <Card className="shadow-sm border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Préférences de notifications</CardTitle>
              <CardDescription>
                Choisissez les alertes et rapports à recevoir par email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 divide-y divide-border/40">
              <SwitchRow
                id="expiration-alert"
                label="Alertes d'expiration par email"
                description="Recevez un email lorsqu'un échantillon approche de sa date de péremption."
                checked={expirationAlert}
                onCheckedChange={setExpirationAlert}
              />
              <SwitchRow
                id="weekly-report"
                label="Rapport hebdomadaire"
                description="Synthèse automatique chaque lundi matin des mouvements de la semaine."
                checked={weeklyReport}
                onCheckedChange={setWeeklyReport}
              />
              <SwitchRow
                id="new-reception-notif"
                label="Notification de nouvelle réception"
                description="Email envoyé dès qu'un nouvel échantillon est réceptionné dans le système."
                checked={newReceptionNotif}
                onCheckedChange={setNewReceptionNotif}
              />
              <SwitchRow
                id="quarantine-alert"
                label="Alertes de quarantaine"
                description="Soyez notifié immédiatement lors du placement d'un échantillon en quarantaine."
                checked={quarantineAlert}
                onCheckedChange={setQuarantineAlert}
              />

              <div className="pt-4 pb-1">
                <FieldRow label="Email destinataire des alertes">
                  <Input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="responsable@abmed.bj"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Toutes les alertes système seront adressées à cette adresse.
                  </p>
                </FieldRow>
              </div>

              <div className="pt-3">
                <SaveBtn onClick={() => handleSave('notifications')} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================================================================
            TAB 5 – SAUVEGARDE
        ================================================================ */}
        <TabsContent value="backup" className="space-y-4">
          {/* Status card */}
          <Card className="shadow-sm border-border/50 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                État des sauvegardes
              </CardTitle>
              <CardDescription>
                Suivi et planification des sauvegardes de base de données.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Last backup info */}
              <div className="rounded-xl bg-muted/30 border border-border/40 p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Dernière sauvegarde réussie</p>
                  <p className="text-sm text-muted-foreground">
                    Dimanche 12 juillet 2026 à 02:00 — 128 Mo
                  </p>
                </div>
                <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
                  Réussi
                </span>
              </div>

              {/* Next backup progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Prochain backup dans 8h</span>
                  <span className="text-muted-foreground">67%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: '67%' }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Prochaine sauvegarde automatique : lundi 13 juillet 2026 à 02:00
                </p>
              </div>

              <Separator />

              {/* Frequency */}
              <FieldRow label="Fréquence de sauvegarde automatique">
                <Select
                  value={backupFrequency}
                  onValueChange={setBackupFrequency}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une fréquence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotidienne">Quotidienne</SelectItem>
                    <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="mensuelle">Mensuelle</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>

              {/* Retention */}
              <FieldRow label="Rétention des sauvegardes">
                <Select
                  value={backupRetention}
                  onValueChange={setBackupRetention}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Durée de rétention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Les sauvegardes plus anciennes seront automatiquement supprimées.
                </p>
              </FieldRow>

              <SaveBtn onClick={() => handleSave('sauvegarde')} />

              <Separator />

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="default"
                  className="gap-2 flex-1"
                  onClick={() => {
                    toast.success(
                      'Sauvegarde déclenchée',
                      {
                        description:
                          'La sauvegarde manuelle a été lancée. Vous serez notifié à la fin.',
                      },
                    )
                  }}
                >
                  <Play className="h-4 w-4" />
                  Déclencher une sauvegarde maintenant
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 flex-1"
                  onClick={() => {
                    toast.success(
                      'Téléchargement démarré',
                      {
                        description:
                          'La dernière sauvegarde est en cours de préparation pour le téléchargement.',
                      },
                    )
                  }}
                >
                  <Download className="h-4 w-4" />
                  Télécharger la dernière sauvegarde
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
