"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  User, Shield, Mail, Phone, Building2, KeyRound, 
  CheckCircle2, Lock, ArrowLeft, Save, ShieldCheck 
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function UserProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [phone, setPhone] = useState("+229 97 00 01 02")
  const [email, setEmail] = useState("marie.adande@abmed.bj")

  const handleSave = () => {
    setIsEditing(false)
    toast.success("Profil mis à jour avec succès !")
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl mx-auto">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-card p-3 rounded-xl border border-border/70 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-8 w-8 shrink-0 rounded-lg">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-[#1B5C2E]" />
              Profil Utilisateur — eGED ABMed
            </h2>
            <p className="text-muted-foreground text-[11px]">Informations du compte, rôle, habilitations de sécurité et préférences.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button size="sm" onClick={handleSave} className="h-8 text-xs font-bold px-3 bg-[#1B5C2E] hover:bg-[#154824] text-white border-0 gap-1.5">
              <Save className="h-3.5 w-3.5" /> Enregistrer
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="h-8 text-xs font-bold px-3">
              Modifier mes infos
            </Button>
          )}
        </div>
      </div>

      {/* FICHE PROFIL EN 2 COLONNES STATIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        
        {/* COLONNE GAUCHE : CARTE IDENTITÉ */}
        <Card className="md:col-span-4 shadow-2xs border border-border/70 rounded-xl bg-card flex flex-col items-center justify-center p-4 text-center">
          <Avatar className="h-20 w-20 border-4 border-[#1B5C2E]/20 shadow-md mb-2">
            <AvatarImage src="/avatar.png" alt="Marie ADANDE" />
            <AvatarFallback className="bg-[#1B5C2E] text-white font-bold text-xl">MA</AvatarFallback>
          </Avatar>
          
          <h3 className="text-base font-black text-foreground leading-tight">Marie ADANDE</h3>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Administrateur Système & Sécurité</p>

          <div className="flex items-center gap-1.5 mt-2">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] gap-1">
              <CheckCircle2 className="h-3 w-3" /> Compte Actif
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-background">
              Matricule: ABM-001
            </Badge>
          </div>

          <div className="w-full pt-3 mt-3 border-t border-border/50 text-left space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Service :</span>
              <span className="font-bold text-foreground">Direction SI</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Rôle :</span>
              <span className="font-bold text-[#1B5C2E]">ADMIN_SYS</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Sécurité MFA :</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Activée
              </span>
            </div>
          </div>
        </Card>

        {/* COLONNE DROITE : DÉTAILS DU COMPTE ET HABILITATIONS */}
        <Card className="md:col-span-8 shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardHeader className="p-3 pb-2 border-b border-border/50">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[#1B5C2E]" /> Informations Personnelles & Sécurité
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Adresse Email</label>
                {isEditing ? (
                  <Input value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-xs bg-background" />
                ) : (
                  <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border bg-muted/20 text-xs font-medium">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Téléphone professionnel</label>
                {isEditing ? (
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-8 text-xs bg-background" />
                ) : (
                  <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border bg-muted/20 text-xs font-medium">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Direction / Département</label>
                <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border bg-muted/20 text-xs font-medium">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Systèmes d'Information & Digitalisation</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Type d'accès</label>
                <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg border bg-muted/20 text-xs font-medium">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Accès Total Administrateur</span>
                </div>
              </div>
            </div>

            {/* BANDEAU HISTORIQUE ACCÈS */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span>Dernière connexion enregistrée : <strong>Aujourd'hui à 14:30</strong> (IP: 197.234.221.15)</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => toast.info("Procédure de changement de mot de passe envoyée par email.")} className="h-6 text-[11px] font-bold text-blue-700 hover:bg-blue-100">
                  Changer mot de passe
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>

    </div>
  )
}
