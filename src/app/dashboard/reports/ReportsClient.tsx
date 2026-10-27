'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  FileText,
  TestTube2,
  Trash2,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileOutput,
  TrendingUp,
  RefreshCw,
  Calendar,
  Building2,
  DollarSign,
  AlertTriangle,
  Search,
  CheckCircle2,
  Flame,
  ArrowRightLeft,
  Clock,
  Layers,
  Info,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Boxes,
  FileCheck,
  CreditCard,
  Wallet,
  CalendarDays,
  Microscope,
} from 'lucide-react'
import {
  exportToCSV,
  exportToExcel,
  exportOfficialReportPDF,
} from "@/utils/exportUtils"
import { createClient } from "@/utils/supabase/client"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { 
  Center, 
  getRegisteredCenters, 
  calculateCentersData 
} from "@/utils/centers-storage"
import {
  Appointment,
  ReceptionSchedule,
  getAppointmentsSync,
  getReceptionSchedulesSync,
} from "@/utils/appointments-storage"
import {
  GroupedWastePackage,
} from "@/components/waste-grouping-dialog"
import {
  getLocalDissolvedPackageNumbers,
} from "@/utils/waste-packages-sync"

interface Sample {
  id: string
  sample_number?: string
  commercial_name?: string
  quantity?: number
  status?: string
  storage_location?: string
  expiry_date?: string
  created_at?: string
  reception_ref?: string
  [key: string]: unknown
}

interface Movement {
  id: string
  movement_type?: string
  quantity?: number
  from_location?: string
  to_location?: string
  created_at?: string
  beneficiary?: string
  operator?: string
  product_name?: string
  sample_id?: string
  [key: string]: unknown
}

interface WasteBatch {
  id: string
  batch_number?: string
  commercial_name?: string
  waste_type?: string
  product_category?: string
  product_nature?: string
  destruction_motive?: string
  warehouse?: string
  quantity?: number
  unit?: string
  status?: string
  source_structure?: string
  source_structure_code?: string
  source_structure_type?: string
  center_code?: string
  transfer_cost_mode?: string
  transfer_cost_amount?: number
  abmed_fee_8_percent?: number
  reception_date?: string
  date_reception?: string
  reception_number?: string
  delivery_slip_ref?: string
  depositor_name?: string
  depositor_phone?: string
  created_at?: string
  [key: string]: unknown
}

interface DestructionPlan {
  id: string
  plan_number?: string
  status?: string
  destruction_method?: string
  destruction_site?: string
  total_weight?: number
  execution_date?: string
  created_at?: string
  batches?: any[]
  [key: string]: unknown
}

interface ReceptionRecord {
  id: string
  rec_number?: string
  reception_number?: string
  supplier?: string
  manufacturer?: string
  country?: string
  type_reception?: string
  date_reception?: string
  created_at?: string
  status?: string
  check_conform?: boolean
  samples_data?: any[]
  [key: string]: unknown
}

interface Props {
  samples?: Sample[]
  movements?: Movement[]
  wasteBatches?: WasteBatch[]
  destructions?: DestructionPlan[]
}

const PIE_COLORS = ['#1B5C2E', '#22c55e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6']

// -------------------------------------------------------------
// COMPOSANTS DE MINIATURES VISUELLES DE RAPPORTS
// -------------------------------------------------------------
function ReportThumbnail({ type }: { type: string }) {
  switch (type) {
    case 'financial_detailed_audit':
      return (
        <div className="w-22 h-15 rounded-lg border border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/40 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-[#1B5C2E] rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-6 bg-white/80 rounded-xs" />
            <span className="text-[6px] text-white font-black">TRÉSOR</span>
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-emerald-100 dark:bg-emerald-900/60 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-5 bg-slate-400 rounded-xs" />
              <div className="h-1 w-3 bg-[#1B5C2E] rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-emerald-100 dark:bg-emerald-900/60 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-4 bg-slate-400 rounded-xs" />
              <div className="h-1 w-4 bg-amber-500 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-200/70 rounded-xs flex justify-between items-center px-1">
            <span className="text-[5px] text-[#1B5C2E] font-black">RECOUVREMENT 8%</span>
            <div className="h-1 w-2 bg-[#1B5C2E] rounded-xs" />
          </div>
        </div>
      )

    case 'appointments_report':
      return (
        <div className="w-22 h-15 rounded-lg border border-blue-300/60 bg-blue-50/50 dark:bg-blue-950/40 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-blue-700 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
            <CalendarDays className="w-1.5 h-1.5 text-white" />
          </div>
          <div className="grid grid-cols-3 gap-0.5 py-0.5">
            <div className="h-2 rounded-xs bg-emerald-100 text-emerald-800 text-[5px] flex items-center justify-center font-bold">09h</div>
            <div className="h-2 rounded-xs bg-blue-100 text-blue-800 text-[5px] flex items-center justify-center font-bold">11h</div>
            <div className="h-2 rounded-xs bg-amber-100 text-amber-800 text-[5px] flex items-center justify-center font-bold">14h</div>
          </div>
          <div className="h-1.5 w-full bg-blue-100 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-blue-800 font-bold">RDV CENTRES</span>
            <div className="h-1 w-2 bg-blue-600 rounded-xs" />
          </div>
        </div>
      )

    case 'waste_packages_tracking':
      return (
        <div className="w-22 h-15 rounded-lg border border-purple-300/60 bg-purple-50/50 dark:bg-purple-950/40 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-purple-700 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
            <Boxes className="w-1.5 h-1.5 text-white" />
          </div>
          <div className="flex items-center justify-around py-0.5">
            <div className="w-3.5 h-3.5 rounded bg-purple-200 border border-purple-400 flex items-center justify-center text-[5px] font-bold text-purple-800">FÛT</div>
            <div className="w-3.5 h-3.5 rounded bg-purple-100 border border-purple-300 flex items-center justify-center text-[5px] font-bold text-purple-800">SAC</div>
            <div className="w-3.5 h-3.5 rounded bg-purple-300 border border-purple-500 flex items-center justify-center text-[5px] font-bold text-purple-900">BOX</div>
          </div>
          <div className="h-1.5 w-full bg-purple-100 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-purple-800 font-bold">COLIS GROUPÉS</span>
            <div className="h-1 w-2 bg-purple-700 rounded-xs" />
          </div>
        </div>
      )

    case 'samples_lnc_quality':
      return (
        <div className="w-22 h-15 rounded-lg border border-teal-300/60 bg-teal-50/50 dark:bg-teal-950/40 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-teal-700 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-8 bg-white/80 rounded-xs" />
            <Microscope className="w-1.5 h-1.5 text-white" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-teal-100 rounded-xs flex items-center justify-between px-1">
              <span className="text-[5px] text-teal-800 font-bold">LNC Conforme</span>
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
            </div>
            <div className="h-1.5 w-full bg-teal-100 rounded-xs flex items-center justify-between px-1">
              <span className="text-[5px] text-teal-800 font-bold">AMM Validée</span>
              <div className="w-1 h-1 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-teal-200/60 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-teal-900 font-bold">QUALITÉ ABMED</span>
            <div className="h-1 w-2 bg-teal-700 rounded-xs" />
          </div>
        </div>
      )

    case 'waste_transfer_slips':
      return (
        <div className="w-22 h-15 rounded-lg border border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/40 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-amber-700 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
            <FileCheck className="w-1.5 h-1.5 text-white" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-amber-100 rounded-xs flex items-center justify-between px-1">
              <span className="text-[5px] text-amber-900 font-bold">Bordereau REC</span>
              <div className="h-1 w-3 bg-amber-600 rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-amber-100 rounded-xs flex items-center justify-between px-1">
              <span className="text-[5px] text-amber-900 font-bold">Récépissé Décharge</span>
              <div className="h-1 w-2 bg-emerald-600 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-200/70 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-amber-950 font-black">DÉCHARGES OFFICIELLES</span>
          </div>
        </div>
      )

    case 'waste_receptions':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-[#1B5C2E] rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-6 bg-white/70 rounded-xs" />
          </div>
          <div className="space-y-0.5 flex-1">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex gap-1 items-center px-0.5">
              <div className="h-1 w-3 bg-slate-400 rounded-xs" />
              <div className="h-1 w-6 bg-slate-300 rounded-xs" />
              <div className="h-1 w-2 bg-emerald-500 rounded-xs ml-auto" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex gap-1 items-center px-0.5">
              <div className="h-1 w-4 bg-slate-400 rounded-xs" />
              <div className="h-1 w-5 bg-slate-300 rounded-xs" />
              <div className="h-1 w-2 bg-amber-500 rounded-xs ml-auto" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-200/50 flex justify-between items-center px-0.5">
            <div className="h-1 w-4 bg-emerald-600 rounded-xs" />
            <div className="h-1 w-3 bg-[#1B5C2E] rounded-xs" />
          </div>
        </div>
      )

    case 'centers_activity':
      return (
        <div className="w-22 h-15 rounded-lg border border-emerald-200 bg-emerald-50/40 dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-[#1B5C2E] rounded-xs mb-0.5 flex items-center justify-between px-1">
            <div className="h-1 w-6 bg-white/80 rounded-xs" />
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-emerald-100/70 dark:bg-emerald-950/40 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-7 bg-slate-400 rounded-xs" />
              <div className="h-1 w-2 bg-[#1B5C2E] rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-emerald-100/70 dark:bg-emerald-950/40 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-5 bg-slate-400 rounded-xs" />
              <div className="h-1 w-3 bg-red-500 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-200/50 rounded-xs flex justify-between items-center px-1">
            <div className="h-1 w-4 bg-[#1B5C2E] rounded-xs" />
            <div className="h-1 w-3 bg-emerald-600 rounded-xs" />
          </div>
        </div>
      )

    case 'waste_financial':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-emerald-700 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
            <span className="text-[6px] text-white font-bold leading-none">8%</span>
          </div>
          <div className="flex gap-1 items-end h-6 pt-1 px-1">
            <div className="w-2 bg-slate-200 dark:bg-slate-700 rounded-xs h-3" />
            <div className="w-2 bg-slate-300 dark:bg-slate-600 rounded-xs h-4" />
            <div className="w-2 bg-emerald-500 rounded-xs h-5" />
            <div className="w-2 bg-[#1B5C2E] rounded-xs h-6" />
          </div>
          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-slate-500 font-bold">TOTAL FCFA</span>
            <div className="h-1 w-4 bg-emerald-600 rounded-xs" />
          </div>
        </div>
      )

    case 'samples_stock':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex items-center justify-between shadow-2xs select-none pointer-events-none">
          <div className="w-7 h-7 rounded-full border-2 border-emerald-600 flex items-center justify-center relative">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="flex-1 pl-1 space-y-0.5">
            <div className="flex justify-between text-[5px] text-slate-500">
              <span>Dispo</span>
              <span className="font-bold text-emerald-600">82%</span>
            </div>
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[82%]" />
            </div>
            <div className="flex justify-between text-[5px] text-slate-500">
              <span>Quar.</span>
              <span className="font-bold text-amber-500">18%</span>
            </div>
            <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-[18%]" />
            </div>
          </div>
        </div>
      )

    case 'waste_categories':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-1.5 w-10 bg-slate-400 rounded-xs mb-0.5" />
          <div className="space-y-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-slate-400 w-3">C1</span>
              <div className="h-1 bg-red-500 rounded-xs w-10" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-slate-400 w-3">C2</span>
              <div className="h-1 bg-amber-500 rounded-xs w-14" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[5px] text-slate-400 w-3">C3</span>
              <div className="h-1 bg-emerald-500 rounded-xs w-8" />
            </div>
          </div>
          <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-xs" />
        </div>
      )

    case 'samples_receptions':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-blue-700 rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-8 bg-white/80 rounded-xs" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-6 bg-slate-400 rounded-xs" />
              <div className="h-1 w-2 bg-blue-500 rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xs flex items-center justify-between px-1">
              <div className="h-1 w-8 bg-slate-400 rounded-xs" />
              <div className="h-1 w-2 bg-blue-500 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-blue-50 dark:bg-blue-950/40 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-4 bg-blue-600 rounded-xs" />
            <div className="h-1 w-3 bg-blue-400 rounded-xs" />
          </div>
        </div>
      )

    case 'waste_seizures':
      return (
        <div className="w-22 h-15 rounded-lg border border-red-200 bg-red-50/40 dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-red-700 rounded-xs mb-0.5 flex items-center justify-between px-1">
            <div className="h-1 w-8 bg-white/80 rounded-xs" />
            <div className="w-1.5 h-1.5 rounded-full bg-white" />
          </div>
          <div className="space-y-0.5">
            <div className="h-1.5 w-full bg-red-100/70 dark:bg-red-950/40 rounded-xs flex items-center px-1 gap-1">
              <div className="w-1 h-1 bg-red-500 rounded-full" />
              <div className="h-1 w-9 bg-slate-400 rounded-xs" />
            </div>
            <div className="h-1.5 w-full bg-red-100/70 dark:bg-red-950/40 rounded-xs flex items-center px-1 gap-1">
              <div className="w-1 h-1 bg-red-500 rounded-full" />
              <div className="h-1 w-7 bg-slate-400 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-red-200/50 rounded-xs flex justify-end items-center px-1">
            <div className="h-1 w-5 bg-red-600 rounded-xs" />
          </div>
        </div>
      )

    case 'samples_movements':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-purple-700 rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
          </div>
          <div className="flex items-center justify-around py-0.5">
            <div className="w-3.5 h-3.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 flex items-center justify-center text-[6px] font-bold">
              IN
            </div>
            <div className="h-0.5 w-5 bg-purple-400 relative">
              <div className="absolute right-0 top-[-2px] w-1 h-1 border-t-2 border-r-2 border-purple-400 rotate-45" />
            </div>
            <div className="w-3.5 h-3.5 rounded bg-purple-600 text-white flex items-center justify-center text-[6px] font-bold">
              OUT
            </div>
          </div>
          <div className="h-1.5 w-full bg-purple-50 dark:bg-purple-950/30 rounded-xs flex items-center justify-between px-1">
            <div className="h-1 w-5 bg-purple-500 rounded-xs" />
            <div className="h-1 w-3 bg-purple-700 rounded-xs" />
          </div>
        </div>
      )

    case 'waste_destructions':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-amber-600 rounded-xs mb-0.5 flex items-center justify-between px-1">
            <div className="h-1 w-7 bg-white/80 rounded-xs" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
          </div>
          <div className="flex-1 flex flex-col justify-center items-center py-0.5">
            <div className="w-4 h-4 rounded-full border border-amber-500/40 flex items-center justify-center">
              <Flame className="w-2.5 h-2.5 text-amber-600" />
            </div>
            <span className="text-[5px] text-slate-500 font-bold mt-0.5">PV OFFICIEL</span>
          </div>
          <div className="h-1.5 w-full bg-amber-50 dark:bg-amber-950/30 rounded-xs flex justify-between items-center px-1">
            <div className="h-1 w-6 bg-amber-600 rounded-xs" />
            <div className="h-1 w-2 bg-amber-500 rounded-xs" />
          </div>
        </div>
      )

    case 'samples_expirations':
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-orange-600 rounded-xs mb-0.5 flex items-center px-1">
            <div className="h-1 w-8 bg-white/80 rounded-xs" />
          </div>
          <div className="space-y-0.5 py-0.5">
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-emerald-500 rounded-xs w-12" />
              <span className="text-[4px] text-slate-400">&gt;6m</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-amber-500 rounded-xs w-7" />
              <span className="text-[4px] text-slate-400">&lt;3m</span>
            </div>
          </div>
          <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-xs" />
        </div>
      )

    case 'executive_summary':
      return (
        <div className="w-22 h-15 rounded-lg border border-emerald-500/40 bg-emerald-50/20 dark:bg-slate-900 p-1 flex flex-col justify-between shadow-2xs select-none pointer-events-none">
          <div className="h-2 w-full bg-[#1B5C2E] rounded-xs mb-0.5 flex items-center justify-between px-1">
            <div className="h-1 w-10 bg-white/80 rounded-xs" />
            <div className="h-1 w-2 bg-emerald-300 rounded-xs" />
          </div>
          <div className="grid grid-cols-2 gap-1 py-0.5">
            <div className="h-2.5 rounded-xs bg-slate-100 dark:bg-slate-800 p-0.5 flex flex-col justify-center">
              <div className="h-0.5 w-4 bg-slate-400 rounded-xs mb-0.5" />
              <div className="h-1 w-3 bg-[#1B5C2E] rounded-xs" />
            </div>
            <div className="h-2.5 rounded-xs bg-slate-100 dark:bg-slate-800 p-0.5 flex flex-col justify-center">
              <div className="h-0.5 w-4 bg-slate-400 rounded-xs mb-0.5" />
              <div className="h-1 w-3 bg-amber-500 rounded-xs" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-[#1B5C2E]/10 rounded-xs flex items-center justify-between px-1">
            <span className="text-[5px] text-[#1B5C2E] font-bold">SYNTHÈSE DG</span>
            <div className="h-1 w-3 bg-[#1B5C2E] rounded-xs" />
          </div>
        </div>
      )

    default:
      return (
        <div className="w-22 h-15 rounded-lg border border-border/80 bg-white dark:bg-slate-900 p-1 flex items-center justify-center shadow-2xs">
          <FileText className="w-5 h-5 text-slate-400" />
        </div>
      )
  }
}

