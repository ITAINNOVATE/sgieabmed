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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_INVENTORIES: Inventory[] = [
  {
    id: '1',
    name: 'Inventaire Global 2026',
    inventory_type: 'Annuel',
    status: 'En cours',
    created_at: new Date().toISOString(),
    completed_at: null,
    items: [
      {
        id: '1',
        system_quantity: 500,
        physical_quantity: 498,
        discrepancy_reason: null,
        sample: {
          commercial_name: 'Amoxicilline 500mg',
          batch_number: 'LOT-992A',
          sample_number: 'ECH-001',
        },
      },
      {
        id: '2',
        system_quantity: 200,
        physical_quantity: 200,
        discrepancy_reason: null,
        sample: {
          commercial_name: 'Ibuprofène 400mg',
          batch_number: 'LOT-112B',
          sample_number: 'ECH-002',
        },
      },
      {
        id: '3',
        system_quantity: 50,
        physical_quantity: 45,
        discrepancy_reason: 'Bris de flacons',
        sample: {
          commercial_name: 'Vaccin Anti-Rabique',
          batch_number: 'LOT-334C',
          sample_number: 'ECH-003',
        },
      },
    ],
  },
  {
    id: '2',
    name: 'Inventaire Trimestriel Q1',
    inventory_type: 'Trimestriel',
    status: 'Validé',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        id: '4',
        system_quantity: 300,
        physical_quantity: 300,
        discrepancy_reason: null,
        sample: {
          commercial_name: 'Paracétamol 1g',
          batch_number: 'LOT-441D',
          sample_number: 'ECH-004',
        },
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          En cours
        </Badge>
      );
    case 'Validé':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Validé
        </Badge>
      );
    case 'Annulé':
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
          Annulé
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getDiscrepancyBadge(diff: number) {
  if (diff === 0)
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
        Conforme
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1">
      <AlertTriangle className="h-3 w-3" />
      Écart détecté
    </Badge>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function InventoryPage() {
  const supabase = await createClient();

  const { data: rawInventories, error } = await supabase
    .from('inventories')
    .select(
      `
      *,
      items:inventory_items (
        id,
        system_quantity,
        physical_quantity,
        discrepancy_reason,
        sample:samples ( commercial_name, batch_number, sample_number )
      )
    `
    )
    .order('created_at', { ascending: false });

  const inventories: Inventory[] =
    !error && rawInventories && rawInventories.length > 0
      ? (rawInventories as Inventory[])
      : MOCK_INVENTORIES;

  // ── KPI calculations ──────────────────────────────────────────────────────
  const total = inventories.length;
  const inProgress = inventories.filter((i) => i.status === 'En cours').length;
  const validated = inventories.filter((i) => i.status === 'Validé').length;

  const allItems = inventories.flatMap((i) => i.items ?? []);
  const discrepancyCount = allItems.filter(
    (item) => item.system_quantity !== item.physical_quantity
  ).length;

  // ── Active inventory ──────────────────────────────────────────────────────
  const activeInventory = inventories.find((i) => i.status === 'En cours') ?? null;
  const activeItems = activeInventory?.items ?? [];
  const activeDiscrepancies = activeItems.filter(
    (item) => item.system_quantity !== item.physical_quantity
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 p-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PackageSearch className="h-6 w-6 text-primary" />
            Gestion des Inventaires
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Suivi des inventaires physiques et analyse des écarts de stock
          </p>
        </div>
        <Button asChild className="gap-2 mt-3 sm:mt-0">
          <Link href="/dashboard/inventory/new">
            <Plus className="h-4 w-4" />
            Démarrer un nouvel inventaire
          </Link>
        </Button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total inventaires
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-1">Tous statuts confondus</p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En cours
            </CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{inProgress}</p>
            <p className="text-xs text-muted-foreground mt-1">Inventaire(s) actif(s)</p>
          </CardContent>
        </Card>

        {/* Validated */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Validés
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{validated}</p>
            <p className="text-xs text-muted-foreground mt-1">Inventaires clôturés</p>
          </CardContent>
        </Card>

        {/* Discrepancies */}
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Écarts détectés
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{discrepancyCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Article(s) avec écart(s) physiques
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Inventories Table ────────────────────────────────────────────── */}
      <Card className="shadow-sm border-border/50 rounded-2xl">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            Liste des inventaires
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold text-xs uppercase tracking-wide pl-6">
                  Nom
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide">
                  Type
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide">
                  Statut
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide">
                  Date de création
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide">
                  Date de clôture
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide">
                  Articles
                </TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wide text-right pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <PackageSearch className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm">Aucun inventaire trouvé</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                inventories.map((inventory) => {
                  const itemCount = inventory.items?.length ?? 0;
                  const discrepancies = (inventory.items ?? []).filter(
                    (item) => item.system_quantity !== item.physical_quantity
                  ).length;

                  return (
                    <TableRow
                      key={inventory.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="pl-6 font-medium">
                        {inventory.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {inventory.inventory_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(inventory.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(inventory.created_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(inventory.completed_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {itemCount} article{itemCount !== 1 ? 's' : ''}
                          {discrepancies > 0 && (
                            <span className="ml-2 text-xs text-red-600 font-medium">
                              ({discrepancies} écart{discrepancies > 1 ? 's' : ''})
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button variant="ghost" size="sm" asChild className="gap-1">
                          <Link href={`/dashboard/inventory/${inventory.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                            Voir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Active Inventory Discrepancy Analysis ───────────────────────── */}
      {activeInventory && (
        <Card className="shadow-sm border-border/50 rounded-2xl">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Analyse des écarts — {activeInventory.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Comparaison quantités système vs. quantités physiques relevées
                </p>
              </div>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                En cours
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm">Aucun article enregistré pour cet inventaire</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-xs uppercase tracking-wide pl-6">
                      Produit
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">
                      N° Échantillon
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">
                      Lot
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">
                      Qté Système
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">
                      Qté Physique
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide text-right">
                      Différence
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide">
                      Motif écart
                    </TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wide pr-6">
                      Statut
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeItems.map((item) => {
                    const diff = item.physical_quantity - item.system_quantity;
                    const isNegative = diff < 0;
                    const isZero = diff === 0;

                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="pl-6 font-medium">
                          {item.sample?.commercial_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {item.sample?.sample_number ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-mono">
                          {item.sample?.batch_number ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.system_quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.physical_quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          <span
                            className={
                              isZero
                                ? 'text-emerald-600'
                                : isNegative
                                ? 'text-red-600'
                                : 'text-amber-600'
                            }
                          >
                            {diff > 0 ? '+' : ''}
                            {diff}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                          {item.discrepancy_reason ?? (
                            <span className="italic text-muted-foreground/60">
                              Non renseigné
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="pr-6">
                          {getDiscrepancyBadge(diff)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* Summary footer */}
            {activeItems.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border/50 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  {activeItems.length} article{activeItems.length !== 1 ? 's' : ''} au
                  total —{' '}
                  <span className="text-emerald-700 font-medium">
                    {activeItems.length - activeDiscrepancies.length} conforme
                    {activeItems.length - activeDiscrepancies.length !== 1 ? 's' : ''}
                  </span>
                  {activeDiscrepancies.length > 0 && (
                    <>
                      {' '}·{' '}
                      <span className="text-red-700 font-medium">
                        {activeDiscrepancies.length} écart
                        {activeDiscrepancies.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </p>
                <Button variant="outline" size="sm" asChild className="gap-1 text-xs">
                  <Link href={`/dashboard/inventory/${activeInventory.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                    Voir le détail complet
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
