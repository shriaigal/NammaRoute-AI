import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MetroMap from '../components/MetroMap.jsx'
import api from '../services/api.js'
import { RefreshCw } from 'lucide-react'

const LINE_INFO = {
  'Purple Line': { color: '#9B2FAE', desc: 'Whitefield (Kadugodi) ↔ Challaghatta' },
  'Green Line':  { color: '#00A651', desc: 'Madavara ↔ Silk Institute' },
  'Yellow Line': { color: '#F59E0B', desc: 'RV Road ↔ Bommasandra' },
}

export default function MetroMapPage() {
  const navigate = useNavigate()
  const [network, setNetwork] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLine, setSelectedLine] = useState('all')

  useEffect(() => {
    api.getNetwork().then(({ data }) => {
      if (data) setNetwork(data)
      setLoading(false)
    })
  }, [])

  const filteredNetwork =
    selectedLine === 'all'
      ? network
      : network.filter((r) => r.line === selectedLine)

  const lines = [...new Set(network.map((r) => r.line))].sort()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-semibold text-2xl sm:text-3xl mb-2">
        Metro Network Map
      </h1>
      <p className="text-muted text-sm mb-6">
        Station positions from the verified station master dataset.
      </p>

      {/* Line filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedLine('all')}
          className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
            selectedLine === 'all'
              ? 'bg-ink text-white border-ink'
              : 'border-border hover:bg-surface'
          }`}
        >
          All Lines
        </button>
        {lines.map((l) => (
          <button
            key={l}
            onClick={() => setSelectedLine(l)}
            className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
              selectedLine === l
                ? 'text-white border-transparent'
                : 'border-border hover:bg-surface'
            }`}
            style={
              selectedLine === l
                ? { backgroundColor: LINE_INFO[l]?.color || '#0F1626' }
                : {}
            }
          >
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted py-10">
          <RefreshCw size={14} className="animate-spin" />
          Loading network map...
        </div>
      ) : (
        <MetroMap
          network={filteredNetwork}
          height={560}
          onStationClick={(row) => navigate(`/station/${row.station_code}`)}
        />
      )}

      {/* Line legend */}
      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        {Object.entries(LINE_INFO).map(([line, info]) => (
          <div key={line} className="rounded-xl2 border border-border bg-white p-4 shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: info.color }}
              />
              <span className="font-semibold text-sm">{line}</span>
            </div>
            <p className="text-xs text-muted">{info.desc}</p>
            <p className="text-xs text-muted mt-1">
              {network.filter((r) => r.line === line).length} stations
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-4">
        Click any station marker to view station details. Station coordinates from authoritative station master data.
      </p>
    </div>
  )
}
