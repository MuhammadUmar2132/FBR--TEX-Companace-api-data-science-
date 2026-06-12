import { Shield, AlertTriangle, Info, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Finding } from '../types'
import { SeverityBadge } from './RiskBadge'

const SEVERITY_ICONS = {
  critical: XCircle,
  high: AlertTriangle,
  medium: Shield,
  low: Info,
}

const CATEGORY_COLORS: Record<string, string> = {
  'Tax Filing': 'border-l-red-500',
  'Vehicle Assets': 'border-l-blue-500',
  'Utility Consumption': 'border-l-emerald-500',
  'Real Estate Holdings': 'border-l-purple-500',
  'International Travel': 'border-l-orange-500',
  'Wealth–Income Mismatch': 'border-l-yellow-500',
}

function EvidenceBlock({ evidence }: { evidence: Record<string, unknown> }) {
  return (
    <div className="mt-3 bg-gray-950/60 rounded-lg p-3 border border-gray-800/60">
      <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2 font-semibold">Evidence Trail</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {Object.entries(evidence).map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <span className="text-[10px] text-gray-600 capitalize">{k.replace(/_/g, ' ')}</span>
            <span className="text-xs text-gray-300 font-mono">
              {Array.isArray(v)
                ? (v as string[]).slice(0, 4).join(', ')
                : typeof v === 'number' && v > 10_000
                ? `PKR ${(v as number).toLocaleString()}`
                : typeof v === 'boolean'
                ? (v ? '✓ Yes' : '✗ No')
                : String(v)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const Icon = SEVERITY_ICONS[finding.severity] ?? Info
  const borderColor = CATEGORY_COLORS[finding.category] ?? 'border-l-gray-500'

  return (
    <div className={`card border-l-4 ${borderColor} overflow-hidden`}>
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <Icon size={16} className={
          finding.severity === 'critical' ? 'text-red-400' :
          finding.severity === 'high' ? 'text-amber-400' :
          finding.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
        } />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{finding.category}</span>
            <SeverityBadge severity={finding.severity} />
            <span className="ml-auto text-xs text-gray-500">+{finding.score_contribution} pts</span>
          </div>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 animate-in">
          <p className="text-sm text-gray-300 leading-relaxed">{finding.description}</p>
          <EvidenceBlock evidence={finding.evidence} />
        </div>
      )}
    </div>
  )
}

export default function AuditTrail({ findings }: { findings: Finding[] }) {
  if (!findings.length) {
    return (
      <div className="card p-8 text-center">
        <Shield size={32} className="text-emerald-400 mx-auto mb-3" />
        <p className="text-emerald-400 font-semibold">No Compliance Issues Detected</p>
        <p className="text-gray-500 text-sm mt-1">This individual appears to be in good standing.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Explainable AI Audit Trail</h3>
        <span className="badge bg-gray-800 text-gray-400 border-gray-700">{findings.length} findings</span>
      </div>
      {findings.map((f, i) => <FindingCard key={i} finding={f} index={i} />)}
    </div>
  )
}
