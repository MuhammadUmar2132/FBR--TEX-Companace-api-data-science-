import { useEffect, useState } from 'react'
import { ArrowLeft, Car, Building2, Zap, FileText, Plane, User, RefreshCw, Trash2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getPerson, getGraph, deletePerson } from '../api'
import type { PersonDetail as PD, GraphData } from '../types'
import { RiskBadge, FilingBadge } from './RiskBadge'
import ScoreGauge from './ScoreGauge'
import AuditTrail from './AuditTrail'
import KnowledgeGraph from './KnowledgeGraph'
import AICopilot from './AICopilot'

function fmt(n: number) {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(0)}K`
  return `PKR ${n}`
}

function DataCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-800">
        <Icon size={14} className="text-blue-400" />
        <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
      </div>
      {children}
    </div>
  )
}

export default function PersonDetail({ cnic, onBack }: { cnic: string; onBack: () => void }) {
  const [detail, setDetail] = useState<PD | null>(null)
  const [graph, setGraph] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'graph' | 'audit' | 'copilot'>('overview')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([getPerson(cnic), getGraph(cnic)]).then(([d, g]) => {
      setDetail(d)
      setGraph(g)
    }).finally(() => setLoading(false))
  }, [cnic])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="text-blue-400 animate-spin" />
      </div>
    )
  }
  if (!detail) return null

  const { person, vehicles, utility_bills, tax_returns, properties, travel_logs, score } = detail
  const latest_return = tax_returns.sort((a, b) => b.year - a.year)[0]

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="btn-ghost mt-1">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-white">{person.name}</h2>
            <RiskBadge level={score.risk_level} />
            <FilingBadge status={score.filing_status} />
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono">{person.cnic}</p>
          <p className="text-sm text-gray-400 mt-0.5">{person.address}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ScoreGauge score={score.compliance_score} size={100} />
          {person.profile_type === 'user_submitted' && (
            <button
              onClick={async () => {
                if (!confirm(`"${person.name}" ka record delete karein?`)) return
                setDeleting(true)
                await deletePerson(cnic)
                onBack()
              }}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              {deleting ? 'Delete ho raha hai...' : 'Delete Karein'}
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Declared Income', value: fmt(score.declared_income), sub: 'FY 2024' },
          { label: 'Est. Wealth Indicator', value: fmt(score.estimated_wealth_indicator), sub: 'Annual' },
          { label: 'Vehicle Fleet Value', value: fmt(score.vehicle_value_total), sub: `${vehicles.length} vehicle(s)` },
          { label: 'Property Value', value: fmt(score.property_value_total), sub: `${properties.length} propert(ies)` },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-lg font-bold text-white">{item.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
            <p className="text-xs text-gray-600">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-900/50 rounded-xl p-1 border border-gray-800">
        {(['overview', 'copilot', 'graph', 'audit'] as const).map(t => (
          <button
            key={t}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all capitalize flex items-center justify-center gap-1.5 ${tab === t ? (t === 'copilot' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white') : 'text-gray-400 hover:text-gray-200'}`}
            onClick={() => setTab(t)}
          >
            {t === 'copilot' && <Sparkles size={13} />}
            {t === 'graph' ? 'Knowledge Graph' : t === 'audit' ? 'Audit Trail' : t === 'copilot' ? 'AI Copilot' : 'Overview'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vehicles */}
          <DataCard title={`Vehicles (${vehicles.length})`} icon={Car}>
            {vehicles.length === 0 ? <p className="text-sm text-gray-500">No vehicles registered</p> : (
              <div className="space-y-2">
                {vehicles.map((v, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-800/50 last:border-0">
                    <div>
                      <p className="text-sm text-gray-200 font-medium">{v.make} {v.model}</p>
                      <p className="text-xs text-gray-500">{v.registration_no} · {v.year} · {v.engine_cc}cc</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{fmt(v.value_pkr)}</p>
                      {v.engine_cc >= 2000 && <span className="text-xs text-red-400">High CC ⚠</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DataCard>

          {/* Tax Returns */}
          <DataCard title="Tax Returns (3 years)" icon={FileText}>
            <div className="space-y-2">
              {tax_returns.sort((a, b) => b.year - a.year).map(r => (
                <div key={r.year} className="flex justify-between items-center py-1.5 border-b border-gray-800/50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-200 font-medium">FY {r.year}</p>
                    <FilingBadge status={r.filing_status} />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-300">{fmt(r.declared_income)}</p>
                    <p className="text-xs text-gray-500">Tax: {fmt(r.tax_paid)}</p>
                  </div>
                </div>
              ))}
            </div>
          </DataCard>

          {/* Utility Bills */}
          <DataCard title={`Utility Bills (${utility_bills.length})`} icon={Zap}>
            {utility_bills.map((b, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-800/50 last:border-0">
                <div>
                  <p className="text-sm text-gray-200">{b.utility_type}</p>
                  <p className="text-xs text-gray-500 font-mono">{b.account_no}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-300">{fmt(b.monthly_avg_pkr)}/mo</p>
                  <p className="text-xs text-gray-500">{fmt(b.monthly_avg_pkr * 12)}/yr</p>
                </div>
              </div>
            ))}
          </DataCard>

          {/* Properties */}
          <DataCard title={`Properties (${properties.length})`} icon={Building2}>
            {properties.length === 0 ? <p className="text-sm text-gray-500">No properties on record</p> : (
              <div className="space-y-2">
                {properties.map((p, i) => (
                  <div key={i} className="py-1.5 border-b border-gray-800/50 last:border-0">
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-200">{p.area_sqft.toLocaleString()} sqft</p>
                      <p className="text-sm text-gray-300">{fmt(p.value_pkr)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.address}</p>
                    <span className="text-xs text-purple-400 capitalize">{p.transaction_type}</span>
                  </div>
                ))}
              </div>
            )}
          </DataCard>

          {/* Travel */}
          {travel_logs.length > 0 && (
            <DataCard title="International Travel" icon={Plane}>
              {travel_logs.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <p className="text-sm text-gray-200">{t.trips_per_year} trips/year</p>
                    {t.business_class && <span className="text-xs text-orange-400">Business Class ✈</span>}
                  </div>
                  <p className="text-xs text-gray-500">{t.destinations.join(', ')}</p>
                  <p className="text-xs text-gray-600 font-mono mt-1">Passport: {t.passport_no}</p>
                </div>
              ))}
            </DataCard>
          )}
        </div>
      )}

      {tab === 'graph' && graph && (
        <div className="card overflow-hidden" style={{ height: 520 }}>
          <div className="flex items-center gap-2 p-4 border-b border-gray-800">
            <User size={14} className="text-blue-400" />
            <h4 className="text-sm font-semibold text-gray-200">Knowledge Graph — {person.name}</h4>
            <span className="badge bg-gray-800 text-gray-400 border-gray-700">{graph.nodes.length} nodes · {graph.edges.length} edges</span>
          </div>
          <div style={{ height: 460 }}>
            <KnowledgeGraph data={graph} />
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <AuditTrail findings={score.findings} />
      )}

      {tab === 'copilot' && (
        <AICopilot cnic={cnic} />
      )}
    </div>
  )
}
