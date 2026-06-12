interface Props { score: number; size?: number }

export default function ScoreGauge({ score, size = 120 }: Props) {
  const radius = (size - 20) / 2
  const circ = 2 * Math.PI * radius
  const stroke = circ * (1 - score / 100)
  const color = score >= 65 ? '#ef4444' : score >= 35 ? '#f59e0b' : '#10b981'
  const label = score >= 65 ? 'HIGH RISK' : score >= 35 ? 'MEDIUM' : 'LOW RISK'

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={circ}
          strokeDashoffset={stroke}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-[10px] font-semibold tracking-wider mt-0.5" style={{ color }}>{label}</span>
      </div>
    </div>
  )
}
