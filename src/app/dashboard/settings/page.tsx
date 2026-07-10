"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Building, Settings, Shield, HardDrive, Bell } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Paramètres du Système</h2>
        <p className="text-muted-foreground text-sm">Configuration globale de la plateforme SGIE.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/50 rounded-xl mb-6">
          <TabsTrigger value="general" className="py-2.5 rounded-lg"><Settings className="h-4 w-4 mr-2 hidden sm:block" /> Général</TabsTrigger>
          <TabsTrigger value="institution" className="py-2.5 rounded-lg"><Building className="h-4 w-4 mr-2 hidden sm:block" /> Institution</TabsTrigger>
          <TabsTrigger value="security" className="py-2.5 rounded-lg"><Shield className="h-4 w-4 mr-2 hidden sm:block" /> Sécurité</TabsTrigger>
          <TabsTrigger value="notifications" className="py-2.5 rounded-lg"><Bell className="h-4 w-4 mr-2 hidden sm:block" /> Notifications</TabsTrigger>
          <TabsTrigger value="backup" className="py-2.5 rounded-lg"><HardDrive className="h-4 w-4 mr-2 hidden sm:block" /> Sauvegarde</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle>Préférences de l'application</CardTitle>
              <CardDescription>Gérez l'affichage et les fonctionnalités globales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-base">Format de date standard</Label>
                  <p className="text-sm text-muted-foreground">S'applique à l'ensemble des tableaux et exports.</p>
                </div>
                <Input defaultValue="JJ/MM/AAAA" className="w-[150px]" />
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                <div>
                  <Label className="font-semibold text-base">Nomenclature Automatique</Label>
                  <p className="text-sm text-muted-foreground">Générer un N° d'échantillon auto lors de la réception.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Autres onglets factices pour la démo */}
        <TabsContent value="institution">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Configuration des coordonnées et du logo de l'institution.</CardContent></Card>
        </TabsContent>
        <TabsContent value="security">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Politiques de mots de passe et double authentification (2FA).</CardContent></Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Configuration des emails d'alerte et des webhooks.</CardContent></Card>
        </TabsContent>
        <TabsContent value="backup">
          <Card className="shadow-sm border-border/50"><CardContent className="p-8 text-center text-muted-foreground">Planification des sauvegardes de base de données.</CardContent></Card>
        </TabsContent>

      </Tabs>
      
      <div className="flex justify-end">
        <Button className="shadow-sm px-8">Enregistrer les modifications</Button>
      </div>
    </div>
  )
}
