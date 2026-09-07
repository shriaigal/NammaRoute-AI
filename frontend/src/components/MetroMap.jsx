import { useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, Popup, useMap } from 'react-leaflet'

const LINE_COLOR = {
  'Purple Line': '#9B2FAE',
  'Green Line': '#00A651',
  'Yellow Line': '#F59E0B',
}
const CENTER = [12.965, 77.595]

function EnableMapInteraction() {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    map.dragging.enable()
    map.scrollWheelZoom.enable()
    map.doubleClickZoom.enable()
    map.touchZoom.enable()
    map.keyboard.enable()

    const container = map.getContainer()

    const onContextMenu = (e) => e.preventDefault()
    container.addEventListener('contextmenu', onContextMenu)

    return () => {
      container.removeEventListener('contextmenu', onContextMenu)
    }
  }, [map])

  return null
}

export default function MetroMap({
  network = [],
  height = 480,
  highlightedStationCodes = null,
  blockedPairs = [],
  onStationClick,
}) {
  const byLine = useMemo(() => {
    const m = {}
    for (const row of network) {
      m[row.line] = m[row.line] || []
      m[row.line].push(row)
    }
    Object.values(m).forEach((rows) => rows.sort((a, b) => a.sequence - b.sequence))
    return m
  }, [network])

  const segments = useMemo(() => {
    const out = []
    for (const [line, rows] of Object.entries(byLine)) {
      const byCode = Object.fromEntries(rows.map((r) => [r.station_code, r]))
      for (const r of rows) {
        if (!r.next_station_code) continue
        const next = byCode[r.next_station_code]
        if (!next) continue
        const isBlocked = blockedPairs.some(
          (p) => p.has(r.station_code) && p.has(r.next_station_code)
        )
        out.push({
          key: `${r.station_code}-${r.next_station_code}`,
          positions: [
            [r.latitude, r.longitude],
            [next.latitude, next.longitude],
          ],
          color: isBlocked ? '#EF4444' : LINE_COLOR[line] || '#64748B',
          dashed: isBlocked,
        })
      }
    }
    return out
  }, [byLine, blockedPairs])

  const highlightSet = highlightedStationCodes ? new Set(highlightedStationCodes) : null

  return (
    <div
      className="metro-map-container"
      style={{ height }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MapContainer
        center={CENTER}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        dragging
        doubleClickZoom
        touchZoom
        keyboard
        zoomControl
      >
        <EnableMapInteraction />
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {segments.map((seg) => (
          <Polyline
            key={seg.key}
            positions={seg.positions}
            pathOptions={{
              color: seg.color,
              weight: 4,
              dashArray: seg.dashed ? '6 6' : undefined,
              opacity: 0.85,
            }}
          />
        ))}
        {network.map((r) => {
          const isHighlighted = highlightSet ? highlightSet.has(r.station_code) : true
          return (
            <CircleMarker
              key={`${r.station_code}-${r.line}`}
              center={[r.latitude, r.longitude]}
              radius={r.is_interchange ? 7 : 4.5}
              pathOptions={{
                color: '#fff',
                weight: 1.5,
                fillColor: LINE_COLOR[r.line] || '#64748B',
                fillOpacity: isHighlighted ? 1 : 0.35,
              }}
              eventHandlers={onStationClick ? { click: () => onStationClick(r) } : undefined}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                {r.station_name}
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{r.station_name}</p>
                  <p className="text-xs text-gray-500">{r.line} · {r.station_code}</p>
                  {r.is_interchange && <p className="text-xs mt-1">Interchange station</p>}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}