export const dynamic = 'force-dynamic';

import { createClient } from '@/utils/supabase/server';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  UserCheck,
  ShieldCheck,
  Activity,
  Search,
  UserPlus,
  MoreHorizontal,
  Eye,
  Pencil,
  Ban,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOCK_USERS: User[] = [
  {
    id: '1',
    first_name: 'Kadia',
    last_name: 'Barry',
    email: 'k.barry@abmed.gov',
    role: 'Administrateur',
    is_active: true,
    last_login: new Date().toISOString(),
  },
  {
    id: '2',
    first_name: 'Ousmane',
    last_name: 'Sylla',
    email: 'o.sylla@abmed.gov',
    role: 'Gestionnaire',
    is_active: true,
    last_login: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: '3',
    first_name: 'Aissatou',
    last_name: 'Diallo',
    email: 'a.diallo@abmed.gov',
    role: 'Analyste',
    is_active: true,
    last_login: new Date(Date.now() - 86_400_000).toISOString(),
  },
  {
    id: '4',
    first_name: 'Ibrahima',
    last_name: 'Camara',
    email: 'i.camara@abmed.gov',
    role: 'Auditeur',
    is_active: false,
    last_login: new Date(Date.now() - 5_184_000_000).toISOString(),
  },
  {
    id: '5',
    first_name: 'Fatoumata',
    last_name: 'Bah',
    email: 'f.bah@abmed.gov',
    role: 'Responsable',
    is_active: true,
    last_login: new Date(Date.now() - 172_800_000).toISOString(),
  },
];

const ROLE_CONFIG: Record<
  string,
  { label: string; className: string; avatarBg: string }
> = {
  Administrateur: {
    label: 'Administrateur',
    className:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    avatarBg: 'bg-blue-600',
  },
  Responsable: {
    label: 'Responsable',
    className:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    avatarBg: 'bg-green-600',
  },
  Gestionnaire: {
    label: 'Gestionnaire',
    className:
      'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    avatarBg: 'bg-yellow-500',
  },
  Analyste: {
    label: 'Analyste',
    className:
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
    avatarBg: 'bg-purple-600',
  },
  Auditeur: {
    label: 'Auditeur',
    className:
      'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
    avatarBg: 'bg-gray-500',
  },
};

const ITEMS_PER_PAGE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getRoleConfig(role: string) {
  return (
    ROLE_CONFIG[role] ?? {
      label: role,
      className:
        'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
      avatarBg: 'bg-gray-500',
    }
  );
}

