"use client"

import { useState } from "react"
import { Bell, Scan, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { QRCodeScannerDialog } from "@/components/qrcode-scanner-dialog"

export function HeaderActions() {
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  return (
    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
      {/* Date du jour */}
      <div className="hidden lg:flex items-center text-sm font-medium text-muted-foreground mr-2">
        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>

      {/* Mode Sombre / Clair */}
      <ModeToggle />

      {/* Bouton Scan QR Code */}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsScannerOpen(true)}
        className="text-muted-foreground hover:text-primary transition-colors rounded-xl relative"
        title="Scanner un QR Code"
      >
        <Scan className="h-5 w-5" />
      </Button>

      {/* Bouton Notifications */}
      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary transition-colors rounded-xl">
        <Bell className="h-5 w-5" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-warning border-2 border-card"></span>
      </Button>

      <Separator orientation="vertical" className="h-6 opacity-50" />

      {/* Profil Utilisateur */}
      <div className="flex items-center gap-3 cursor-pointer group">
        <div className="hidden md:flex flex-col text-right">
          <span className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">Dr. Kadia Barry</span>
          <span className="text-xs text-muted-foreground font-medium">Administrateur</span>
        </div>
        <Avatar className="h-9 w-9 border-2 border-primary/20 group-hover:border-primary transition-colors shadow-sm">
          <AvatarImage src="/avatar.png" alt="Profile" />
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">KB</AvatarFallback>
        </Avatar>
      </div>

      {/* Boîte de dialogue du Scanner QR Code */}
      <QRCodeScannerDialog 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </div>
  )
}
