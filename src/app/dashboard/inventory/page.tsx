export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
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
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Eye,
  ArrowUpDown,
  PackageSearch,
} from 'lucide-react';
import Link from 'next/link';

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

const MOCK_INVENTORIES: Inventory[] = [
  {
    id: '1',
    name: 'Inventaire Global 2026',
    inventory_type: 'Annuel',
    status: 'En cours',
    created_at: '2026-01-15T08:00:00.000Z',
    completed_at: null,
    items: [
      { id: '1', system_quantity: 500, physical_quantity: 498, discrepancy_reason: null, sample: { commercial_name: 'Amoxicilline 500mg', batch_number: 'LOT-992A', sample_number: 'ECH-001' } },
      { id: '2', system_quantity: 200, physical_quantity: 200, discrepancy_reason: null, sample: { commercial_name: 'Ibuprofène 400mg', batch_number: 'LOT-112B', sample_number: 'ECH-002' } },
    ],
  },
  {
    id: '2',
    name: 'Inventaire Trimestriel Q1',
    inventory_type: 'Trimestriel',
    status: 'Validé',
    created_at: '2026-03-01T09:00:00.000Z',
    completed_at: '2026-03-15T14:30:00.000Z',
    items: [
      { id: '4', system_quantity: 300, physical_quantity: 300, discrepancy_reason: null, sample: { commercial_name: 'Paracétamol 1g', batch_number: 'LOT-441D', sample_number: 'ECH-004' } },
    ],
  },
];

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
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
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

export default async function InventoryPage() {
  const supabase = await createClient();
  let inventories: Inventory[] = [];

  try {
    const { data } = await supabase
      .from('inventories')
      .select(`
        id, name, inventory_type, status, created_at, completed_at,
        inventory_items ( id, system_quantity, physical_quantity, discrepancy_reason, samples ( commercial_name, batch_number, sample_number ) )
      `)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      inventories = data.map((inv: any) => ({
        id: inv.id,
        name: inv.name,
        inventory_type: inv.inventory_type,
        status: inv.status,
        created_at: inv.created_at,
        completed_at: inv.completed_at,
        items: (inv.inventory_items ?? []).map((item: any) => ({
          id: item.id,
          system_quantity: item.system_quantity,
          physical_quantity: item.physical_quantity,
          discrepancy_reason: item.discrepancy_reason,
          sample: item.samples ? (Array.isArray(item.samples) ? item.samples[0] : item.samples) : null,
        })),
      }));
    } else {
      inventories = MOCK_INVENTORIES;
    }
  } catch {
    inventories = MOCK_INVENTORIES;
  }

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
        <Button asChild size="sm" className="bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-2xs text-xs font-bold gap-1.5 h-8 px-3 border-0">
          <Link href="/dashboard/inventory/new">
            <Plus className="h-3.5 w-3.5" /> Démarrer un inventaire
          </Link>
        </Button>
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
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Loader2 className="h-4 w-4 animate-spin" /></div>
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

      {/* TABLEAU DES INVENTAIRES (STATIQUE 1-ÉCRAN) */}
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
                {inventories.slice(0, 4).map((inventory) => {
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
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
