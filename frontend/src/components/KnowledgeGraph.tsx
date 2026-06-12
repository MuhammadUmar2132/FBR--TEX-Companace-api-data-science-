import { useEffect, useRef, useState } from 'react'
import { Car, Building2, Zap, FileText, Plane, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GraphData, GraphNode } from '../types'

const NODE_ICONS: Record<string, LucideIcon> = {
  person: User, vehicle: Car, property: Building2,
  utility: Zap, tax_return: FileText, travel: Plane,
}

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  person:     { fill: '#1e3a5f', stroke: '#3b82f6' },
  vehicle:    { fill: '#1f2d3d', stroke: '#60a5fa' },
  property:   { fill: '#2d1f3d', stroke: '#a78bfa' },
  utility:    { fill: '#1f3d2d', stroke: '#34d399' },
  tax_return: { fill: '#3d1f1f', stroke: '#f87171' },
  travel:     { fill: '#3d2d1f', stroke: '#fb923c' },
}

const RISK_GLOW: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#10b981',
}

interface NodePos { x: number; y: number; vx: number; vy: number }

function useForceLayout(nodes: GraphNode[], edges: GraphData['edges'], width: number, height: number) {
  const [positions, setPositions] = useState<Record<string, NodePos>>({})

  useEffect(() => {
    if (!nodes.length) return
    const cx = width / 2, cy = height / 2
    const init: Record<string, NodePos> = {}

    nodes.forEach((n, i) => {
      if (n.type === 'person') {
        init[n.id] = { x: cx, y: cy, vx: 0, vy: 0 }
      } else {
        const angle = (2 * Math.PI * i) / (nodes.length - 1)
        const r = Math.min(width, height) * 0.35
        init[n.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), vx: 0, vy: 0 }
      }
    })
    setPositions(init)

    let pos = { ...init }
    let frame: number
    const ALPHA = 0.08

    const simulate = () => {
      const next: Record<string, NodePos> = {}
      const nodeArr = nodes.map(n => ({ ...n, ...pos[n.id] }))

      nodeArr.forEach(n => {
        let fx = 0, fy = 0
        // Center gravity for non-person nodes
        if (n.type !== 'person') {
          fx += (cx - n.x) * 0.005
          fy += (cy - n.y) * 0.005
        }
        // Person node stays near center
        if (n.type === 'person') {
          fx += (cx - n.x) * 0.1
          fy += (cy - n.y) * 0.1
        }
        // Repulsion between all nodes
        nodeArr.forEach(m => {
          if (m.id === n.id) return
          const dx = n.x - m.x, dy = n.y - m.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 2500 / (dist * dist)
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        })
        // Spring attraction for connected nodes
        edges.forEach(e => {
          let other: (typeof nodeArr)[0] | undefined
          if (e.source === n.id) other = nodeArr.find(m => m.id === e.target)
          if (e.target === n.id) other = nodeArr.find(m => m.id === e.source)
          if (!other) return
          const dx = other.x - n.x, dy = other.y - n.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const ideal = n.type === 'person' ? 160 : 130
          const force = (dist - ideal) * 0.04
          fx += (dx / dist) * force
          fy += (dy / dist) * force
        })

        const vx = (n.vx + fx) * 0.7
        const vy = (n.vy + fy) * 0.7
        const nx = Math.max(40, Math.min(width - 40, n.x + vx))
        const ny = Math.max(40, Math.min(height - 40, n.y + vy))
        next[n.id] = { x: nx, y: ny, vx, vy }
      })

      const moved = Object.values(next).reduce((acc, n, i) => {
        const o = Object.values(pos)[i]
        return acc + Math.abs(n.x - o.x) + Math.abs(n.y - o.y)
      }, 0)

      pos = next
      setPositions({ ...next })
      if (moved > 0.5) frame = requestAnimationFrame(simulate)
    }

    setTimeout(() => { frame = requestAnimationFrame(simulate) }, 50)
    return () => cancelAnimationFrame(frame)
  }, [nodes.map(n => n.id).join(','), width, height])

  return positions
}

