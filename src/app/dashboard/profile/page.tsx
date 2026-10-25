"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  User, Shield, Mail, Phone, Building2, KeyRound, 
  CheckCircle2, Lock, ArrowLeft, Save, ShieldCheck, Check 
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  matricule: string
  fonction: string
  role: string
  phone: string
  email: string
  username: string
  status: string
  department: string
  created_at: string
  last_login: string
  mfa_enabled: boolean
}

const DEFAULT_PROFILE: UserProfile = {
  id: "usr-1",
  first_name: "Admin",
  last_name: "EGED",
  matricule: "ABM-ADMIN-01",
  fonction: "Administrateur Système & Sécurité",
  role: "Administrateur Système",
  department: "Direction des Systèmes d'Information & Digitalisation",
  phone: "+229 01 97 00 00 01",
  email: "admin@eged.bj",
  username: "admin",
  status: "Actif",
  created_at: "2026-01-10T08:00:00Z",
  last_login: "Aujourd'hui à 14:30 (IP: 197.234.221.15)",
  mfa_enabled: true
}

const STORAGE_KEY = "eged_current_user_v1"

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [isEditing, setIsEditing] = useState(false)
  const [phone, setPhone] = useState(DEFAULT_PROFILE.phone)
  const [email, setEmail] = useState(DEFAULT_PROFILE.email)
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Vérification et nettoyage immédiat si ancien nom présent
        if (
          parsed.first_name === "Marie" ||
          parsed.last_name === "ADANDE" ||
          parsed.username === "m.adande" ||
          parsed.matricule === "ABM-2024-001"
        ) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE))
          setProfile(DEFAULT_PROFILE)
          setPhone(DEFAULT_PROFILE.phone)
          setEmail(DEFAULT_PROFILE.email)
        } else {
          const merged: UserProfile = {
            ...DEFAULT_PROFILE,
            ...parsed,
            first_name: parsed.first_name || "Admin",
            last_name: parsed.last_name || "EGED",
            matricule: parsed.matricule || "ABM-ADMIN-01",
            role: parsed.role || "Administrateur Système",
            phone: parsed.phone || DEFAULT_PROFILE.phone,
            email: parsed.email || DEFAULT_PROFILE.email,
          }
          setProfile(merged)
          setPhone(merged.phone)
          setEmail(merged.email)
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROFILE))
      }
    } catch (e) {
      console.error("Erreur lecture profil local:", e)
    }
  }, [])

  const handleSave = () => {
    setIsEditing(false)
    const updated: UserProfile = {
      ...profile,
      phone: phone.trim() || profile.phone,
      email: email.trim() || profile.email,
    }
    setProfile(updated)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error("Erreur sauvegarde profil:", e)
    }
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
    toast.success("Informations du profil mises à jour avec succès !")
  }

  const displayName = `${profile.first_name} ${profile.last_name}`.trim() || "Admin EGED"
  const initials = "AE"

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-4xl mx-auto p-2 sm:p-4">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-3.5 rounded-2xl border border-border/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-8 w-8 shrink-0 rounded-xl cursor-pointer">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-[#1B5C2E]" />
              Profil Utilisateur — eGED ABMed
            </h1>
            <p className="text-muted-foreground text-[11px] sm:text-xs">
              Informations du compte, rôle, privilèges de sécurité et coordonnées de contact.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          {isSaved && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs gap-1 font-semibold">
              <Check className="h-3 w-3" /> Enregistré
            </Badge>
          )}
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  setPhone(profile.phone)
                  setEmail(profile.email)
                  setIsEditing(false)
                }} 
                className="h-8 text-xs font-semibold px-3 rounded-xl cursor-pointer"
              >
                Annuler
              </Button>
              <Button 
                size="sm" 
                onClick={handleSave} 
                className="h-8 text-xs font-bold px-3.5 bg-[#1B5C2E] hover:bg-[#154824] text-white border-0 gap-1.5 rounded-xl cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" /> Enregistrer
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsEditing(true)} 
              className="h-8 text-xs font-bold px-3.5 rounded-xl cursor-pointer"
            >
              Modifier mes coordonnées
            </Button>
          )}
        </div>
      </div>

      {/* FICHE PROFIL EN 2 COLONNES */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* COLONNE GAUCHE : CARTE IDENTITÉ */}
        <Card className="md:col-span-4 shadow-2xs border border-border/80 rounded-2xl bg-card flex flex-col items-center justify-center p-5 text-center">
          <Avatar className="h-24 w-24 border-4 border-[#1B5C2E]/20 shadow-md mb-3">
            <AvatarImage src="/avatar.png" alt={displayName} />
            <AvatarFallback className="bg-[#1B5C2E] text-white font-black text-2xl tracking-wider">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <h2 className="text-lg font-black text-foreground leading-tight">{displayName}</h2>
          <p className="text-xs text-muted-foreground font-semibold mt-1">
            {profile.fonction}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] gap-1 font-bold">
              <CheckCircle2 className="h-3 w-3" /> {profile.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-background font-mono font-bold">
              Matricule : {profile.matricule}
            </Badge>
          </div>

          <div className="w-full pt-4 mt-4 border-t border-border/60 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Service :</span>
              <span className="font-bold text-foreground">Direction SI</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Rôle plateforme :</span>
              <span className="font-bold text-[#1B5C2E]">{profile.role}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Identifiant :</span>
              <span className="font-mono font-semibold text-foreground">@{profile.username}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Sécurité MFA :</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Activée (2FA)
              </span>
            </div>
          </div>
        </Card>

        {/* COLONNE DROITE : DÉTAILS DU COMPTE ET COORDONNÉES */}
        <Card className="md:col-span-8 shadow-2xs border border-border/80 rounded-2xl bg-card">
          <CardHeader className="p-4 pb-3 border-b border-border/60">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-[#1B5C2E]" /> Informations Personnelles & Sécurité
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Adresse Email professionnelle</label>
                {isEditing ? (
                  <Input 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="h-9 text-xs bg-background rounded-xl" 
                  />
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-xl border bg-muted/20 text-xs font-medium">
                    <Mail className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Téléphone professionnel</label>
                {isEditing ? (
                  <Input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    className="h-9 text-xs bg-background rounded-xl" 
                  />
                ) : (
                  <div className="flex items-center gap-2 h-9 px-3 rounded-xl border bg-muted/20 text-xs font-medium">
                    <Phone className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Direction / Département</label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-xl border bg-muted/20 text-xs font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{profile.department}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Périmètre d'habilitation</label>
                <div className="flex items-center gap-2 h-9 px-3 rounded-xl border bg-muted/20 text-xs font-medium">
                  <KeyRound className="h-4 w-4 text-[#1B5C2E] shrink-0" />
                  <span className="font-semibold text-[#1B5C2E]">Accès Total Administrateur</span>
                </div>
              </div>
            </div>

            {/* BANDEAU HISTORIQUE ACCÈS & SÉCURITÉ */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-muted-foreground p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Dernière connexion : <strong>{profile.last_login}</strong></span>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toast.info("Procédure de réinitialisation sécurisée envoyée à " + profile.email)} 
                  className="h-7 text-xs font-bold text-blue-700 hover:bg-blue-100 rounded-lg cursor-pointer px-2"
                >
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
