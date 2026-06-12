import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronLeft, ChevronRight, Car, Building2, User, Sparkles } from 'lucide-react'
import { getPersons } from '../api'
import type { PersonSummary, PersonsResponse } from '../types'
import { RiskBadge, FilingBadge } from './RiskBadge'

const CITIES = ['', 'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']
const RISK_LEVELS = ['', 'HIGH', 'MEDIUM', 'LOW']
const FILING_STATUSES = ['', 'non_filer', 'zero_return', 'filed']

interface Props { onSelect: (cnic: string) => void }

export default function PersonsTable({ onSelect }: Props) {
  const [data, setData] = useState<PersonsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [risk, setRisk] = useState('')
  const [filing, setFiling] = useState('')
  const [onlySubmitted, setOnlySubmitted] = useState(false)
  const [page, setPage] = useState(1)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPersons({
        search: search || undefined,
        city: city || undefined,
        risk_level: risk || undefined,
        filing_status: filing || undefined,
        page,
        page_size: 15,
      })
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [search, city, risk, filing, page])

  useEffect(() => { setPage(1) }, [search, city, risk, filing, onlySubmitted])
  useEffect(() => { fetch() }, [fetch])

  const scoreBar = (s: number) => {
    const color = s >= 65 ? 'bg-red-500' : s >= 35 ? 'bg-amber-500' : 'bg-emerald-500'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-800 rounded-full h-1.5">
          <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${s}%` }} />
        </div>
        <span className="text-xs font-mono text-gray-300 w-8 text-right">{s}</span>
      </div>
    )
  }

  const visibleResults = onlySubmitted
    ? (data?.results ?? []).filter(p => p.profile_type === 'user_submitted')
    : (data?.results ?? [])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input w-full pl-9"
            placeholder="Search by name or CNIC…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={city} onChange={e => setCity(e.target.value)}>
          {CITIES.map(c => <option key={c} value={c}>{c || 'All Cities'}</option>)}
        </select>
        <select className="input" value={risk} onChange={e => setRisk(e.target.value)}>
          {RISK_LEVELS.map(r => <option key={r} value={r}>{r || 'All Risk Levels'}</option>)}
        </select>
        <select className="input" value={filing} onChange={e => setFiling(e.target.value)}>
          {FILING_STATUSES.map(f => <option key={f} value={f}>{f ? f.replace('_', ' ').toUpperCase() : 'All Status'}</option>)}
        </select>
        {/* User Submitted toggle */}
        <button
          onClick={() => setOnlySubmitted(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
            onlySubmitted
              ? 'bg-violet-600/20 text-violet-400 border-violet-500/30'
              : 'text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          <Sparkles size={13} />
          User Submitted
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Individual</th>
                <th className="px-4 py-3 text-left">CNIC</th>
                <th className="px-4 py-3 text-left">City</th>
                <th className="px-4 py-3 text-left">Risk Level</th>
                <th className="px-4 py-3 text-left">Filing Status</th>
                <th className="px-4 py-3 text-left">Deviation Score</th>
                <th className="px-4 py-3 text-center">Assets</th>
                <th className="px-4 py-3 text-left">Findings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading…</td></tr>
              )}
              {!loading && visibleResults.map(p => (
                <tr key={p.cnic} className="table-row" onClick={() => onSelect(p.cnic)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        p.profile_type === 'user_submitted'
                          ? 'bg-violet-600/20 text-violet-400'
                          : 'bg-gray-800 text-gray-400'
                      }`}>
                        {p.profile_type === 'user_submitted' ? <Sparkles size={14} /> : <User size={14} />}
                      </div>
                      <div>
                        <span className="font-medium text-gray-200">{p.name}</span>
                        {p.profile_type === 'user_submitted' && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                            Submitted
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.cnic}</td>
                  <td className="px-4 py-3 text-gray-400">{p.city}</td>
                  <td className="px-4 py-3"><RiskBadge level={p.risk_level} /></td>
                  <td className="px-4 py-3"><FilingBadge status={p.filing_status} /></td>
                  <td className="px-4 py-3 w-36">{scoreBar(p.compliance_score)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                      {p.vehicle_count > 0 && (
                        <span className="flex items-center gap-1"><Car size={11} />{p.vehicle_count}</span>
                      )}
                      {p.property_count > 0 && (
                        <span className="flex items-center gap-1"><Building2 size={11} />{p.property_count}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.findings_count > 0
                      ? <span className="badge bg-red-500/10 text-red-400 border-red-500/20">{p.findings_count} flags</span>
                      : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                </tr>
              ))}
              {!loading && !visibleResults.length && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No records found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.pages > 1 && !onlySubmitted && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">{data.total} records · Page {data.page} of {data.pages}</span>
            <div className="flex gap-2">
              <button className="btn-ghost py-1.5" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </button>
              <button className="btn-ghost py-1.5" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
