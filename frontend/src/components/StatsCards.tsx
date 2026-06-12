import { AlertTriangle, Users, TrendingUp, FileX, Car, Building2, Network, DollarSign } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Stats } from '../types'

function StatCard({
  icon: Icon, label, value, sub, color = 'blue', glow = false,
}: {
  icon: LucideIcon
  label: string; value: string | number; sub?: string
  color?: 'blue' | 'red' | 'amber' | 'green' | 'purple'
  glow?: boolean
}) {
  const colors = {
    blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   icon: 'text-blue-400',   ring: 'ring-blue-500/20' },
    red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    icon: 'text-red-400',    ring: 'ring-red-500/20' },
    amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  icon: 'text-amber-400',  ring: 'ring-amber-500/20' },
    green:  { bg: 'bg-emerald-500/10',border: 'border-emerald-500/20',icon: 'text-emerald-400',ring: 'ring-emerald-500/20' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-400', ring: 'ring-purple-500/20' },
  }
  const c = colors[color]
  return (
    <div className={`card p-5 ${glow ? 'glow-' + color : ''} transition-all hover:scale-[1.01]`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${c.bg} border ${c.border}`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

function fmt(n: number) {
  if (n >= 1_000_000_000) return `PKR ${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000)     return `PKR ${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000)         return `PKR ${(n / 1_000).toFixed(0)}K`
  return `PKR ${n}`
}

export default function StatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard icon={Users}        label="Total Individuals" value={stats.total_persons}    color="blue" />
      <StatCard icon={AlertTriangle} label="High Risk Flagged"  value={stats.high_risk_count}  color="red"  glow sub={`${stats.medium_risk_count} medium risk`} />
      <StatCard icon={FileX}        label="Non-Filers"         value={stats.non_filers_count} color="amber" sub={`${stats.zero_return_count} zero-return filers`} />
      <StatCard icon={DollarSign}   label="Est. Tax Gap"       value={fmt(stats.total_potential_tax_gap_pkr)} color="purple" glow />
      <StatCard icon={Car}          label="Vehicles Registered" value={stats.total_vehicles}  color="blue" />
      <StatCard icon={Building2}    label="Properties Linked"  value={stats.total_properties} color="green" />
      <StatCard icon={Network}      label="Entity Matches"     value={stats.entity_matches_found} color="purple" sub="Potential aliases detected" />
      <StatCard icon={TrendingUp}   label="Avg Deviation Score" value={`${stats.avg_deviation_score}/100`} color="amber" />
    </div>
  )
}