type TooltipState = { node: GraphNode; x: number; y: number } | null

export default function KnowledgeGraph({ data }: { data: GraphData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 500 })
  const [tooltip, setTooltip] = useState<{ node: GraphNode; x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const positions = useForceLayout(data.nodes, data.edges, dims.w, dims.h)

  const handleNodeEnter = (e: React.MouseEvent, node: GraphNode) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ node, x: e.clientX - rect.left, y: e.clientY - rect.top - 10 })
  }

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[420px]">
      <svg ref={svgRef} width="100%" height="100%" className="w-full h-full">
        <defs>
          {Object.entries(RISK_GLOW).map(([k, color]) => (
            <filter key={k} id={`glow-${k}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#374151" />
          </marker>
        </defs>

        {/* Edges */}
        {data.edges.map((edge, i) => {
          const s = positions[edge.source], t = positions[edge.target]
          if (!s || !t) return null
          const isHighlighted = selected === edge.source || selected === edge.target
          const relColors: Record<string, string> = {
            OWNS_VEHICLE: '#60a5fa', OWNS_PROPERTY: '#a78bfa',
            HAS_UTILITY: '#34d399', FILED_RETURN: '#f87171',
            HAS_TRAVEL_RECORD: '#fb923c', ENTITY_MATCH: '#e879f9',
          }
          const color = relColors[edge.relationship] ?? '#4b5563'
          return (
            <g key={i}>
              <line
                x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                stroke={isHighlighted ? color : '#374151'}
                strokeWidth={isHighlighted ? 2 : 1}
                strokeDasharray={edge.relationship === 'ENTITY_MATCH' ? '5,4' : undefined}
                opacity={isHighlighted ? 0.9 : 0.4}
              />
              {isHighlighted && (
                <text
                  x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 6}
                  fill={color} fontSize="9" textAnchor="middle" className="select-none"
                >
                  {edge.relationship.replace(/_/g, ' ')}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {data.nodes.map(node => {
          const pos = positions[node.id]
          if (!pos) return null
          const colors = NODE_COLORS[node.type] ?? { fill: '#1f2937', stroke: '#6b7280' }
          const glowColor = RISK_GLOW[node.risk_level] ?? '#6b7280'
          const isSelected = selected === node.id
          const r = node.type === 'person' ? 30 : 22

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x},${pos.y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(isSelected ? null : node.id)}
              onMouseEnter={e => handleNodeEnter(e, node)}
              onMouseLeave={() => setTooltip(null)}
            >
              <circle r={r + 4} fill={glowColor} opacity={isSelected ? 0.25 : 0.08} />
              <circle
                r={r}
                fill={colors.fill}
                stroke={isSelected ? glowColor : colors.stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter={isSelected ? `url(#glow-${node.risk_level})` : undefined}
              />
              <text y={r + 14} textAnchor="middle" fill="#9ca3af" fontSize="10" className="select-none">
                {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 card p-3 text-xs max-w-xs pointer-events-none"
          style={{ left: Math.min(tooltip.x + 12, dims.w - 200), top: tooltip.y - 10 }}
        >
          <p className="font-semibold text-white mb-1 capitalize">{tooltip.node.type.replace('_', ' ')}</p>
          <p className="text-blue-400 font-medium mb-1.5">{tooltip.node.label}</p>
          {Object.entries(tooltip.node.properties).slice(0, 4).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
              <span className="text-gray-300 font-mono">
                {typeof v === 'number' && v > 10000
                  ? `PKR ${v.toLocaleString()}`
                  : Array.isArray(v) ? v.slice(0, 3).join(', ')
                  : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {Object.entries(NODE_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5 bg-gray-900/80 rounded px-2 py-1">
            <div className="w-2 h-2 rounded-full border" style={{ background: c.fill, borderColor: c.stroke }} />
            <span className="text-[10px] text-gray-400 capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