export default function ReportsClient({
  samples: initialSamples = [],
  movements: initialMovements = [],
  wasteBatches: initialWaste = [],
  destructions: initialDestructions = [],
}: Props) {
  // Navigation & Rapport actif
  const [reportType, setReportType] = useState('financial_detailed_audit')
  const [cardCategoryFilter, setCardCategoryFilter] = useState('all')
  const [cardSearchQuery, setCardSearchQuery] = useState('')

  // Filtres périodiques & critères du rapport sélectionné
  const [periodPreset, setPeriodPreset] = useState('year_2026')
  const [customStartDate, setCustomStartDate] = useState('2026-01-01')
  const [customEndDate, setCustomEndDate] = useState('2026-12-31')
  const [selectedWarehouse, setSelectedWarehouse] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [tableSearchQuery, setTableSearchQuery] = useState('')

  // Pagination pour le tableau
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Données locales et synchronisées
  const [samples, setSamples] = useState<Sample[]>(initialSamples)
  const [receptions, setReceptions] = useState<ReceptionRecord[]>([])
  const [movements, setMovements] = useState<Movement[]>(initialMovements)
  const [wasteBatches, setWasteBatches] = useState<WasteBatch[]>(initialWaste)
  const [destructions, setDestructions] = useState<DestructionPlan[]>(initialDestructions)
  const [centersList, setCentersList] = useState<Center[]>([])
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([])
  const [groupedPackagesList, setGroupedPackagesList] = useState<GroupedWastePackage[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const hasLoadedOnceRef = useRef(false)
  const reportViewerRef = useRef<HTMLDivElement>(null)

  // Chargement des données unifiées
  const loadReportsData = useCallback(async (manual = false) => {
    if (typeof window === 'undefined') return
    if (manual) setIsSyncing(true)

    const isWiped = localStorage.getItem('all_data_wiped') === 'true'
    let sampleOverrides: Record<string, any> = {}
    let deletedIds: string[] = []
    try {
      const ov = localStorage.getItem('local_sample_overrides')
      if (ov) sampleOverrides = JSON.parse(ov)
      deletedIds = JSON.parse(localStorage.getItem('reception_deleted_ids') || '[]')
    } catch (e) {}

    const sampleMap = new Map<string, any>()
    const recMap = new Map<string, any>()
    const mvtMap = new Map<string, any>()
    const wasteMap = new Map<string, any>()
    const destMap = new Map<string, any>()

    if (!isWiped) {
      try {
        const localRecs = JSON.parse(
          localStorage.getItem('reception_history_records') ||
          localStorage.getItem('local_receptions_history') ||
          '[]'
        )
        if (Array.isArray(localRecs)) {
          localRecs.forEach((r: any) => {
            const rKey = r.rec_number || r.reception_number || r.id
            if (!rKey || deletedIds.includes(rKey)) return
            recMap.set(rKey, r)

            let sList = Array.isArray(r.samples_data) ? r.samples_data : []
            if (sList.length === 0) {
              const rawDetails = localStorage.getItem('reception_draft_details_' + rKey)
              if (rawDetails) {
                try {
                  const parsed = JSON.parse(rawDetails)
                  if (Array.isArray(parsed?.formData?.samples)) sList = parsed.formData.samples
                } catch (e) {}
              }
            }
            sList.forEach((s: any, idx: number) => {
              if (!s.commercial_name) return
              const sid = s.sample_number || s.id || `ECH-${String(rKey).replace('REC-', '')}-${idx + 1}`
              if (deletedIds.includes(sid)) return
              const ov = sampleOverrides[sid] || sampleOverrides[s.sample_number] || {}
              sampleMap.set(sid, {
                id: sid,
                sample_number: sid,
                commercial_name: s.commercial_name || 'Échantillon',
                quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.qty ?? s.quantity ?? s.received_quantity ?? 1),
                status: ov.status || s.status || 'Disponible',
                storage_location: ov.storage_location || s.location || s.storage_location || 'Magasin Central',
                expiry_date: s.expiry_date || s.expiry || '2027-12-31',
                created_at: r.date_reception || r.created_at || new Date().toISOString(),
                reception_ref: rKey,
              })
            })
          })
        }

        const localMvts = JSON.parse(localStorage.getItem('local_movements_history') || '[]')
        if (Array.isArray(localMvts)) {
          localMvts.forEach((m: any) => {
            if (m.id) mvtMap.set(m.id, m)
          })
        }

        const localWaste = JSON.parse(localStorage.getItem('waste_batches_custom_v1') || '[]')
        if (Array.isArray(localWaste)) {
          localWaste.forEach((w: any) => {
            const k = w.batch_number || w.id
            if (k) wasteMap.set(k, w)
          })
        }

        const localDest = JSON.parse(localStorage.getItem('destruction_plans_custom_v1') || '[]')
        if (Array.isArray(localDest)) {
          localDest.forEach((d: any) => {
            const k = d.plan_number || d.id
            if (k) destMap.set(k, d)
          })
        }

        // Colis groupés
        const dissolvedSet = getLocalDissolvedPackageNumbers()
        const storedPkgs = JSON.parse(localStorage.getItem('waste_grouped_packages_v1') || '[]')
        if (Array.isArray(storedPkgs)) {
          const activePkgs = storedPkgs.filter(
            (p: any) => !dissolvedSet.has(p.package_number) && (!p.id || !dissolvedSet.has(p.id))
          )
          setGroupedPackagesList(activePkgs)
        }

        // Rendez-vous
        const localAppts = getAppointmentsSync ? getAppointmentsSync() : []
        setAppointmentsList(localAppts)
      } catch (e) {}

      if (!hasLoadedOnceRef.current && (sampleMap.size > 0 || wasteMap.size > 0)) {
        setSamples(Array.from(sampleMap.values()))
        setReceptions(Array.from(recMap.values()))
        setMovements(Array.from(mvtMap.values()))
        setWasteBatches(Array.from(wasteMap.values()))
        setDestructions(Array.from(destMap.values()))
        hasLoadedOnceRef.current = true
      }
    }

    try {
      const supabase = createClient()
      const [sRes, rRes, mRes, wRes, dRes] = await Promise.all([
        supabase.from('samples').select('*'),
        supabase.from('receptions').select('*'),
        supabase.from('movements').select('*'),
        supabase.from('waste_batches').select('*'),
        supabase.from('destruction_plans').select('*'),
      ])

      if (rRes.data && rRes.data.length > 0) {
        rRes.data.forEach((r: any) => {
          const rKey = r.rec_number || r.reception_number || r.id
          if (!rKey || deletedIds.includes(rKey)) return
          recMap.set(rKey, r)
          if (Array.isArray(r.samples_data)) {
            r.samples_data.forEach((s: any, idx: number) => {
              if (!s.commercial_name) return
              const sid = s.sample_number || s.id || `ECH-${String(rKey).replace('REC-', '')}-${idx + 1}`
              if (!sampleMap.has(sid) && !deletedIds.includes(sid)) {
                const ov = sampleOverrides[sid] || {}
                sampleMap.set(sid, {
                  id: sid,
                  sample_number: sid,
                  commercial_name: s.commercial_name || 'Échantillon',
                  quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.qty ?? s.quantity ?? 1),
                  status: ov.status || s.status || 'Disponible',
                  storage_location: ov.storage_location || s.location || 'Magasin Central',
                  expiry_date: s.expiry_date || '2027-12-31',
                  created_at: r.date_reception || r.created_at || new Date().toISOString(),
                  reception_ref: rKey,
                })
              }
            })
          }
        })
      }

      if (sRes.data && sRes.data.length > 0) {
        sRes.data.forEach((s: any) => {
          const sid = s.sample_number || s.id
          if (!sid || deletedIds.includes(sid)) return
          const ov = sampleOverrides[sid] || sampleOverrides[s.id] || {}
          sampleMap.set(sid, {
            ...s,
            quantity: ov.quantity !== undefined ? Number(ov.quantity) : Number(s.quantity ?? 1),
            status: ov.status || s.status || 'Disponible',
          })
        })
      }

      if (mRes.data && mRes.data.length > 0) {
        mRes.data.forEach((m: any) => {
          if (m.id) mvtMap.set(m.id, m)
        })
      }

      if (wRes.data && wRes.data.length > 0) {
        wRes.data.forEach((w: any) => {
          const k = w.batch_number || w.id
          if (k) wasteMap.set(k, w)
        })
      }

      if (dRes.data && dRes.data.length > 0) {
        dRes.data.forEach((d: any) => {
          const k = d.plan_number || d.id
          if (k) destMap.set(k, d)
        })
      }

      hasLoadedOnceRef.current = true
      setSamples(Array.from(sampleMap.values()))
      setReceptions(Array.from(recMap.values()))
      setMovements(Array.from(mvtMap.values()))
      setWasteBatches(Array.from(wasteMap.values()))
      setDestructions(Array.from(destMap.values()))

      try {
        const cList = await getRegisteredCenters()
        setCentersList(cList)
      } catch (cErr) {
        console.warn("Notice fetch centers in reports:", cErr)
      }
    } catch (err) {
      console.warn("Sync fallback in ReportsClient:", err)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  useEffect(() => {
    loadReportsData()
  }, [loadReportsData])

  useRealtimeSync({
    tables: ['samples', 'receptions', 'movements', 'waste_batches', 'destruction_plans'],
    onSync: loadReportsData,
    pollIntervalMs: 8000,
  })

  // Réinitialiser la pagination si les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [reportType, periodPreset, customStartDate, customEndDate, selectedWarehouse, selectedCategory, tableSearchQuery])

  // Calcul des bornes de dates selon le preset
  const dateRange = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    let start = new Date(currentYear, 0, 1)
    let end = new Date(currentYear, 11, 31, 23, 59, 59)
    let label = 'Exercice en cours'

    switch (periodPreset) {
      case 'today': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        label = "Aujourd'hui (" + now.toLocaleDateString('fr-FR') + ")"
        break
      }
      case 'week': {
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1)
        start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0)
        end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59)
        label = 'Cette semaine'
        break
      }
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        label = now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
        break
      }
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0)
        end = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59)
        label = `T${q + 1} ${currentYear}`
        break
      }
      case 'year_2025': {
        start = new Date(2025, 0, 1, 0, 0, 0)
        end = new Date(2025, 11, 31, 23, 59, 59)
        label = 'Exercice 2025'
        break
      }
      case 'year_2026': {
        start = new Date(2026, 0, 1, 0, 0, 0)
        end = new Date(2026, 11, 31, 23, 59, 59)
        label = 'Exercice 2026'
        break
      }
      case 'custom': {
        start = customStartDate ? new Date(customStartDate + 'T00:00:00') : new Date(2020, 0, 1)
        end = customEndDate ? new Date(customEndDate + 'T23:59:59') : new Date()
        label = `Du ${start.toLocaleDateString('fr-FR')} au ${end.toLocaleDateString('fr-FR')}`
        break
      }
      default: {
        start = new Date(currentYear, 0, 1, 0, 0, 0)
        end = new Date(currentYear, 11, 31, 23, 59, 59)
        label = `Année Civile ${currentYear}`
        break
      }
    }

    return { start, end, label }
  }, [periodPreset, customStartDate, customEndDate])

  // Helper de filtrage par date
  const isDateInRange = useCallback((dateStr?: string | null) => {
    if (!dateStr) return true
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return true
      return d >= dateRange.start && d <= dateRange.end
    } catch {
      return true
    }
  }, [dateRange])

  // Helper de filtrage par magasin
  const isWarehouseMatch = useCallback((wh?: string | null) => {
    if (selectedWarehouse === 'all') return true
    if (!wh) return selectedWarehouse === 'Magasin Cotonou'
    return wh.toLowerCase().includes(selectedWarehouse.toLowerCase())
  }, [selectedWarehouse])

  // Filtrage des collections selon la période et le magasin
  const filteredWaste = useMemo(() => {
    return wasteBatches.filter((w) => {
      const d = w.reception_date || w.date_reception || w.created_at
      const dateOk = isDateInRange(d)
      const whOk = isWarehouseMatch(w.warehouse)
      const catOk = selectedCategory === 'all' || (w.product_category || '').includes(selectedCategory)
      return dateOk && whOk && catOk
    })
  }, [wasteBatches, isDateInRange, isWarehouseMatch, selectedCategory])

  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      const d = s.created_at
      const dateOk = isDateInRange(d)
      const whOk = isWarehouseMatch(s.storage_location)
      return dateOk && whOk
    })
  }, [samples, isDateInRange, isWarehouseMatch])

  const filteredReceptions = useMemo(() => {
    return receptions.filter((r) => {
      const d = r.date_reception || r.created_at
      return isDateInRange(d)
    })
  }, [receptions, isDateInRange])

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const d = m.created_at
      const dateOk = isDateInRange(d)
      const whOk = isWarehouseMatch(m.from_location) || isWarehouseMatch(m.to_location)
      return dateOk && whOk
    })
  }, [movements, isDateInRange, isWarehouseMatch])

  const filteredDestructions = useMemo(() => {
    return destructions.filter((d) => {
      const dt = d.execution_date || d.created_at
      return isDateInRange(dt)
    })
  }, [destructions, isDateInRange])

  const filteredAppointments = useMemo(() => {
    return appointmentsList.filter((a) => {
      return isDateInRange(a.date)
    })
  }, [appointmentsList, isDateInRange])

  const filteredGroupedPackages = useMemo(() => {
    return groupedPackagesList.filter((p) => {
      const dt = p.created_at
      const dateOk = isDateInRange(dt)
      const whOk = isWarehouseMatch(p.current_location)
      return dateOk && whOk
    })
  }, [groupedPackagesList, isDateInRange, isWarehouseMatch])

  // Indicateurs & KPIs dynamiques calculés
  const kpis = useMemo(() => {
    const totalSamplesStock = samples.reduce((acc, s) => acc + (Number(s.quantity) || 1), 0)
    const samplesReceivedInPeriod = filteredSamples.length

    const totalWasteKg = filteredWaste.reduce((acc, w) => acc + (Number(w.quantity) || 0), 0)
    const totalWasteTonnes = (totalWasteKg / 1000).toFixed(2)

    const totalDestroyedKg = filteredDestructions
      .filter((d) => (d.status || '').toLowerCase().includes('exé') || (d.status || '').toLowerCase().includes('exec') || (d.status || '').toLowerCase().includes('détruit'))
      .reduce((acc, d) => acc + (Number(d.total_weight) || 0), 0)

    const totalTransferCostFCFA = filteredWaste.reduce((acc, w) => {
      return acc + (Number(w.transfer_cost_amount) || 0)
    }, 0)

    const totalAbmedFeeFCFA = filteredWaste.reduce((acc, w) => {
      if (w.abmed_fee_8_percent !== undefined && w.abmed_fee_8_percent !== null) {
        return acc + Number(w.abmed_fee_8_percent)
      }
      return acc + Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
    }, 0)

    // Estimation des frais de prise en charge et neutralisation (ex: 450 FCFA / kg)
    const totalProcessingFeesFCFA = Math.round(totalWasteKg * 450)
    const grandTotalPayableFCFA = totalAbmedFeeFCFA + totalProcessingFeesFCFA

    // Taux de recouvrement (payé vs en attente)
    const paidBatches = filteredWaste.filter((w) => {
      const st = (w.status || '').toLowerCase()
      return st.includes('payé') || st.includes('acquitt') || st.includes('encaiss') || st.includes('exécut')
    })
    const paidFeeFCFA = paidBatches.reduce((acc, w) => {
      const amt = Number(w.transfer_cost_amount) || 0
      return acc + (w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round(amt * 0.08))
    }, 0)
    const recoveryRate = totalAbmedFeeFCFA > 0 ? Math.round((paidFeeFCFA / totalAbmedFeeFCFA) * 100) : 100

    const mvtCount = filteredMovements.length
    const nonConformSamples = filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('quarantaine')).length
    const conformityRate = filteredSamples.length === 0 ? 100 : Math.round(((filteredSamples.length - nonConformSamples) / filteredSamples.length) * 100)

    return {
      totalSamplesStock,
      samplesReceivedInPeriod,
      totalWasteKg,
      totalWasteTonnes,
      totalDestroyedKg,
      totalTransferCostFCFA,
      totalAbmedFeeFCFA,
      totalProcessingFeesFCFA,
      grandTotalPayableFCFA,
      paidFeeFCFA,
      recoveryRate,
      mvtCount,
      conformityRate,
    }
  }, [samples, filteredSamples, filteredWaste, filteredDestructions, filteredMovements])

  // Données de graphiques
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredWaste.forEach((w) => {
      const cat = w.product_category || 'Non catégorisé'
      const simpleCat = cat.split('-')[0].trim()
      map[simpleCat] = (map[simpleCat] || 0) + (Number(w.quantity) || 0)
    })
    return Object.entries(map).map(([name, weight]) => ({ name, weight }))
  }, [filteredWaste])

  const sampleStatusData = useMemo(() => {
    const counts = {
      'En stock': filteredSamples.filter((s) => s.status === 'Disponible' || s.status === 'En stock' || !s.status).length,
      'Quarantaine': filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('quarantaine')).length,
      'En analyse': filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('analyse')).length,
      'Périmé': filteredSamples.filter((s) => (s.status || '').toLowerCase().includes('périmé') || (s.status || '').toLowerCase().includes('expire')).length,
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredSamples])

  // -------------------------------------------------------------
  // DÉFINITION EXHAUSTIVE DES 16 RAPPORTS OFFICIELS eGED ABMed
  // -------------------------------------------------------------
  const reportDefinitions: Record<
    string,
    {
      id: string
      title: string
      shortTitle: string
      category: 'waste' | 'samples' | 'financial' | 'executive'
      categoryLabel: string
      badgeColor: string
      infoText: string
      description: string
      getRows: () => { headers: string[]; rows: any[][]; exportData: Record<string, any>[] }
    }
  > = useMemo(() => {
    return {
      // 1. RAPPORT FINANCIER DÉTAILLÉ & RECOUVREMENT (NOUVEAU - REQUIS PAR L'UTILISATEUR)
      financial_detailed_audit: {
        id: 'financial_detailed_audit',
        title: "Rapport Financier Détaillé & Recouvrement Trésorerie ABMeD (Redevances 8% & Prestations)",
        shortTitle: "Recouvrement & Trésorerie",
        category: 'financial',
        categoryLabel: "Finances & 8%",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
        infoText: "Journal détaillé ligne par ligne des cessions de déchets, calcul de la redevance légale de 8%, frais de neutralisation et état de recouvrement au Trésor Public.",
        description: "Contrôle financier exhaustif : montant HT de cession, assiette de redevance (8%), frais de prise en charge et quittance de règlement.",
        getRows: () => {
          const headers = [
            "N° Récépissé / Lot",
            "Date",
            "Centre Apporteur & CTR",
            "Type Structure",
            "Nature des Déchets",
            "Poids (Kg)",
            "Mode de Cession",
            "Cession HT (FCFA)",
            "Redevance 8% (FCFA)",
            "Frais Prise Charge (FCFA)",
            "Total Dû (FCFA)",
            "Statut Règlement",
            "Mode de Règlement",
          ]

          const exportData: Record<string, any>[] = filteredWaste.map((w, idx) => {
            const dateStr = w.reception_date || w.date_reception || w.created_at ? new Date(w.reception_date || w.date_reception || w.created_at || '').toLocaleDateString('fr-FR') : '-'
            const amt = Number(w.transfer_cost_amount) || 0
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round(amt * 0.08)
            const wt = Number(w.quantity) || 0
            const handlingCost = Math.round(wt * 450) // 450 FCFA/kg pour incinération & logistique
            const totalDue = fee + handlingCost
            const code = w.source_structure_code || w.center_code || 'CTR-2026'
            const mode = w.transfer_cost_mode === 'dons' ? 'Dons (Exonéré)' : w.transfer_cost_mode === 'na' ? 'Non Applicable' : 'À titre onéreux'
            const isSettled = (w.status || '').toLowerCase().includes('payé') || (w.status || '').toLowerCase().includes('acquitt') || (w.status || '').toLowerCase().includes('exécut')

            return {
              "N° Récépissé / Lot": w.reception_number || w.batch_number || `REC-2026-${idx + 1}`,
              "Date": dateStr,
              "Centre Apporteur & CTR": `${w.source_structure || 'Structure'} (${code})`,
              "Type Structure": w.source_structure_type || "Officine / Grossiste",
              "Nature des Déchets": (w.commercial_name || w.product_nature || w.waste_type || "Déchets pharmaceutiques").substring(0, 35),
              "Poids (Kg)": `${wt.toLocaleString('fr-FR')} kg`,
              "Mode de Cession": mode,
              "Cession HT (FCFA)": amt.toLocaleString('fr-FR'),
              "Redevance 8% (FCFA)": fee.toLocaleString('fr-FR'),
              "Frais Prise Charge (FCFA)": handlingCost.toLocaleString('fr-FR'),
              "Total Dû (FCFA)": totalDue.toLocaleString('fr-FR'),
              "Statut Règlement": isSettled ? "Acquitté / Payé" : "En attente de paiement",
              "Mode de Règlement": isSettled ? "Virement Trésor Public" : "Quittance en cours",
            }
          })

          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 2. BILAN FINANCIER & 8% (EXISTANT OPTIMISÉ)
      waste_financial: {
        id: 'waste_financial',
        title: "Bilan financier des cessions et redevance réglementaire ABMed (8%)",
        shortTitle: "Bilan Financier & 8%",
        category: 'financial',
        categoryLabel: "Finances & 8%",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
        infoText: "Détaille la valeur totale de cession déclarée par les établissements et calcule la redevance légale de 8% due à l'ABMed.",
        description: "Valorisation financière des cessions de déchets et calcul de la redevance légale de 8% due à l'ABMed.",
        getRows: () => {
          const headers = [
            "N° Lot Déchet",
            "Date Réception",
            "Structure Déposante",
            "Mode de Cession",
            "Poids (Kg)",
            "Montant Cession (FCFA)",
            "Redevance 8% ABMed (FCFA)",
            "Statut Décharge",
          ]
          const exportData: Record<string, any>[] = filteredWaste.map((w) => {
            const dateStr = w.reception_date || w.date_reception || w.created_at ? new Date(w.reception_date || w.date_reception || w.created_at || '').toLocaleDateString('fr-FR') : '-'
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
            return {
              "N° Lot Déchet": w.batch_number || w.id,
              "Date Réception": dateStr,
              "Structure Déposante": w.source_structure || "Officine / Grossiste",
              "Mode de Cession": w.transfer_cost_mode || "À titre onéreux",
              "Poids (Kg)": `${Number(w.quantity) || 0} kg`,
              "Montant Cession (FCFA)": (Number(w.transfer_cost_amount) || 0).toLocaleString('fr-FR'),
              "Redevance 8% ABMed (FCFA)": fee.toLocaleString('fr-FR'),
              "Statut Décharge": w.status || "Réceptionné",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 3. RAPPORT DES RENDEZ-VOUS & PONCTUALITÉ DES CENTRES (NOUVEAU - REQUIS PAR L'UTILISATEUR)
      appointments_report: {
        id: 'appointments_report',
        title: "Rapport de Gestion des Rendez-vous & Fréquentation des Centres Apporteurs",
        shortTitle: "Rendez-vous & Centres",
        category: 'executive',
        categoryLabel: "Rendez-vous & Dépôts",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
        infoText: "Suivi des créneaux de dépôt réservés par les centres, volumes prévisionnels d'échantillons/déchets, taux d'assiduité et ponctualité.",
        description: "Planification des créneaux de réception, ponctualité des transporteurs et état d'occupation des quais ABMeD.",
        getRows: () => {
          const headers = [
            "N° Rendez-vous",
            "Date Prévue",
            "Créneau Horaire",
            "Centre Apporteur & CTR",
            "Type d'Établissement",
            "Type de Dépôt",
            "Quantité Estimée",
            "Représentant / Déposant",
            "Téléphone",
            "Statut RDV",
          ]

          const exportData: Record<string, any>[] = filteredAppointments.map((a) => {
            const dtStr = a.date ? new Date(a.date).toLocaleDateString('fr-FR') : '-'
            return {
              "N° Rendez-vous": a.appointment_number || a.id,
              "Date Prévue": dtStr,
              "Créneau Horaire": a.time_slot || "09:00 - 11:00",
              "Centre Apporteur & CTR": `${a.center_name} (${a.center_code})`,
              "Type d'Établissement": a.center_type || "Établissement de santé",
              "Type de Dépôt": a.type,
              "Quantité Estimée": a.estimated_quantity || "Non renseigné",
              "Représentant / Déposant": a.depositor_name || "-",
              "Téléphone": a.contact_phone || "-",
              "Statut RDV": a.status,
            }
          })

          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 4. RAPPORT DE TRAÇABILITÉ DES REGROUPEMENTS (COLIS, FÛTS, SACS) (NOUVEAU - REQUIS PAR L'UTILISATEUR)
      waste_packages_tracking: {
        id: 'waste_packages_tracking',
        title: "Rapport de Traçabilité des Mouvements & Regroupements (Colis, Fûts & Sacs Scellés)",
        shortTitle: "Colis & Regroupements",
        category: 'waste',
        categoryLabel: "Regroupements & Fûts",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
        infoText: "Inventaire et traçabilité des colis groupés de déchets pharmaceutiques : contenants étanches, fûts 200L, cartons scellés, masses brutes et zones de stockage.",
        description: "Suivi logistique des conditionnements groupés, pesées certifiées, contenants étanches et codes scellés de sécurité.",
        getRows: () => {
          const headers = [
            "N° Colis Groupé",
            "Désignation du Colis",
            "Type de Conditionnement",
            "Nombre de Lots Inclus",
            "Poids Total (Kg)",
            "Emplacement de Stockage",
            "Date de Conditionnement",
            "Opérateur ABMed",
            "Statut Colis",
          ]

          const exportData: Record<string, any>[] = filteredGroupedPackages.map((p) => {
            const dtStr = p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '-'
            const itemsCount = Array.isArray(p.items) ? p.items.length : (Array.isArray(p.item_ids) ? p.item_ids.length : 1)
            return {
              "N° Colis Groupé": p.package_number,
              "Désignation du Colis": p.package_name || "Colis groupé de déchets",
              "Type de Conditionnement": p.package_type || "Fût PEHD / Carton",
              "Nombre de Lots Inclus": String(itemsCount),
              "Poids Total (Kg)": `${Number(p.total_weight || 0).toLocaleString('fr-FR')} kg`,
              "Emplacement de Stockage": p.current_location || "Magasin Central",
              "Date de Conditionnement": dtStr,
              "Opérateur ABMed": p.created_by || "Agent eGED",
              "Statut Colis": p.status || "Scellé & Prêt pour Destruction",
            }
          })

          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 5. RAPPORT DE CONFORMITÉ & QUALITÉ LNC (NOUVEAU - REQUIS PAR L'UTILISATEUR)
      samples_lnc_quality: {
        id: 'samples_lnc_quality',
        title: "Rapport de Contrôle Qualité LNC & Conformité des Échantillons Pharmaceutiques",
        shortTitle: "Contrôle LNC & Conformité",
        category: 'samples',
        categoryLabel: "Qualité & LNC",
        badgeColor: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300",
        infoText: "Registre des vérifications physiques et analyses au Laboratoire National de Contrôle (LNC) pour octroi d'AMM et surveillance du marché.",
        description: "Contrôle de conformité galénique, intégrité du conditionnement et rapport d'essais analytiques LNC.",
        getRows: () => {
          const headers = [
            "N° Échantillon",
            "Nom Commercial & Dosage",
            "Fabricant / Demandeur",
            "Emplacement de Garde",
            "Péremption",
            "Conformité Physique",
            "Statut Qualité LNC",
            "Décision d'Homologation",
          ]

          const exportData: Record<string, any>[] = filteredSamples.map((s) => {
            const isQuarantine = (s.status || '').toLowerCase().includes('quarantaine')
            const isExpired = (s.status || '').toLowerCase().includes('périmé')
            const statusLabel = isQuarantine ? "Non Conforme (Réserves)" : isExpired ? "Périmé (Déclassé)" : "Conforme aux normes BPL"
            const decision = isQuarantine ? "En attente contre-expertise" : isExpired ? "Proposé pour Destruction" : "Autorisé / AMM Active"

            return {
              "N° Échantillon": s.sample_number || s.id,
              "Nom Commercial & Dosage": s.commercial_name || "Produit pharmaceutique",
              "Fabricant / Demandeur": s.reception_ref ? `Dossier ${s.reception_ref}` : "Fabricant agréé",
              "Emplacement de Garde": s.storage_location || "Magasin Central",
              "Péremption": s.expiry_date || "2027-12-31",
              "Conformité Physique": isQuarantine ? "Réserves constatées" : "Intégrité validée",
              "Statut Qualité LNC": statusLabel,
              "Décision d'Homologation": decision,
            }
          })

          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 6. REGISTRE OFFICIEL DES BORDEREAUX DE TRANSFERT & DÉCHARGES (NOUVEAU)
      waste_transfer_slips: {
        id: 'waste_transfer_slips',
        title: "Registre Officiel des Bordereaux de Transfert & Récépissés Décharges Déchets",
        shortTitle: "Bordereaux de Transfert",
        category: 'waste',
        categoryLabel: "Décharges & Récépissés",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
        infoText: "Journal chronologique de tous les bordereaux de transfert de déchets délivrés par l'ABMed aux structures apporteuses.",
        description: "Traçabilité administrative des décharges officielles remises aux responsables d'officines et grossistes.",
        getRows: () => {
          const headers = [
            "N° Récépissé",
            "Date de Dépôt",
            "Structure Apportrice",
            "Code CTR",
            "Déposant & Contact",
            "Poids Total (Kg)",
            "Frais Redevance 8%",
            "Agent Récepteur ABMed",
            "Statut Certificat",
          ]

          // Dédupliquer par numéro de réception si plusieurs lots
          const slipMap = new Map<string, any>()
          filteredWaste.forEach((w) => {
            const recKey = w.reception_number || w.delivery_slip_ref || w.batch_number || w.id
            if (!slipMap.has(recKey)) {
              slipMap.set(recKey, {
                recKey,
                date: w.reception_date || w.date_reception || w.created_at,
                source: w.source_structure || "Structure non déclarée",
                code: w.source_structure_code || w.center_code || "CTR-2026",
                depositor: `${w.depositor_name || 'Représentant'}${w.depositor_phone ? ` (${w.depositor_phone})` : ''}`,
                totalWeight: 0,
                totalFee: 0,
                agent: "Agent eGED ABMed",
                status: w.status || "Validé",
              })
            }
            const cur = slipMap.get(recKey)
            cur.totalWeight += Number(w.quantity) || 0
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
            cur.totalFee += fee
          })

          const exportData: Record<string, any>[] = Array.from(slipMap.values()).map((s) => ({
            "N° Récépissé": s.recKey,
            "Date de Dépôt": s.date ? new Date(s.date).toLocaleDateString('fr-FR') : '-',
            "Structure Apportrice": s.source,
            "Code CTR": s.code,
            "Déposant & Contact": s.depositor,
            "Poids Total (Kg)": `${s.totalWeight.toLocaleString('fr-FR')} kg`,
            "Frais Redevance 8%": `${s.totalFee.toLocaleString('fr-FR')} FCFA`,
            "Agent Récepteur ABMed": s.agent,
            "Statut Certificat": "Attestation Délivrée",
          }))

          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 7. ACTIVITÉ PAR CENTRE APPORTEUR (CONSOLIDÉ)
      centers_activity: {
        id: 'centers_activity',
        title: "Rapport d'activité consolidé par Centre Apporteur (Échantillons & Déchets)",
        shortTitle: "Activité par Centre",
        category: 'executive',
        categoryLabel: "Centres Apporteurs",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
        infoText: "Agrégation officielle de tous les dépôts d'échantillons et de déchets par structure et identifiant unique CTR.",
        description: "Suivi détaillé par centre apporteur avec identifiant CTR, volumes d'échantillons et tonnages de déchets apportés.",
        getRows: () => {
          const headers = [
            "Identifiant CTR",
            "Nom du Centre / Structure",
            "Type d'Établissement",
            "Ville",
            "Contact & Téléphone",
            "Nb Réceptions Éch.",
            "Nb Échantillons",
            "Nb Lots Déchets",
            "Poids Déchets (Kg)",
            "Dernier Dépôt",
          ]
          const stats = calculateCentersData(centersList, filteredReceptions, filteredWaste)
          const exportData: Record<string, any>[] = stats.map((s) => ({
            "Identifiant CTR": s.center.center_code,
            "Nom du Centre / Structure": s.center.name,
            "Type d'Établissement": s.center.center_type,
            "Ville": s.center.city,
            "Contact & Téléphone": `${s.center.contact_person || ''} ${s.center.phone ? `(${s.center.phone})` : ''}`.trim() || '-',
            "Nb Réceptions Éch.": s.samplesReceptionsCount,
            "Nb Échantillons": s.samplesCount,
            "Nb Lots Déchets": s.wasteBatchesCount,
            "Poids Déchets (Kg)": s.wasteTotalWeightKg,
            "Dernier Dépôt": s.lastActivityDate ? new Date(s.lastActivityDate).toLocaleDateString('fr-FR') : 'Aucun',
          }))

          const rows = exportData.map((d) => [
            d["Identifiant CTR"],
            d["Nom du Centre / Structure"],
            d["Type d'Établissement"],
            d["Ville"],
            d["Contact & Téléphone"],
            d["Nb Réceptions Éch."],
            d["Nb Échantillons"],
            d["Nb Lots Déchets"],
            `${d["Poids Déchets (Kg)"]} Kg`,
            d["Dernier Dépôt"],
          ])

          return { headers, rows, exportData }
        },
      },

      // 8. RÉCEPTIONS DES DÉCHETS
      waste_receptions: {
        id: 'waste_receptions',
        title: "Tableau de bord de la réception des déchets pharmaceutiques",
        shortTitle: "Réceptions de déchets",
        category: 'waste',
        categoryLabel: "Déchets",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
        infoText: "Rend compte des réceptions de déchets pharmaceutiques par structure déposante, nature, poids et valorisation financière de cession.",
        description: "Historique complet des réceptions avec structure déposante, nature, poids et valorisation financière.",
        getRows: () => {
          const headers = [
            "Date Réception",
            "N° Lot Déchet",
            "Désignation",
            "Structure Déposante",
            "Catégorie ABMed",
            "Poids (Kg)",
            "Coût Cession (FCFA)",
            "Redevance 8% (FCFA)",
            "Magasin",
          ]
          const exportData: Record<string, any>[] = filteredWaste.map((w) => {
            const dateStr = w.reception_date || w.date_reception || w.created_at ? new Date(w.reception_date || w.date_reception || w.created_at || '').toLocaleDateString('fr-FR') : '-'
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round((Number(w.transfer_cost_amount) || 0) * 0.08)
            return {
              "Date Réception": dateStr,
              "N° Lot Déchet": w.batch_number || w.id,
              "Désignation": w.commercial_name || w.waste_type || "Déchets pharmaceutiques",
              "Structure Déposante": w.source_structure || "Structure non déclarée",
              "Catégorie ABMed": (w.product_category || "Non classé").substring(0, 32),
              "Poids (Kg)": `${Number(w.quantity) || 0} kg`,
              "Coût Cession (FCFA)": (Number(w.transfer_cost_amount) || 0).toLocaleString('fr-FR'),
              "Redevance 8% (FCFA)": fee.toLocaleString('fr-FR'),
              "Magasin": w.warehouse || "Magasin Cotonou",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 9. DISPONIBILITÉ DES STOCKS D'ÉCHANTILLONS
      samples_stock: {
        id: 'samples_stock',
        title: "Disponibilité des stocks d'échantillons au niveau de l'ABMed",
        shortTitle: "Disponibilité des stocks",
        category: 'samples',
        categoryLabel: "Échantillons",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
        infoText: "Suivi de l'état des stocks d'échantillons en stock, en analyse ou en quarantaine au niveau central et des sites régionaux.",
        description: "Inventaire dynamique des échantillons conservés en chambre froide, salle climatisée et armoires sécurisées.",
        getRows: () => {
          const headers = [
            "N° Échantillon",
            "Nom Commercial / Produit",
            "Quantité en Stock",
            "Statut",
            "Emplacement de Stockage",
            "Date de Péremption",
            "Réf. Dossier Réception",
          ]
          const exportData: Record<string, any>[] = filteredSamples.map((s) => {
            return {
              "N° Échantillon": s.sample_number || s.id,
              "Nom Commercial / Produit": s.commercial_name || "Échantillon pharmaceutique",
              "Quantité en Stock": String(s.quantity ?? 1),
              "Statut": s.status || "Disponible",
              "Emplacement de Stockage": s.storage_location || "Magasin Central",
              "Date de Péremption": s.expiry_date || "2027-12-31",
              "Réf. Dossier Réception": s.reception_ref || "-",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 10. VENTILATION DES DÉCHETS PAR CATÉGORIES OFFICIELLES (1 À 5)
      waste_categories: {
        id: 'waste_categories',
        title: "Ventilation des déchets par Catégories officielles (Cat. 1 à 5)",
        shortTitle: "Catégories officielles",
        category: 'waste',
        categoryLabel: "Déchets",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
        infoText: "Présente le tonnage et les parts relatives (%) pour les 5 catégories réglementaires de déchets pharmaceutiques.",
        description: "Répartition analytique des masses et valorisations financières selon la nomenclature réglementaire.",
        getRows: () => {
          const headers = [
            "Catégorie Réglementaire",
            "Nombre de Lots",
            "Poids Total (Kg)",
            "Poids (Tonnes)",
            "Montant Cession (FCFA)",
            "Redevance ABMed (8%)",
            "Part du Tonnage (%)",
          ]
          const catMap: Record<string, { count: number; weight: number; cost: number; fee: number }> = {}
          let totalWeightAll = 0

          filteredWaste.forEach((w) => {
            const cat = w.product_category || 'Non classé'
            const wt = Number(w.quantity) || 0
            const cost = Number(w.transfer_cost_amount) || 0
            const fee = w.abmed_fee_8_percent !== undefined ? Number(w.abmed_fee_8_percent) : Math.round(cost * 0.08)

            totalWeightAll += wt
            if (!catMap[cat]) catMap[cat] = { count: 0, weight: 0, cost: 0, fee: 0 }
            catMap[cat].count += 1
            catMap[cat].weight += wt
            catMap[cat].cost += cost
            catMap[cat].fee += fee
          })

          const exportData: Record<string, any>[] = Object.entries(catMap).map(([cat, val]) => {
            const pct = totalWeightAll > 0 ? ((val.weight / totalWeightAll) * 100).toFixed(1) : '0'
            return {
              "Catégorie Réglementaire": cat,
              "Nombre de Lots": String(val.count),
              "Poids Total (Kg)": `${val.weight.toLocaleString('fr-FR')} kg`,
              "Poids (Tonnes)": `${(val.weight / 1000).toFixed(2)} T`,
              "Montant Cession (FCFA)": val.cost.toLocaleString('fr-FR'),
              "Redevance ABMed (8%)": val.fee.toLocaleString('fr-FR'),
              "Part du Tonnage (%)": `${pct} %`,
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 11. RÉCEPTIONS D'ÉCHANTILLONS
      samples_receptions: {
        id: 'samples_receptions',
        title: "État des réceptions d'échantillons au niveau national (LNC / AMM)",
        shortTitle: "Réceptions échantillons",
        category: 'samples',
        categoryLabel: "Échantillons",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
        infoText: "Recense l'ensemble des dépôts d'échantillons pour enregistrement, AMM ou contrôle de conformité par le LNC.",
        description: "Dossiers de dépôt d'échantillons pharmaceutiques pour enregistrement, contrôle qualité et analyse LNC.",
        getRows: () => {
          const headers = [
            "N° Réception",
            "Date",
            "Demandeur / Fabricant",
            "Pays d'Origine",
            "Motif de Dépôt",
            "Nb Produits",
            "Conformité Physique",
            "Statut Dossier",
          ]
          const exportData: Record<string, any>[] = filteredReceptions.map((r) => {
            const dtStr = r.date_reception || r.created_at ? new Date(r.date_reception || r.created_at || '').toLocaleDateString('fr-FR') : '-'
            const count = Array.isArray(r.samples_data) ? r.samples_data.length : 1
            return {
              "N° Réception": r.rec_number || r.reception_number || r.id,
              "Date": dtStr,
              "Demandeur / Fabricant": `${r.supplier || 'Demandeur'}${r.manufacturer ? ` (${r.manufacturer})` : ''}`,
              "Pays d'Origine": r.country || "Bénin",
              "Motif de Dépôt": r.type_reception || "Contrôle Qualité / AMM",
              "Nb Produits": String(count),
              "Conformité Physique": r.check_conform !== false ? "Conforme" : "Réserves",
              "Statut Dossier": r.status || "Validée",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 12. SAISIES & RAPPELS
      waste_seizures: {
        id: 'waste_seizures',
        title: "Registre des produits saisis, contentieux et rappels de lots",
        shortTitle: "Saisies & rappels",
        category: 'waste',
        categoryLabel: "Contrôle & Déchets",
        badgeColor: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300",
        infoText: "Traçabilité des médicaments et produits de santé saisis, séquestrés ou faisant l'objet d'un rappel officiel.",
        description: "Traçabilité des produits pharmaceutiques séquestrés pour saisie, contentieux ou rappel de lot fabricant.",
        getRows: () => {
          const headers = [
            "N° Lot Déchet",
            "Désignation Produit",
            "Typologie / Motif",
            "Structure / Origine",
            "Poids (Kg)",
            "Magasin de Séquestre",
            "Date Constat",
            "Statut Légal",
          ]
          const seizureBatches = filteredWaste.filter((w) => {
            const m = (w.destruction_motive || '').toLowerCase()
            return m.includes('saisi') || m.includes('rappel') || m.includes('contentieux') || m.includes('douane')
          })
          const exportData: Record<string, any>[] = seizureBatches.map((w) => {
            return {
              "N° Lot Déchet": w.batch_number || w.id,
              "Désignation Produit": w.commercial_name || w.waste_type || "Produit sous séquestre",
              "Typologie / Motif": w.destruction_motive || "Produit saisi",
              "Structure / Origine": w.source_structure || "Origine saisie",
              "Poids (Kg)": `${Number(w.quantity) || 0} kg`,
              "Magasin de Séquestre": w.warehouse || "Magasin Cotonou",
              "Date Constat": w.reception_date || w.created_at ? new Date(w.reception_date || w.created_at || '').toLocaleDateString('fr-FR') : '-',
              "Statut Légal": w.status || "Séquestré / En attente jugement",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 13. JOURNAL DES MOUVEMENTS
      samples_movements: {
        id: 'samples_movements',
        title: "Journal des mouvements, sorties LNC et dotations du personnel",
        shortTitle: "Journal des mouvements",
        category: 'samples',
        categoryLabel: "Échantillons & Flux",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300",
        infoText: "Historique des transferts d'échantillons vers le LNC pour analyse et des expressions de besoin du personnel validées.",
        description: "Traçabilité des sorties pour essais en laboratoire LNC, transferts internes et dotations du personnel.",
        getRows: () => {
          const headers = [
            "Date & Heure",
            "Type de Mouvement",
            "Produit / Échantillon",
            "Quantité",
            "Origine",
            "Destination / Bénéficiaire",
            "Opérateur ABMed",
          ]
          const exportData: Record<string, any>[] = filteredMovements.map((m) => {
            const dtStr = m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : '-'
            return {
              "Date & Heure": dtStr,
              "Type de Mouvement": m.movement_type || "Transfert",
              "Produit / Échantillon": m.product_name || m.sample_id || "Échantillon",
              "Quantité": String(m.quantity ?? 1),
              "Origine": m.from_location || "Échantillothèque",
              "Destination / Bénéficiaire": m.to_location || m.beneficiary || "Laboratoire LNC",
              "Opérateur ABMed": m.operator || "Agent eGED",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 14. OPÉRATIONS DE DESTRUCTION & PV
      waste_destructions: {
        id: 'waste_destructions',
        title: "Opérations de destruction exécutées et certificats délivrés",
        shortTitle: "Destructions & PV",
        category: 'waste',
        categoryLabel: "Destruction & PV",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
        infoText: "Bilan des campagnes de neutralisation physique et d'incinération sur sites agréés avec certificats officiels.",
        description: "Bilan des campagnes d'incinération, broyage et neutralisation physique avec PV officiels d'huissier.",
        getRows: () => {
          const headers = [
            "N° Plan Destruction",
            "Date d'Exécution",
            "Site de Destruction",
            "Méthode Employée",
            "Poids Traité (Kg)",
            "Statut d'Exécution",
            "Attestation / PV",
          ]
          const exportData: Record<string, any>[] = filteredDestructions.map((d) => {
            const dtStr = d.execution_date || d.created_at ? new Date(d.execution_date || d.created_at || '').toLocaleDateString('fr-FR') : '-'
            return {
              "N° Plan Destruction": d.plan_number || d.id,
              "Date d'Exécution": dtStr,
              "Site de Destruction": d.destruction_site || "Incinérateur Spécialisé ABMed",
              "Méthode Employée": d.destruction_method || "Incinération à haute température",
              "Poids Traité (Kg)": `${Number(d.total_weight) || 0} kg`,
              "Statut d'Exécution": d.status || "Exécuté",
              "Attestation / PV": "Certificat PSQIF délivré",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 15. VEILLE DES PÉREMPTIONS
      samples_expirations: {
        id: 'samples_expirations',
        title: "Veille des dates de péremption et propositions de déclassement",
        shortTitle: "Veille des péremptions",
        category: 'samples',
        categoryLabel: "Échantillons & Qualité",
        badgeColor: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300",
        infoText: "Alerte préventive sur les échantillons approchant ou ayant dépassé leur date de péremption pour basculement vers déchets.",
        description: "Contrôle préventif des échantillons approchant de leur date limite d'utilisation.",
        getRows: () => {
          const headers = [
            "N° Échantillon",
            "Nom Commercial",
            "Quantité",
            "Date de Péremption",
            "Statut Validité",
            "Emplacement",
            "Recommandation",
          ]
          const exportData: Record<string, any>[] = filteredSamples.map((s) => {
            const isExp = (s.status || '').toLowerCase().includes('périmé')
            return {
              "N° Échantillon": s.sample_number || s.id,
              "Nom Commercial": s.commercial_name || "Échantillon",
              "Quantité": String(s.quantity ?? 1),
              "Date de Péremption": s.expiry_date || "2027-12-31",
              "Statut Validité": isExp ? "Périmé" : "Valide",
              "Emplacement": s.storage_location || "Magasin Central",
              "Recommandation": isExp ? "Transférer en Destruction Déchets" : "Conserver en échantillothèque",
            }
          })
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },

      // 16. SYNTHÈSE DIRECTION GÉNÉRALE
      executive_summary: {
        id: 'executive_summary',
        title: "Bilan général consolidé eGED (Direction Générale ABMed)",
        shortTitle: "Synthèse Direction Générale",
        category: 'executive',
        categoryLabel: "Direction Générale",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
        infoText: "Synthèse décisionnelle consolidant les tonnages, valorisations financières (8%) et la traçabilité nationale.",
        description: "Synthèse décisionnelle consolidant les tonnages, valorisations financières et indicateurs de performance.",
        getRows: () => {
          const headers = [
            "Indicateur Stratégique",
            "Valeur Constatée",
            "Unité",
            "Périmètre Géographique",
            "Observation / Conformité",
          ]
          const exportData: Record<string, any>[] = [
            {
              "Indicateur Stratégique": "Stock Total d'Échantillons Actifs",
              "Valeur Constatée": String(kpis.totalSamplesStock),
              "Unité": "Unités",
              "Périmètre Géographique": selectedWarehouse === 'all' ? "National" : selectedWarehouse,
              "Observation / Conformité": "Conforme aux normes de conservation BPL",
            },
            {
              "Indicateur Stratégique": "Échantillons Réceptionnés sur la Période",
              "Valeur Constatée": String(kpis.samplesReceivedInPeriod),
              "Unité": "Lots / Dossiers",
              "Périmètre Géographique": selectedWarehouse === 'all' ? "National" : selectedWarehouse,
              "Observation / Conformité": "Prise en charge intégrale eGED",
            },
            {
              "Indicateur Stratégique": "Taux de Conformité des Échantillons",
              "Valeur Constatée": `${kpis.conformityRate} %`,
              "Unité": "Pourcentage",
              "Périmètre Géographique": "Laboratoires & Dépôts",
              "Observation / Conformité": kpis.conformityRate >= 95 ? "Excellent niveau de qualité" : "Vigilance sur quarantaines",
            },
            {
              "Indicateur Stratégique": "Masse Totale des Déchets Réceptionnés",
              "Valeur Constatée": `${kpis.totalWasteKg.toLocaleString('fr-FR')} kg (${kpis.totalWasteTonnes} T)`,
              "Unité": "Kg / Tonnes",
              "Périmètre Géographique": selectedWarehouse === 'all' ? "National" : selectedWarehouse,
              "Observation / Conformité": "Enregistré avec bordereaux officiels",
            },
            {
              "Indicateur Stratégique": "Taux d'Occupation Magasin Déchets (Capacité 45T)",
              "Valeur Constatée": `${((kpis.totalWasteKg / 45000) * 100).toFixed(2)} % (${kpis.totalWasteKg.toLocaleString('fr-FR')} kg / 45 000 kg)`,
              "Unité": "Pourcentage (%)",
              "Périmètre Géographique": "Magasin Déchets Cotonou",
              "Observation / Conformité": ((kpis.totalWasteKg / 45000) * 100) < 75 ? "Capacité nominale satisfaisante (< 75%)" : "Seuil d'alerte stockage atteint",
            },
            {
              "Indicateur Stratégique": "Masse Totale Neutralisée / Détruite",
              "Valeur Constatée": `${kpis.totalDestroyedKg.toLocaleString('fr-FR')} kg`,
              "Unité": "Kg",
              "Périmètre Géographique": "Sites d'incinération agréés",
              "Observation / Conformité": "Destruction conforme avec PV de contrôle",
            },
            {
              "Indicateur Stratégique": "Valeur Totale Déclarée des Cessions",
              "Valeur Constatée": `${kpis.totalTransferCostFCFA.toLocaleString('fr-FR')} FCFA`,
              "Unité": "FCFA",
              "Périmètre Géographique": "Structures Déposantes",
              "Observation / Conformité": "Base imposable de la redevance",
            },
            {
              "Indicateur Stratégique": "Redevance ABMed (8%) Cumulée",
              "Valeur Constatée": `${kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} FCFA`,
              "Unité": "FCFA",
              "Périmètre Géographique": "Trésorerie ABMed",
              "Observation / Conformité": "Recouvrement légal au profit de l'Autorité",
            },
            {
              "Indicateur Stratégique": "Mouvements & Dotations Traçabilités",
              "Valeur Constatée": String(kpis.mvtCount),
              "Unité": "Opérations",
              "Périmètre Géographique": "Plateforme eGED",
              "Observation / Conformité": "Traçabilité sans discontinuité",
            },
          ]
          const rows = exportData.map((d) => headers.map((h) => String(d[h] || '')))
          return { headers, rows, exportData }
        },
      },
    }
  }, [
    filteredWaste,
    filteredSamples,
    filteredReceptions,
    filteredMovements,
    filteredDestructions,
    filteredAppointments,
    filteredGroupedPackages,
    centersList,
    kpis,
    selectedWarehouse,
  ])

  // Liste des rapports sous forme de tableau
  const reportList = useMemo(() => Object.values(reportDefinitions), [reportDefinitions])

  // Filtrage des cartes du catalogue selon catégorie et recherche
  const filteredReportCards = useMemo(() => {
    return reportList.filter((rep) => {
      const matchCat = cardCategoryFilter === 'all' || rep.category === cardCategoryFilter
      const matchSearch =
        !cardSearchQuery.trim() ||
        rep.title.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        rep.shortTitle.toLowerCase().includes(cardSearchQuery.toLowerCase()) ||
        rep.infoText.toLowerCase().includes(cardSearchQuery.toLowerCase())
      return matchCat && matchSearch
    })
  }, [reportList, cardCategoryFilter, cardSearchQuery])

  // Données du rapport actuellement sélectionné
  const currentReportDef = useMemo(() => {
    return reportDefinitions[reportType] || reportDefinitions.financial_detailed_audit || reportDefinitions.waste_receptions
  }, [reportDefinitions, reportType])

  const currentReportData = useMemo(() => {
    return currentReportDef.getRows()
  }, [currentReportDef])

  // Lignes filtrées dans la table de prévisualisation
  const previewRows = useMemo(() => {
    if (!tableSearchQuery.trim()) return currentReportData.exportData
    const q = tableSearchQuery.toLowerCase()
    return currentReportData.exportData.filter((row) => {
      return Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    })
  }, [currentReportData, tableSearchQuery])

  // Pagination des lignes
  const totalPages = Math.max(1, Math.ceil(previewRows.length / pageSize))
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return previewRows.slice(start, start + pageSize)
  }, [previewRows, currentPage, pageSize])

  // Calcul automatique des totaux de colonnes numériques pour la ligne de pied de tableau
  const tableTotals = useMemo(() => {
    const totals: Record<string, { sum: number; formatted: string; isWeight: boolean }> = {}
    currentReportData.headers.forEach((h) => {
      const isCurr = h.includes('FCFA') || h.includes('Montant') || h.includes('Redevance') || h.includes('Coût') || h.includes('Total Dû')
      const isWt = h.includes('Kg') || h.includes('Poids')
      const isCnt = h.includes('Nb ') || h.includes('Nombre') || h.includes('Quantité')

      if (isCurr || isWt || isCnt) {
        let total = 0
        let hasValidNum = false
        previewRows.forEach((row) => {
          const raw = String(row[h] || '').replace(/[^0-9.-]/g, '')
          const num = parseFloat(raw)
          if (!isNaN(num)) {
            total += num
            hasValidNum = true
          }
        })
        if (hasValidNum) {
          if (isCurr) {
            totals[h] = { sum: total, formatted: `${total.toLocaleString('fr-FR')} FCFA`, isWeight: false }
          } else if (isWt) {
            totals[h] = { sum: total, formatted: `${total.toLocaleString('fr-FR')} kg`, isWeight: true }
          } else {
            totals[h] = { sum: total, formatted: String(total), isWeight: false }
          }
        }
      }
    })
    return totals
  }, [currentReportData.headers, previewRows])

  // Sélection d'un rapport avec défilement fluide
  const handleSelectReport = (id: string) => {
    setReportType(id)
    if (reportViewerRef.current) {
      reportViewerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Export
  const handleExport = (format: 'PDF' | 'Excel' | 'CSV') => {
    const { headers, exportData, rows } = currentReportData
    const filename = `ABMed_Rapport_${reportType}_${dateRange.label.replace(/[^a-zA-Z0-9]/g, '_')}`

    if (format === 'CSV') {
      exportToCSV(exportData, headers, filename)
      toast.success(`Fichier CSV téléchargé avec succès !`)
    } else if (format === 'Excel') {
      exportToExcel(exportData, headers, filename)
      toast.success(`Classeur Excel (.xlsx) téléchargé avec succès !`)
    } else if (format === 'PDF') {
      const isWide = headers.length > 5
      exportOfficialReportPDF({
        title: currentReportDef.title,
        subtitle: currentReportDef.description,
        periodLabel: dateRange.label,
        warehouseLabel: selectedWarehouse === 'all' ? 'Tous les Magasins' : selectedWarehouse,
        kpis: [
          { label: "Enregistrements", value: String(exportData.length) },
          { label: "Tonnage Déchets", value: `${(kpis.totalWasteKg / 1000).toFixed(2)} T` },
          { label: "Cession Déclarée", value: `${kpis.totalTransferCostFCFA.toLocaleString('fr-FR')} F` },
          { label: "Redevance ABMed (8%)", value: `${kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} F` },
          { label: "Conformité", value: `${kpis.conformityRate} %` },
        ],
        headers,
        rows,
        filename,
        orientation: isWide ? 'l' : 'p',
      })
      toast.success(`Rapport Officiel PDF généré et téléchargé !`)
    }
  }

  const isFinancialReport = currentReportDef.category === 'financial'

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* 1. BANNIÈRE EN-TÊTE JAUNE / OR BÉNIN */}
      <div className="rounded-xl overflow-hidden shadow-xs border border-border/60">
        {/* Liseré tricolore République du Bénin */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#1B5C2E]" />
          <div className="h-full w-1/3 bg-[#EAB308]" />
          <div className="h-full w-1/3 bg-[#DC2626]" />
        </div>

        {/* Bandeau Jaune / Or avec Titre "Rapports" */}
        <div className="bg-[#FFCC00] dark:bg-amber-500 text-slate-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
              Rapports & Statistiques
            </h1>
            <Badge className="bg-slate-900 text-white text-[11px] font-bold px-2 py-0.5 hover:bg-slate-800">
              eGED ABMed
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReportsData(true)}
              disabled={isSyncing}
              className="h-8 text-xs font-bold bg-white/90 hover:bg-white text-slate-900 border-slate-400 gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* 2. ENCART D'INFORMATION & CONTEXTE */}
        <div className="bg-slate-100 dark:bg-slate-900/80 p-3 md:p-3.5 border-t border-border/50 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
            <Info className="h-5 w-5 font-bold" />
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            <p>
              Les données du tableau de bord et des différents rapports <strong>eGED</strong> rendent compte de la gestion logistique et réglementaire des <strong>échantillons pharmaceutiques</strong> et des <strong>déchets de santé</strong> au niveau national pour l&apos;<strong>Autorité Béninoise du Médicament (ABMed)</strong>.
              Ils sont consolidés en temps réel à partir des registres de dépôts d&apos;échantillons, des contrôles qualité du LNC, des déclarations de cessions de déchets (redevance légale de 8%) et des opérations de destruction sécurisées.
              Les extractions périodiques peuvent être analysées mensuellement, trimestriellement ou selon l&apos;exercice budgétaire souhaité.
            </p>
          </div>
        </div>
      </div>

      {/* 3. BARRE D'OUTILS ET FILTRES DU CATALOGUE DE CARTES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={cardCategoryFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('all')}
            className={`h-8 text-xs font-bold ${cardCategoryFilter === 'all' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-xs' : ''}`}
          >
            Tous les rapports ({reportList.length})
          </Button>
          <Button
            variant={cardCategoryFilter === 'financial' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('financial')}
            className={`h-8 text-xs font-bold ${cardCategoryFilter === 'financial' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-xs' : ''}`}
          >
            <CreditCard className="h-3.5 w-3.5 mr-1" />
            Finances & 8%
          </Button>
          <Button
            variant={cardCategoryFilter === 'waste' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('waste')}
            className={`h-8 text-xs font-bold ${cardCategoryFilter === 'waste' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-xs' : ''}`}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Déchets Pharmaceutiques
          </Button>
          <Button
            variant={cardCategoryFilter === 'samples' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('samples')}
            className={`h-8 text-xs font-bold ${cardCategoryFilter === 'samples' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-xs' : ''}`}
          >
            <TestTube2 className="h-3.5 w-3.5 mr-1" />
            Échantillons & Qualité
          </Button>
          <Button
            variant={cardCategoryFilter === 'executive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCardCategoryFilter('executive')}
            className={`h-8 text-xs font-bold ${cardCategoryFilter === 'executive' ? 'bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-xs' : ''}`}
          >
            <Building2 className="h-3.5 w-3.5 mr-1" />
            Direction & Centres
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un rapport..."
            value={cardSearchQuery}
            onChange={(e) => setCardSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* 4. GRILLE VISUELLE DE CARTES DE RAPPORTS (GRANDS CADRANTS BIEN LISIBLES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredReportCards.map((report) => {
          const isSelected = reportType === report.id

          return (
            <div
              key={report.id}
              onClick={() => handleSelectReport(report.id)}
              className={`group relative p-4 sm:p-5 rounded-2xl border bg-card cursor-pointer transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-lg min-h-[165px] sm:min-h-[180px] ${
                isSelected
                  ? 'border-[#1B5C2E] ring-2 ring-[#1B5C2E]/30 bg-emerald-50/35 dark:bg-emerald-950/30 shadow-md'
                  : 'border-border/80 hover:border-[#1B5C2E]/60 dark:hover:border-slate-600'
              }`}
            >
              {/* Ligne Haute : Miniature + Badges + Bouton Info Vert (i) avec Tooltip au survol */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0 transition-transform duration-200 group-hover:scale-105">
                    <ReportThumbnail type={report.id} />
                  </div>
                  <div className="space-y-1">
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 shadow-2xs ${report.badgeColor}`}>
                      {report.categoryLabel}
                    </Badge>
                    {isSelected && (
                      <div className="text-[10px] font-black text-[#1B5C2E] flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-[#1B5C2E]" />
                        <span>Rapport Actif</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton Info Vert (i) avec Tooltip instantané au survol du curseur */}
                <div className="relative group/tooltip inline-flex items-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toast(report.title, {
                        description: report.infoText,
                        icon: <Info className="h-4 w-4 text-[#1B5C2E]" />,
                      })
                    }}
                    className="p-1.5 rounded-full text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 border border-emerald-300/70 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                    aria-label="Informations sur le rapport"
                  >
                    <Info className="h-4 w-4" />
                  </button>

                  {/* Tooltip visible instantanément dès qu'on approche le curseur */}
                  <div className="pointer-events-none absolute right-0 top-full mt-2 w-72 sm:w-80 p-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-slate-700 opacity-0 translate-y-1 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 group-hover/tooltip:visible transition-all duration-200 z-50">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                      <Info className="h-3 w-3" />
                      <span>Explication du Rapport</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-snug mb-1">
                      {report.title}
                    </p>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                      {report.infoText}
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Catégorie : {report.categoryLabel}</span>
                      <span className="text-emerald-400 font-medium">Cliquez pour afficher</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Titre Bien Grand, Très Lisible */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-black text-foreground tracking-tight leading-snug group-hover:text-[#1B5C2E] transition-colors">
                  {report.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed font-normal">
                  {report.description}
                </p>
              </div>

              {/* Bas de carte : Indicateur de format et action rapide */}
              <div className="pt-2.5 mt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">
                  Tableau & Statistiques
                </span>
                <span className={`font-bold flex items-center gap-0.5 ${isSelected ? 'text-[#1B5C2E]' : 'text-slate-500 group-hover:text-[#1B5C2E]'}`}>
                  Consulter <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 5. CONSOLE D'EXPLORATION ET D'EXTRACTION DU RAPPORT ACTIF */}
      <div ref={reportViewerRef} className="pt-2">
        <Card className="border border-border/70 rounded-2xl bg-card shadow-sm overflow-hidden">
          
          {/* En-tête de la console du rapport sélectionné */}
          <div className="p-4 bg-muted/40 border-b border-border/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#1B5C2E] text-white text-[10px] font-bold px-2 py-0.5">
                  Rapport Actif
                </Badge>
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {currentReportDef.title}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {currentReportDef.description}
              </p>
            </div>

            {/* Boutons d'export rapide pour ce rapport */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('CSV')}
                className="h-8 text-xs font-bold gap-1 shadow-2xs bg-background"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('Excel')}
                className="h-8 text-xs font-bold gap-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" /> Excel (.xlsx)
              </Button>

              <Button
                size="sm"
                onClick={() => handleExport('PDF')}
                className="h-8 text-xs font-bold gap-1.5 bg-[#1B5C2E] hover:bg-[#154824] text-white shadow-sm"
              >
                <FileOutput className="h-3.5 w-3.5" />
                Générer Rapport PDF Officiel
              </Button>
            </div>
          </div>

          <CardContent className="p-4 space-y-4">
            
            {/* Barre de filtrage multi-critères et de dates pour ce rapport */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/50 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              
              {/* Sélecteur de Période */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-[#1B5C2E]" />
                  Période d&apos;analyse
                </label>
                <Select value={periodPreset} onValueChange={(val) => setPeriodPreset(val || 'year_2026')}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                    <SelectItem value="week">Cette semaine en cours</SelectItem>
                    <SelectItem value="month">Ce mois-ci</SelectItem>
                    <SelectItem value="quarter">Ce trimestre</SelectItem>
                    <SelectItem value="year_2026">Exercice 2026 (En cours)</SelectItem>
                    <SelectItem value="year_2025">Exercice 2025 (Clôturé)</SelectItem>
                    <SelectItem value="custom">Période personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates personnalisées */}
              {periodPreset === 'custom' ? (
                <>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">Date début</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground">Date fin</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </>
              ) : (
                <div className="md:col-span-3">
                  <div className="px-3 py-1.5 rounded-lg bg-background border border-border/60 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Plage : </span>
                    <span className="text-[#1B5C2E] font-bold">{dateRange.label}</span>
                  </div>
                </div>
              )}

              {/* Magasin */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-[#1B5C2E]" />
                  Site / Magasin
                </label>
                <Select value={selectedWarehouse} onValueChange={(val) => setSelectedWarehouse(val || 'all')}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Magasin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les Magasins (National)</SelectItem>
                    <SelectItem value="Magasin Cotonou">Magasin Cotonou (Siège)</SelectItem>
                    <SelectItem value="Magasin Parakou">Magasin Parakou (Nord)</SelectItem>
                    <SelectItem value="Autres">Autres dépôts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Catégorie Produits */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3 text-[#1B5C2E]" />
                  Catégorie ABMed
                </label>
                <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'all')}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    <SelectItem value="Catégorie 1">Cat. 1 - Chimiques & toxiques</SelectItem>
                    <SelectItem value="Catégorie 2">Cat. 2 - Solides & gélules</SelectItem>
                    <SelectItem value="Catégorie 3">Cat. 3 - Liquides & sirops</SelectItem>
                    <SelectItem value="Catégorie 4">Cat. 4 - Aérosols & gaz</SelectItem>
                    <SelectItem value="Catégorie 5">Cat. 5 - Stupéfiants & psycho.</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* ENCART SPÉCIAL FINANCIER LORSQUE LE RAPPORT SÉLECTIONNÉ EST FINANCIER */}
            {isFinancialReport && (
              <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[#1B5C2E]" />
                    <h4 className="text-xs font-black uppercase text-emerald-950 dark:text-emerald-200 tracking-wider">
                      Console Financière & Recouvrement Trésorerie ABMeD
                    </h4>
                  </div>
                  <Badge className="bg-[#1B5C2E] text-white text-[10px]">
                    Taux Recouvrement : {kpis.recoveryRate}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Valeur Cessions Déclarées</p>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100">{kpis.totalTransferCostFCFA.toLocaleString('fr-FR')} <span className="text-[10px] text-muted-foreground font-normal">FCFA</span></p>
                    <p className="text-[9px] text-slate-500 font-medium">Assiette taxable totale</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-300 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Redevance Légale 8%</p>
                    <p className="text-base font-black text-[#1B5C2E] dark:text-emerald-300">{kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} <span className="text-[10px] font-normal">FCFA</span></p>
                    <p className="text-[9px] text-emerald-700 font-bold">Droit réglementaire ABMeD</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Frais de Prise en Charge</p>
                    <p className="text-base font-black text-slate-900 dark:text-slate-100">{kpis.totalProcessingFeesFCFA.toLocaleString('fr-FR')} <span className="text-[10px] text-muted-foreground font-normal">FCFA</span></p>
                    <p className="text-[9px] text-slate-500 font-medium">Logistique & incinération</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200/80 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Recouvré / Soldé</p>
                    <p className="text-base font-black text-emerald-700">{kpis.paidFeeFCFA.toLocaleString('fr-FR')} <span className="text-[10px] text-muted-foreground font-normal">FCFA</span></p>
                    <p className="text-[9px] text-emerald-600 font-bold">Encaissé au Trésor</p>
                  </div>
                </div>
              </div>
            )}

            {/* 6 Indicateurs Stratégiques recalculés pour cette sélection */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
              <div className="p-2.5 rounded-xl border border-border/70 bg-card shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Échantillons Stock</p>
                <p className="text-base font-black text-foreground">{kpis.totalSamplesStock}</p>
                <p className="text-[9px] text-emerald-700 font-medium">+{kpis.samplesReceivedInPeriod} reçus</p>
              </div>

              <div className="p-2.5 rounded-xl border border-border/70 bg-card shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Déchets Reçus</p>
                <p className="text-base font-black text-foreground">{kpis.totalWasteKg.toLocaleString('fr-FR')} <span className="text-[10px] text-muted-foreground font-normal">kg</span></p>
                <p className="text-[9px] text-amber-600 font-medium">{kpis.totalWasteTonnes} Tonnes</p>
              </div>

              <div className="p-2.5 rounded-xl border border-border/70 bg-card shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Masse Détruite</p>
                <p className="text-base font-black text-foreground">{kpis.totalDestroyedKg.toLocaleString('fr-FR')} <span className="text-[10px] text-muted-foreground font-normal">kg</span></p>
                <p className="text-[9px] text-red-600 font-medium">{filteredDestructions.length} opérations</p>
              </div>

              <div className="p-2.5 rounded-xl border border-border/70 bg-card shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Cessions Déclarées</p>
                <p className="text-sm font-black text-foreground">{kpis.totalTransferCostFCFA.toLocaleString('fr-FR')} <span className="text-[9px] text-muted-foreground font-normal">F</span></p>
                <p className="text-[9px] text-blue-600 font-medium">Base imposable</p>
              </div>

              <div className="p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Redevance (8%)</p>
                <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">{kpis.totalAbmedFeeFCFA.toLocaleString('fr-FR')} <span className="text-[9px] font-bold">F</span></p>
                <p className="text-[9px] text-emerald-700 font-bold">Exigible ABMed</p>
              </div>

              <div className="p-2.5 rounded-xl border border-border/70 bg-card shadow-2xs">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Conformité Qualité</p>
                <p className="text-base font-black text-foreground">{kpis.conformityRate}%</p>
                <p className="text-[9px] text-purple-600 font-medium">{kpis.mvtCount} mouvements</p>
              </div>
            </div>

            {/* TABLEAU INTERACTIF COMPLET SOUS FORME TABULAIRE */}
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filtrer dans ce tableau..."
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs font-bold text-muted-foreground whitespace-nowrap">
                    {previewRows.length} enregistrements
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">Lignes par page :</span>
                    <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                      <SelectTrigger className="h-7 text-xs w-16 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <span className="text-muted-foreground hidden sm:inline">|</span>
                  <div className="text-[11px] hidden sm:inline">
                    Extraction active : <span className="text-[#1B5C2E] font-bold">{dateRange.label}</span>
                  </div>
                </div>
              </div>

              {/* TABLE CONTENANT LES DONNÉES DU RAPPORT */}
              <div className="border border-border/70 rounded-xl overflow-x-auto bg-card shadow-2xs max-h-[460px] overflow-y-auto">
                <Table>
                  <TableHeader className="bg-muted/60 sticky top-0 z-10 backdrop-blur-xs">
                    <TableRow className="border-b border-border/80">
                      {currentReportData.headers.map((h, idx) => (
                        <TableHead key={idx} className="py-2.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={currentReportData.headers.length} className="text-center py-10 text-xs text-muted-foreground">
                          Aucun enregistrement ne correspond aux filtres et à la période sélectionnée ({dateRange.label}).
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row, rIdx) => (
                        <TableRow key={rIdx} className="hover:bg-muted/30 text-xs transition-colors">
                          {currentReportData.headers.map((h, cIdx) => {
                            const val = String(row[h] || '-')
                            const isCurrency = h.includes('FCFA') || h.includes('Montant') || h.includes('Redevance') || h.includes('Coût') || h.includes('Total Dû')
                            const isWeight = h.includes('Kg') || h.includes('Poids') || h.includes('Tonnes')

                            return (
                              <TableCell key={cIdx} className={`py-2 whitespace-nowrap ${isCurrency || isWeight ? 'font-semibold' : ''}`}>
                                {h.includes('Statut') || h.includes('Conformité') || h.includes('Décision') ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-2 py-0.5 font-bold ${
                                      val.toLowerCase().includes('conforme') || val.toLowerCase().includes('disponible') || val.toLowerCase().includes('exécuté') || val.toLowerCase().includes('valide') || val.toLowerCase().includes('acquitt') || val.toLowerCase().includes('confirmé')
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : val.toLowerCase().includes('périmé') || val.toLowerCase().includes('détruit') || val.toLowerCase().includes('saisi') || val.toLowerCase().includes('absent') || val.toLowerCase().includes('annulé')
                                        ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300'
                                        : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                    }`}
                                  >
                                    {val}
                                  </Badge>
                                ) : isCurrency && val !== '-' && val !== '0' ? (
                                  <span className="text-[#1B5C2E] font-black">{val}</span>
                                ) : isWeight && val !== '-' ? (
                                  <span className="font-bold text-foreground">{val}</span>
                                ) : (
                                  val
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>

                  {/* LIGNE DE PIED DE TABLEAU AVEC LES SOMMES TOTALES */}
                  {previewRows.length > 0 && Object.keys(tableTotals).length > 0 && (
                    <tfoot className="bg-muted/80 border-t-2 border-border/80 sticky bottom-0 z-10 backdrop-blur-xs font-black text-xs">
                      <TableRow>
                        {currentReportData.headers.map((h, idx) => {
                          const tot = tableTotals[h]
                          if (idx === 0) {
                            return (
                              <TableCell key={idx} className="py-2.5 font-black text-[#1B5C2E] uppercase text-[10px] tracking-wider whitespace-nowrap">
                                TOTAL CUMULÉ ({previewRows.length} lignes)
                              </TableCell>
                            )
                          }
                          if (tot) {
                            return (
                              <TableCell key={idx} className={`py-2.5 font-black whitespace-nowrap ${tot.isWeight ? 'text-foreground' : 'text-[#1B5C2E]'}`}>
                                {tot.formatted}
                              </TableCell>
                            )
                          }
                          return <TableCell key={idx} className="py-2.5 text-muted-foreground whitespace-nowrap">-</TableCell>
                        })}
                      </TableRow>
                    </tfoot>
                  )}
                </Table>
              </div>

              {/* CONTRÔLEURS DE PAGINATION */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-1 text-xs text-muted-foreground">
                <div>
                  Affichage de <span className="font-bold text-foreground">{previewRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> à <span className="font-bold text-foreground">{Math.min(currentPage * pageSize, previewRows.length)}</span> sur <span className="font-bold text-foreground">{previewRows.length}</span> enregistrements
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-7 text-xs px-2.5 bg-background"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Précédent
                  </Button>
                  <span className="text-xs px-2 font-semibold">
                    Page {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-7 text-xs px-2.5 bg-background"
                  >
                    Suivant <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* SYNTHÈSE GRAPHIQUE COMPARATIVE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                  Masse par Catégorie Réglementaire ABMed (Kg)
                </p>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <RechartsTooltip
                        formatter={(val) => [`${Number(val).toLocaleString('fr-FR')} Kg`, 'Masse']}
                        contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                      />
                      <Bar dataKey="weight" fill="#1B5C2E" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card shadow-2xs">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                  Statuts & Contrôles Échantillothèque
                </p>
                <div className="h-[110px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sampleStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={24}
                        outerRadius={42}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        isAnimationActive={false}
                      >
                        {sampleStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-border/40 text-[9px]">
                  {sampleStatusData.map((item, idx) => (
                    <div key={idx} className="flex justify-between px-1.5 py-1 rounded-md bg-muted/40 font-medium">
                      <span className="text-muted-foreground truncate">{item.name}</span>
                      <span className="font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

    </div>
  )
}
