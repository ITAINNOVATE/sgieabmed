"use client"

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Eye,
  ArrowUpDown,
  PackageSearch,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { clearAllTestData } from '@/utils/clean-test-data';

interface InventorySample {
  commercial_name: string;
  batch_number: string;
  sample_number: string;
}

interface InventoryItem {
  id: string;
  system_quantity: number;
  physical_quantity: number;
  discrepancy_reason: string | null;
  sample: InventorySample | null;
}

interface Inventory {
  id: string;
  name: string;
  inventory_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  items: InventoryItem[];
}

const MOCK_INVENTORIES: Inventory[] = [];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'En cours':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1 shrink-0 whitespace-nowrap text-[10px]">
          <Clock className="h-3 w-3 shrink-0" />
          En cours
        </Badge>
      );
    case 'Validé':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 shrink-0 whitespace-nowrap text-[10px]">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Validé
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

import { useRealtimeSync } from '@/hooks/useRealtimeSync';

export default function InventoryPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const parseInventoryRecord = (inv: any): Inventory => {
    let items: InventoryItem[] = Array.isArray(inv.items) ? inv.items : [];
    let completed_at: string | null = inv.completed_at || null;

    if (typeof inv.observations === 'string' && inv.observations.trim().startsWith('{')) {
      try {
        const parsedObs = JSON.parse(inv.observations);
        if (Array.isArray(parsedObs.items)) items = parsedObs.items;
        if (parsedObs.completed_at) completed_at = parsedObs.completed_at;
      } catch (e) {}
    }

    return {
      id: inv.id || inv.inv_number,
      name: inv.name || inv.inv_number || 'Session d\'inventaire',
      inventory_type: inv.inventory_type || 'Périodique',
      status: inv.status || 'En cours',
      created_at: inv.created_at || inv.date || new Date().toISOString(),
      completed_at,
      items,
    };
  };

  const fetchInventories = async () => {
    const isWiped = typeof window !== 'undefined' && localStorage.getItem('all_data_wiped') === 'true';

    let localList: Inventory[] = [];
    try {
      const stored = localStorage.getItem('sample_inventories_custom_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          localList = parsed.map(parseInventoryRecord);
          if (!hasLoadedOnceRef.current && localList.length > 0) {
            setInventories(localList);
            setLoading(false);
            hasLoadedOnceRef.current = true;
          }
        }
      }
    } catch (e) {}

    let remoteList: Inventory[] = [];
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('inventories')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        remoteList = data
          .filter((row: any) => !row.inv_number?.startsWith('INV-W-'))
          .map(parseInventoryRecord);
      }
    } catch (e) {
      console.warn("Supabase fetch inventories notice:", e);
    }

    const invMap = new Map<string, Inventory>();
    localList.forEach((inv) => invMap.set(inv.id, inv));
    remoteList.forEach((inv) => {
      const existing = invMap.get(inv.id);
      invMap.set(inv.id, {
        ...existing,
        ...inv,
        status: existing?.status === 'Validé' || inv.status === 'Validé' ? 'Validé' : inv.status,
        items: inv.items && inv.items.length > 0 ? inv.items : (existing?.items || []),
      });
    });

    const merged = Array.from(invMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    hasLoadedOnceRef.current = true;
    setInventories(merged.length > 0 ? merged : (isWiped ? [] : MOCK_INVENTORIES));
    setLoading(false);
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  useRealtimeSync({
    tables: ['inventories', 'samples'],
    onSync: fetchInventories,
    pollIntervalMs: 6000,
  });

  const total = inventories.length;
  const inProgress = inventories.filter((i) => i.status === 'En cours').length;
  const validated = inventories.filter((i) => i.status === 'Validé').length;
  const allItems = inventories.flatMap((i) => i.items ?? []);
  const discrepancyCount = allItems.filter((item) => item.system_quantity !== item.physical_quantity).length;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* BANDEAU EN-TÊTE COMPACT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-[#1B5C2E]" />
            Inventaire & Rapprochement des Échantillons
          </h2>
          <p className="text-muted-foreground text-xs">Contrôle physique périodique des stocks et traçabilité des écarts.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs font-bold gap-1.5 h-8 px-3"
            onClick={async () => {
              if (window.confirm("Êtes-vous sûr de vouloir effacer toutes les réceptions, mouvements, stocks et inventaires ?")) {
                await clearAllTestData();
                toast.success("Tous les inventaires et données de test ont été effacés avec succès !");
                setInventories([]);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" /> Effacer inventaires & données
          </Button>
          <Button asChild size="sm" className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0">
            <Link href="/dashboard/inventory/new">
              <Plus className="h-3.5 w-3.5" /> Démarrer un inventaire
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIS COMPACTS SANS SCROLL */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1B5C2E]/10 text-[#1B5C2E]"><ClipboardList className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total Inventaires</p>
              <h3 className="text-xl font-black text-foreground">{total}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Clock className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">En cours</p>
              <h3 className="text-xl font-black text-foreground">{inProgress}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><CheckCircle2 className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Validés</p>
              <h3 className="text-xl font-black text-foreground">{validated}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border border-border/70 rounded-xl bg-card">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><AlertTriangle className="h-4 w-4" /></div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Écarts Détectés</p>
              <h3 className="text-xl font-black text-foreground">{discrepancyCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLEAU DES INVENTAIRES */}
      <Card className="shadow-2xs border border-border/70 rounded-xl bg-card overflow-hidden">
        <CardHeader className="p-3 pb-2 border-b border-border/50">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5" /> Registre des Sessions d'Inventaire
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="py-2 text-[11px] font-bold uppercase pl-4">Nom de la session</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Type</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Statut</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date Création</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Date Clôture</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase">Articles</TableHead>
                  <TableHead className="py-2 text-[11px] font-bold uppercase text-right pr-4">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground font-medium">
                      Aucune session d'inventaire enregistrée.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventories.slice(0, 10).map((inventory) => {
                    const itemCount = inventory.items?.length ?? 0;
                    const discrepancies = (inventory.items ?? []).filter((item) => item.system_quantity !== item.physical_quantity).length;

                    return (
                      <TableRow key={inventory.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="pl-4 py-2 font-bold text-foreground">{inventory.name}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px] bg-background">{inventory.inventory_type}</Badge>
                        </TableCell>
                        <TableCell className="py-2">{getStatusBadge(inventory.status)}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{formatDate(inventory.created_at)}</TableCell>
                        <TableCell className="py-2 text-muted-foreground">{formatDate(inventory.completed_at)}</TableCell>
                        <TableCell className="py-2 font-medium">
                          {itemCount} article(s) {discrepancies > 0 && <span className="text-red-600 font-bold ml-1">({discrepancies} écart)</span>}
                        </TableCell>
                        <TableCell className="py-2 text-right pr-4">
                          <Button variant="ghost" size="sm" asChild className="h-7 text-xs px-2 text-[#1B5C2E] font-bold hover:bg-[#1B5C2E]/10">
                            <Link href={`/dashboard/inventory/${inventory.id}`}>
                              <Eye className="h-3.5 w-3.5 mr-1" /> Consulter
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
