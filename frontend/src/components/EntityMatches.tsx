import { useEffect, useState } from 'react'
import { Network, Link2, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { getEntityMatches } from '../api'

interface EntityMatch {
  cnic1: string; name1: string; city1: string
  cnic2: string; name2: string; city2: string
  name_similarity: number
  addr_similarity: number
  shared_context_score?: number
  confidence?: number
  match_type: string
  layers?: { L2_name: number; L3_address: number; L4_shared_context: number }
}

function ConfidenceBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px]">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-400 font-mono">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function confidenceTier(c: number): { label: string; cls: string } {
  if (c >= 90) return { label: 'Very High', cls: 'bg-red-500/20 text-red-300 border-red-500/30' }
  if (c >= 80) return { label: 'High', cls: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
  if (c >= 70) return { label: 'Moderate', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
  return { label: 'Low', cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' }
}

export default function EntityMatches({ onSelectPerson }: { onSelectPerson: (cnic: string) => void }) {
  const [data, setData] = useState<{ count: number; matches: EntityMatch[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [minConf, setMinConf] = useState(70)

  useEffect(() => {
    getEntityMatches(72).then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading entity resolution…</div>

  const matches = (data?.matches ?? []).filter(m => (m.confidence ?? m.name_similarity) >= minConf)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Network size={18} className="text-purple-400" />
            <h3 className="text-base font-semibold text-white">Entity Resolution Engine</h3>
            <span className="badge bg-purple-500/10 text-purple-400 border-purple-500/20">
              {matches.length} alias pairs detected
            </span>
          </div>
          <p className="text-sm text-gray-500 max-w-2xl">
            4-layer confidence scoring: <span className="text-gray-400">L2 Name Similarity</span> ·{' '}
            <span className="text-gray-400">L3 Address Similarity</span> ·{' '}
            <span className="text-gray-400">L4 Shared Context</span> → Weighted confidence score.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0">
          <span>Min confidence:</span>
          <select
            value={minConf}
            onChange={e => setMinConf(+e.target.value)}
            className="input text-xs py-1 px-2 w-20"
          >
            {[70, 75, 80, 85, 90].map(v => <option key={v} value={v}>{v}%</option>)}
          </select>
        </div>
      </div>

      {/* Architecture explainer */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={14} className="text-cyan-400" />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Resolution Architecture</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-xs">
          {[
            { layer: 'L1', name: 'Exact Match', desc: 'Phone prefix & city', color: 'text-emerald-400' },
            { layer: 'L2', name: 'Name Similarity', desc: 'RapidFuzz token_sort + WRatio (weight 50%)', color: 'text-blue-400' },
            { layer: 'L3', name: 'Address Similarity', desc: 'partial_ratio + token_set (weight 35%)', color: 'text-purple-400' },
            { layer: 'L4', name: 'Shared Context', desc: 'Phone prefix, city, street tokens (weight 15%)', color: 'text-amber-400' },
          ].map(l => (
            <div key={l.layer} className="bg-gray-800/40 rounded-lg p-3 space-y-1">
              <div className={`text-xs font-bold ${l.color}`}>{l.layer}</div>
              <div className="font-medium text-gray-200">{l.name}</div>
              <div className="text-gray-500 leading-snug">{l.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Match cards */}
      <div className="grid gap-3">
        {matches.map((m, i) => {
          const conf = m.confidence ?? m.name_similarity
          const tier = confidenceTier(conf)
          const isOpen = expanded === i
          const layers = m.layers

          return (
            <div key={i} className="card overflow-hidden hover:border-purple-500/30 transition-colors">
              {/* Main row */}
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {/* Person 1 */}
                  <div className="flex-1 min-w-0">
                    <button onClick={() => onSelectPerson(m.cnic1)} className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate block">
                      {m.name1}
                    </button>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{m.cnic1}</p>
                    <p className="text-xs text-gray-600">{m.city1}</p>
                  </div>

                  {/* Center */}
                  <div className="flex flex-col items-center gap-1.5 px-3">
                    <Link2 size={18} className="text-purple-400" />
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tier.cls}`}>
                      {conf.toFixed(1)}% — {tier.label}
                    </div>
                    <span className="text-[10px] text-gray-600 text-center leading-tight">
                      {m.match_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Person 2 */}
                  <div className="flex-1 min-w-0 text-right">
                    <button onClick={() => onSelectPerson(m.cnic2)} className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors truncate block ml-auto">
                      {m.name2}
                    </button>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{m.cnic2}</p>
                    <p className="text-xs text-gray-600">{m.city2}</p>
                  </div>

                  {/* Expand */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : i)}
                    className="ml-2 text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded layer breakdown */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-800/60 space-y-3">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Layer Score Breakdown</p>
                  <div className="grid grid-cols-3 gap-4">
                    <ConfidenceBar
                      value={layers?.L2_name ?? m.name_similarity}
                      label="L2 Name Similarity (×0.50)"
                      color="bg-blue-500"
                    />
                    <ConfidenceBar
                      value={layers?.L3_address ?? m.addr_similarity}
                      label="L3 Address Similarity (×0.35)"
                      color="bg-purple-500"
                    />
                    <ConfidenceBar
                      value={layers?.L4_shared_context ?? m.shared_context_score ?? 0}
                      label="L4 Shared Context (×0.15)"
                      color="bg-amber-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-500">
                      Weighted Confidence =
                      ({(layers?.L2_name ?? m.name_similarity).toFixed(0)} × 0.50) +
                      ({(layers?.L3_address ?? m.addr_similarity).toFixed(0)} × 0.35) +
                      ({(layers?.L4_shared_context ?? 0).toFixed(0)} × 0.15)
                    </span>
                    <span className="font-bold text-purple-300">= {conf.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {matches.length === 0 && (
          <div className="text-center py-10 text-gray-500 text-sm">
            No matches above {minConf}% confidence. Lower the threshold to see more.
          </div>
        )}
      </div>
    </div>
  )
}
