import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import type { Stats } from '../types'
import StatsCards from './StatsCards'
import { RiskBadge, FilingBadge } from './RiskBadge'
import ScoreGauge from './ScoreGauge'

const RISK_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981' }
const DIST_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#dc2626']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono text-white">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ stats, onSelectPerson }: { stats: Stats; onSelectPerson: (cnic: string) => void }) {
  const distData = Object.entries(stats.score_distribution).map(([range, count], i) => ({
    range, count, color: DIST_COLORS[i],
  }))

  const cityData = Object.entries(stats.city_risk).map(([city, counts]) => ({
    city, HIGH: counts.HIGH ?? 0, MEDIUM: counts.MEDIUM ?? 0, LOW: counts.LOW ?? 0,
  })).sort((a, b) => (b.HIGH + b.MEDIUM) - (a.HIGH + a.MEDIUM))

  const pieData = [
    { name: 'High Risk',  value: stats.high_risk_count,   color: '#ef4444' },
    { name: 'Medium Risk',value: stats.medium_risk_count,  color: '#f59e0b' },
    { name: 'Low Risk',   value: stats.low_risk_count,     color: '#10b981' },
  ]

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-gray-400 text-xs">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Score Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distData} barSize={28}>
              <XAxis dataKey="range" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* City Risk */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-200 mb-4">Risk by City</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData} layout="vertical" barSize={10}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="city" type="category" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="HIGH"   fill="#ef4444" radius={[0,2,2,0]} stackId="a" />
              <Bar dataKey="MEDIUM" fill="#f59e0b" radius={[0,2,2,0]} stackId="a" />
              <Bar dataKey="LOW"    fill="#10b981" radius={[0,2,2,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Flagged */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Top Flagged Individuals</h3>
          <span className="badge bg-red-500/10 text-red-400 border-red-500/20">Sorted by Deviation Score</span>
        </div>
        <div className="divide-y divide-gray-800/40">
          {stats.flagged_persons.slice(0, 10).map(p => (
            <button
              key={p.cnic}
              onClick={() => onSelectPerson(p.cnic)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-800/30 transition-colors text-left"
            >
              <ScoreGauge score={p.compliance_score} size={52} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-200">{p.name}</p>
                  <RiskBadge level={p.risk_level} />
                  <FilingBadge status={p.filing_status} />
                </div>
                <p className="text-xs text-gray-500 mt-0.5 font-mono">{p.cnic} · {p.city}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-500">{p.findings_count} finding{p.findings_count !== 1 ? 's' : ''}</p>
                <p className="text-xs text-gray-600">
                  Declared: PKR {(p.declared_income / 1_000).toFixed(0)}K
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
