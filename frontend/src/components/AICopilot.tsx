import { useEffect, useState } from 'react'
import { Brain, AlertTriangle, TrendingUp, Users, Landmark, RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { explainPerson, getNetwork } from '../api'

interface EvidenceBlock {
  category: string
  severity: string
  severity_label: string
  score_contribution: number
  headline: string
  detail: string
  evidence?: Record<string, unknown>
}

interface NetworkMember {
  cnic: string
  name: string
  city: string
  compliance_score: number
  risk_level: string
  is_root: boolean
}

interface CopilotReport {
  cnic: string
  name: string
  risk_level: string
  compliance_score: number
  investigation_priority: string
  opening_summary: string
  wealth_gap_analysis: string
  asset_inventory: string[]
  evidence_blocks: EvidenceBlock[]
  entity_resolution_findings: string
  investigation_recommendation: string
  model: string
}

interface NetworkData {
  cluster_size: number
  cluster_members: NetworkMember[]
  cluster_stats: { avg_compliance_score: number; high_risk_members: number; cluster_risk: string }
}

const SEV_COLORS: Record<string, string> = {
  critical: 'border-red-600/50 bg-red-500/5 text-red-300',
  high:     'border-orange-500/50 bg-orange-500/5 text-orange-300',
  medium:   'border-amber-500/50 bg-amber-500/5 text-amber-300',
  low:      'border-blue-500/50 bg-blue-500/5 text-blue-300',
}

const SEV_BADGE: Record<string, string> = {
  critical: 'bg-red-600/20 text-red-300 border border-red-600/40',
  high:     'bg-orange-500/20 text-orange-300 border border-orange-500/40',
  medium:   'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  low:      'bg-blue-500/20 text-blue-300 border border-blue-500/40',
}

function Markdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </span>
  )
}