function formatLastLogin(lastLogin: string | null): string {
  if (!lastLogin) return 'Jamais connecté';
  try {
    return formatDistanceToNow(new Date(lastLogin), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return 'Date inconnue';
  }
}

function formatLastLoginFull(lastLogin: string | null): string {
  if (!lastLogin) return 'Jamais';
  try {
    return format(new Date(lastLogin), "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return 'Date inconnue';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  colorClass,
  bgClass,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-xl ${bgClass}`}>
            <Icon className={`h-4 w-4 ${colorClass}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function UserAvatar({
  firstName,
  lastName,
  role,
}: {
  firstName: string;
  lastName: string;
  role: string;
}) {
  const config = getRoleConfig(role);
  return (
    <div
      className={`h-9 w-9 rounded-full ${config.avatarBg} flex items-center justify-center text-white text-sm font-semibold shrink-0 select-none`}
    >
      {getInitials(firstName, lastName)}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const config = getRoleConfig(role);
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium px-2 py-0.5 ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400">
      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      Actif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
      <span className="h-2 w-2 rounded-full bg-gray-400" />
      Inactif
    </span>
  );
}

function ActionsDropdown({ user }: { user: User }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg hover:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions pour {user.first_name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Voir le profil
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 cursor-pointer">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <Ban className="h-4 w-4" />
          {user.is_active ? 'Désactiver' : 'Réactiver'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-48 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Users className="h-10 w-10 opacity-30" />
          <p className="font-medium">Aucun utilisateur trouvé</p>
          <p className="text-sm">Commencez par créer un utilisateur.</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function UsersPage() {
  const supabase = await createClient();

  // Fetch users
  const { data: rawUsers, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, role, is_active, last_login')
    .order('last_name', { ascending: true });

  // Use mock data if table is empty or errored
  const users: User[] =
    !error && rawUsers && rawUsers.length > 0
      ? (rawUsers as User[])
      : MOCK_USERS;

  const isUsingMock = !rawUsers || rawUsers.length === 0;

  // ── KPI calculations ──────────────────────────────────────────────────────
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const admins = users.filter((u) => u.role === 'Administrateur').length;
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentActivity = users.filter(
    (u) =>
      u.last_login && isAfter(new Date(u.last_login), sevenDaysAgo),
  ).length;

  // ── Pagination (static, page 1) ───────────────────────────────────────────
  const currentPage = 1;
  const totalPages = Math.max(1, Math.ceil(totalUsers / ITEMS_PER_PAGE));
  const paginatedUsers = users.slice(0, ITEMS_PER_PAGE);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6 p-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Gestion des utilisateurs
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gérez les comptes, rôles et permissions des membres de l&apos;équipe.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" className="gap-2 rounded-xl shadow-sm">
                  <UserPlus className="h-4 w-4" />
                  Nouvel utilisateur
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
                  <p className="text-xs leading-relaxed">
                    La création d&apos;utilisateurs s&apos;effectue via{' '}
                    <strong>Supabase Authentication</strong>. Le profil est
                    automatiquement lié à la table <code>users</code> lors de la
                    première connexion.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ── Mock data notice ────────────────────────────────────────────── */}
        {isUsingMock && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Données de démonstration affichées — la table{' '}
              <code className="font-mono text-xs bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                users
              </code>{' '}
              est vide ou inaccessible.
            </span>
          </div>
        )}

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Total utilisateurs"
            value={totalUsers}
            icon={Users}
            description="Tous les comptes enregistrés"
            colorClass="text-blue-600 dark:text-blue-400"
            bgClass="bg-blue-100 dark:bg-blue-900/30"
          />
          <KpiCard
            title="Utilisateurs actifs"
            value={activeUsers}
            icon={UserCheck}
            description="Comptes actuellement activés"
            colorClass="text-green-600 dark:text-green-400"
            bgClass="bg-green-100 dark:bg-green-900/30"
          />
          <KpiCard
            title="Administrateurs"
            value={admins}
            icon={ShieldCheck}
            description="Rôle Administrateur assigné"
            colorClass="text-purple-600 dark:text-purple-400"
            bgClass="bg-purple-100 dark:bg-purple-900/30"
          />
          <KpiCard
            title="Activité récente"
            value={recentActivity}
            icon={Activity}
            description="Connexions dans les 7 derniers jours"
            colorClass="text-orange-600 dark:text-orange-400"
            bgClass="bg-orange-100 dark:bg-orange-900/30"
          />
        </div>

        {/* ── Search + Filter bar ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Rechercher par nom, email, rôle…"
              className="pl-9 rounded-xl border-border/60 bg-background shadow-sm"
              aria-label="Rechercher un utilisateur"
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {totalUsers} utilisateur{totalUsers !== 1 ? 's' : ''} au total
            </span>
          </div>
        </div>

        {/* ── Users Table ─────────────────────────────────────────────────── */}
        <Card className="shadow-sm border-border/50 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[260px] pl-6 font-semibold text-foreground/70">
                    Utilisateur
                  </TableHead>
                  <TableHead className="font-semibold text-foreground/70">
                    Email
                  </TableHead>
                  <TableHead className="font-semibold text-foreground/70">
                    Rôle
                  </TableHead>
                  <TableHead className="font-semibold text-foreground/70">
                    Statut
                  </TableHead>
                  <TableHead className="font-semibold text-foreground/70">
                    Dernière connexion
                  </TableHead>
                  <TableHead className="w-[60px] pr-4 text-right font-semibold text-foreground/70">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <EmptyState />
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Avatar + Name */}
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            firstName={user.first_name}
                            lastName={user.last_name}
                            role={user.role}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              ID: {user.id.substring(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user.email}
                        </span>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge isActive={user.is_active} />
                      </TableCell>

                      {/* Last login */}
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground cursor-default">
                              {formatLastLogin(user.last_login)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatLastLoginFull(user.last_login)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-4 text-right">
                        <ActionsDropdown user={user} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ─────────────────────────────────────────────── */}
          {totalPages > 1 || paginatedUsers.length > 0 ? (
            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Page{' '}
                <span className="font-medium text-foreground">{currentPage}</span>{' '}
                sur{' '}
                <span className="font-medium text-foreground">{totalPages}</span>{' '}
                &mdash;{' '}
                <span className="font-medium text-foreground">
                  {paginatedUsers.length}
                </span>{' '}
                / {totalUsers} utilisateur{totalUsers !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  disabled={currentPage === 1}
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg text-xs"
                      aria-label={`Page ${page}`}
                      aria-current={page === currentPage ? 'page' : undefined}
                    >
                      {page}
                    </Button>
                  );
                })}

                {totalPages > 5 && (
                  <span className="text-muted-foreground text-sm px-1">…</span>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  disabled={currentPage === totalPages}
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </Card>

        {/* ── Legend ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="font-medium">Légende des rôles :</span>
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}
              >
                {cfg.label}
              </span>
            </span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
