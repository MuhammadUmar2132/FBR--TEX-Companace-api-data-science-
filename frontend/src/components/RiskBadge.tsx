import type { RiskLevel, FilingStatus } from '../types'

export function RiskBadge({ level }: { level: RiskLevel }) {
  const cls = level === 'HIGH' ? 'badge-high' : level === 'MEDIUM' ? 'badge-medium' : 'badge-low'
  const dot = level === 'HIGH' ? 'bg-red-400' : level === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <span className={cls}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} mr-1.5 inline-block`} />
      {level}
    </span>
  )
}

export function FilingBadge({ status }: { status: FilingStatus }) {
  const map: Record<FilingStatus, { cls: string; label: string }> = {
    filed: { cls: 'badge bg-blue-500/15 text-blue-400 border border-blue-500/30', label: 'Filed' },
    non_filer: { cls: 'badge bg-red-500/15 text-red-400 border border-red-500/30', label: 'Non-Filer' },
    zero_return: { cls: 'badge bg-orange-500/15 text-orange-400 border border-orange-500/30', label: 'Zero Return' },
    unknown: { cls: 'badge bg-gray-500/15 text-gray-400 border border-gray-500/30', label: 'Unknown' },
  }
  const { cls, label } = map[status] ?? map.unknown
  return <span className={cls}>{label}</span>
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  }
  return <span className={map[severity] ?? 'badge'}>{severity.toUpperCase()}</span>
}
