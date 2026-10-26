"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Search, ShieldCheck, QrCode, ArrowRight, Package } from "lucide-react"

export default function VerifyPortalPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [type, setType] = useState<"waste" | "sample">("waste")
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = searchTerm.trim()
    if (!clean) return
    if (type === "waste") {
      router.push(`/verify/waste/${encodeURIComponent(clean)}`)
    } else {
      router.push(`/verify/sample/${encodeURIComponent(clean)}`)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto my-8 space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center space-y-6">
        
        {/* LOGO ET TITRE */}
        <div className="flex flex-col items-center space-y-3">
          <div className="w-20 h-20 bg-white rounded-2xl p-2 shadow-sm border border-slate-100 flex items-center justify-center">
            <Image 
              src="/logoabmed.png" 
              alt="Logo ABMed" 
              width={64} 
              height={64} 
              className="object-contain max-h-16 w-auto" 
            />
          </div>
          <div>
            <p className="text-[10px] tracking-widest font-black uppercase text-[#008751]">
              RÉPUBLIQUE DU BÉNIN
            </p>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Portail Public de Vérification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Traçabilité officielle des Déchets et Échantillons Pharmaceutiques (eGED-SGIE)
            </p>
          </div>
        </div>

        {/* SELECTEUR DU TYPE */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-border/50 max-w-xs mx-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setType("waste")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              type === "waste"
                ? "bg-[#003B5C] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lot Déchet
          </button>
          <button
            type="button"
            onClick={() => setType("sample")}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              type === "sample"
                ? "bg-[#003B5C] text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Échantillon
          </button>
        </div>

        {/* FORMULAIRE DE RECHERCHE */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={type === "waste" ? "Ex: DEC-2026-43081-1" : "Ex: ECH-2026-0001"}
              className="w-full px-4 py-3 pl-10 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#003B5C] text-foreground"
              required
            />
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Vérifier l&apos;Authenticité</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-border/50 text-[11px] text-muted-foreground flex items-center justify-center gap-2">
          <QrCode className="w-4 h-4 text-[#003B5C]" />
          <span>Scannez directement le QR Code physique pour un accès instantané</span>
        </div>

      </div>
    </div>
  )
}
