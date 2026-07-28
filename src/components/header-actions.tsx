"use client"

import { useState } from "react"
import { Bell, Mail, Scan, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import dynamic from "next/dynamic"

const QRCodeScannerDialog = dynamic(
  () => import("@/components/qrcode-scanner-dialog").then((mod) => mod.QRCodeScannerDialog),
  { ssr: false }
)

export function HeaderActions() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      {/* Mode Sombre / Clair */}
      <ModeToggle />

      {/* Bouton Scan QR Code */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsScannerOpen(true)}
        className="text-muted-foreground hover:text-primary transition-colors rounded-xl relative h-9 w-9"
        title="Scanner un QR Code"
      >
        <Scan className="h-5 w-5" />
      </Button>

      {/* Bouton Notifications (Badge rouge avec chiffre 6 comme la maquette) */}
      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary transition-colors rounded-full h-9 w-9">
        <Bell className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background shadow-xs">
          6
        </span>
      </Button>

      {/* Bouton Messages (Badge vert avec chiffre 3 comme la maquette) */}
      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary transition-colors rounded-full h-9 w-9">
        <Mail className="h-5 w-5" />
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background shadow-xs">
          3
        </span>
      </Button>

      <Separator orientation="vertical" className="h-6 opacity-40 mx-1" />

      {/* Profil Utilisateur (Marie ADANDE Administrateur) */}
      <div className="flex items-center gap-2.5 cursor-pointer group hover:bg-muted/40 p-1.5 rounded-xl transition-colors">
        <Avatar className="h-9 w-9 border-2 border-emerald-600/30 group-hover:border-emerald-600 transition-colors shadow-xs">
          <AvatarImage src="/avatar.png" alt="Profile" />
          <AvatarFallback className="bg-[#1B5C2E] text-white font-bold text-xs">MA</AvatarFallback>
        </Avatar>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-bold leading-tight text-foreground group-hover:text-primary transition-colors">
            Marie ADANDE
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">Administrateur</span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
      </div>

      {/* Boîte de dialogue du Scanner QR Code */}
      <QRCodeScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </div>
  )
}