export default function AICopilot({ cnic }: { cnic: string }) {
  const [report, setReport] = useState<CopilotReport | null>(null)
  const [network, setNetwork] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([explainPerson(cnic), getNetwork(cnic)])
      .then(([r, n]) => { setReport(r); setNetwork(n) })
      .finally(() => setLoading(false))
  }, [cnic])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-500">
        <RefreshCw size={22} className="animate-spin text-purple-400" />
        <span className="text-sm">AI Copilot analysis generating…</span>
      </div>
    )
  }
  if (!report) return null

  const priorityColor = report.investigation_priority.startsWith('P1')
    ? 'text-red-400 bg-red-500/10 border-red-500/30'
    : report.investigation_priority.startsWith('P2')
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'

  const networkRisk = network?.cluster_stats.cluster_risk
  const networkRiskColor = networkRisk === 'HIGH' ? 'text-red-400' : networkRisk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'

  return (
    <div className="space-y-4 animate-in">

      {/* Header bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-purple-600/10 border border-purple-500/20">
        <Sparkles size={16} className="text-purple-400 shrink-0" />
        <span className="text-sm text-purple-300 font-medium">FBR GraphAI — Explainability Engine v2.0</span>
        <span className="ml-auto text-xs text-gray-600">{report.model}</span>
      </div>

      {/* Opening summary + priority */}
      <div className="card p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-purple-400 shrink-0 mt-0.5" />
            <span className="text-sm font-semibold text-white">Investigation Summary</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColor}`}>
            {report.investigation_priority}
          </span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          <Markdown text={report.opening_summary} />
        </p>
      </div>

      {/* Evidence blocks */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800">
          <AlertTriangle size={14} className="text-amber-400" />
          <span className="text-sm font-semibold text-white">
            Compliance Findings ({report.evidence_blocks.length})
          </span>
        </div>
        <div className="divide-y divide-gray-800/60">
          {report.evidence_blocks.map((block, i) => (
            <div key={i} className={`border-l-2 ${SEV_COLORS[block.severity]}`}>
              <button
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${SEV_BADGE[block.severity]}`}>
                  {block.severity_label}
                </span>
                <span className="text-sm font-medium text-gray-200 flex-1">{block.category}</span>
                <span className="text-xs text-gray-500 mr-2">+{block.score_contribution} pts</span>
                {expandedIdx === i
                  ? <ChevronUp size={14} className="text-gray-600 shrink-0" />
                  : <ChevronDown size={14} className="text-gray-600 shrink-0" />}
              </button>
              {expandedIdx === i && (
                <div className="px-5 pb-4 space-y-2">
                  <p className="text-sm text-gray-300 leading-relaxed">{block.detail}</p>
                  {block.evidence && Object.keys(block.evidence).length > 0 && (
                    <div className="mt-2 p-3 bg-gray-900/60 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">Evidence Data</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        {Object.entries(block.evidence).map(([k, v]) => (
                          <div key={k} className="flex justify-between text-xs">
                            <span className="text-gray-500">{k.replace(/_/g, ' ')}</span>
                            <span className="text-gray-300 font-mono">
                              {typeof v === 'number' ? v.toLocaleString() : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Wealth gap + Asset inventory side by side */}
      <div className="grid grid-cols-2 gap-4">
        {report.wealth_gap_analysis && (
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-red-400" />
              <span className="text-sm font-semibold text-white">Wealth–Income Gap</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed">
              <Markdown text={report.wealth_gap_analysis} />
            </p>
          </div>
        )}
        {report.asset_inventory.length > 0 && (
          <div className="card p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Landmark size={14} className="text-blue-400" />
              <span className="text-sm font-semibold text-white">Declared Asset Inventory</span>
            </div>
            <ul className="space-y-1.5">
              {report.asset_inventory.map((item, i) => (
                <li key={i} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-gray-600 shrink-0">•</span>
                  <Markdown text={item} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Entity resolution findings */}
      {report.entity_resolution_findings && (
        <div className="card p-4 space-y-2 border-l-2 border-purple-500/40">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-purple-400" />
            <span className="text-sm font-semibold text-white">Entity Resolution Findings</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            <Markdown text={report.entity_resolution_findings} />
          </p>
        </div>
      )}

      {/* Network cluster */}
      {network && network.cluster_size > 1 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-400" />
              <span className="text-sm font-semibold text-white">
                Connected Network Cluster ({network.cluster_size} persons)
              </span>
            </div>
            <span className={`text-xs font-semibold ${networkRiskColor}`}>
              Cluster Risk: {network.cluster_stats.cluster_risk}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-gray-800/40 rounded-lg p-2">
              <p className="text-white font-bold text-base">{network.cluster_size}</p>
              <p className="text-gray-500">Total Members</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-2">
              <p className="text-red-400 font-bold text-base">{network.cluster_stats.high_risk_members}</p>
              <p className="text-gray-500">High Risk</p>
            </div>
            <div className="bg-gray-800/40 rounded-lg p-2">
              <p className="text-white font-bold text-base">{network.cluster_stats.avg_compliance_score}</p>
              <p className="text-gray-500">Avg Score</p>
            </div>
          </div>
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {network.cluster_members.map(m => (
              <div key={m.cnic} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${m.is_root ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-gray-800/30'}`}>
                <div>
                  <span className="text-gray-200">{m.name}</span>
                  {m.is_root && <span className="ml-2 text-purple-400 text-[10px]">(this person)</span>}
                  <span className="text-gray-600 ml-2">{m.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-300">{m.compliance_score}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    m.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    m.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{m.risk_level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investigation recommendation */}
      <div className={`card p-4 space-y-2 border-l-2 ${
        report.investigation_priority.startsWith('P1') ? 'border-red-500/60' :
        report.investigation_priority.startsWith('P2') ? 'border-amber-500/60' :
        'border-emerald-500/60'
      }`}>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
          Investigator Recommendation
        </p>
        <p className="text-sm text-gray-300 leading-relaxed">
          <Markdown text={report.investigation_recommendation} />
        </p>
      </div>

    </div>
  )
}
