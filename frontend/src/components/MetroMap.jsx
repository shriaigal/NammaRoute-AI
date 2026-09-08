import { useMemo, useEffect } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  Tooltip,
  Popup,
  useMap,
} from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

const LINE_COLOR = {
  'Purple Line': '#9B2FAE',
  'Green Line': '#00A651',
  'Yellow Line': '#F59E0B',
}

const CENTER = [12.965, 77.595]

function MapDragHandler() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()

    let isDragging = false
    let lastX = 0
    let lastY = 0
    let activePointerId = null

    const handlePointerDown = (event) => {
      // ONLY LEFT MOUSE BUTTON
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      // Ignore Leaflet zoom/control buttons
      if (
        event.target.closest('.leaflet-control') ||
        event.target.closest('.leaflet-popup') ||
        event.target.closest('.leaflet-tooltip')
      ) {
        return
      }

      isDragging = true
      activePointerId = event.pointerId

      lastX = event.clientX
      lastY = event.clientY

      try {
        container.setPointerCapture(event.pointerId)
      } catch {
        // Ignore if pointer capture is unavailable
      }

      container.style.cursor = 'grabbing'

      event.preventDefault()
      event.stopPropagation()
    }

    const handlePointerMove = (event) => {
      if (!isDragging) return

      if (
        activePointerId !== null &&
        event.pointerId !== activePointerId
      ) {
        return
      }

      const deltaX = event.clientX - lastX
      const deltaY = event.clientY - lastY

      lastX = event.clientX
      lastY = event.clientY

      if (deltaX === 0 && deltaY === 0) {
        return
      }

      event.preventDefault()

      map.panBy(
        [-deltaX, -deltaY],
        {
          animate: false,
        }
      )
    }

    const stopDragging = (event) => {
      if (!isDragging) return

      if (
        event &&
        activePointerId !== null &&
        event.pointerId !== activePointerId
      ) {
        return
      }

      isDragging = false

      try {
        if (
          activePointerId !== null &&
          container.hasPointerCapture(activePointerId)
        ) {
          container.releasePointerCapture(
            activePointerId
          )
        }
      } catch {
        // Ignore pointer capture errors
      }

      activePointerId = null

      container.style.cursor = 'grab'
    }

    const handleContextMenu = (event) => {
      event.preventDefault()
      event.stopPropagation()
    }

    container.addEventListener(
      'pointerdown',
      handlePointerDown,
      true
    )

    window.addEventListener(
      'pointermove',
      handlePointerMove,
      true
    )

    window.addEventListener(
      'pointerup',
      stopDragging,
      true
    )

    window.addEventListener(
      'pointercancel',
      stopDragging,
      true
    )

    window.addEventListener(
      'blur',
      stopDragging
    )

    container.addEventListener(
      'contextmenu',
      handleContextMenu,
      true
    )

    container.style.cursor = 'grab'
    container.style.touchAction = 'none'

    return () => {
      container.removeEventListener(
        'pointerdown',
        handlePointerDown,
        true
      )

      window.removeEventListener(
        'pointermove',
        handlePointerMove,
        true
      )

      window.removeEventListener(
        'pointerup',
        stopDragging,
        true
      )

      window.removeEventListener(
        'pointercancel',
        stopDragging,
        true
      )

      window.removeEventListener(
        'blur',
        stopDragging
      )

      container.removeEventListener(
        'contextmenu',
        handleContextMenu,
        true
      )

      container.style.cursor = ''
      container.style.touchAction = ''
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
    const map = {}

    for (const row of network) {
      map[row.line] = map[row.line] || []
      map[row.line].push(row)
    }

    Object.values(map).forEach((rows) => {
      rows.sort(
        (a, b) =>
          Number(a.sequence) -
          Number(b.sequence)
      )
    })

    return map
  }, [network])

  const segments = useMemo(() => {
    const out = []

    for (const [line, rows] of Object.entries(byLine)) {
      const byCode = Object.fromEntries(
        rows.map((r) => [
          r.station_code,
          r,
        ])
      )

      for (const r of rows) {
        if (!r.next_station_code) continue

        const next =
          byCode[r.next_station_code]

        if (!next) continue

        const isBlocked =
          blockedPairs.some(
            (p) =>
              p.has(r.station_code) &&
              p.has(r.next_station_code)
          )

        out.push({
          key: `${r.station_code}-${r.next_station_code}`,

          positions: [
            [
              Number(r.latitude),
              Number(r.longitude),
            ],
            [
              Number(next.latitude),
              Number(next.longitude),
            ],
          ],

          color: isBlocked
            ? '#EF4444'
            : LINE_COLOR[line] ||
              '#64748B',

          dashed: isBlocked,
        })
      }
    }

    return out
  }, [byLine, blockedPairs])

  const highlightSet =
    highlightedStationCodes
      ? new Set(highlightedStationCodes)
      : null

  return (
    <div
      className="metro-map-container"
      style={{
        height,
        width: '100%',
      }}
      onContextMenu={(event) =>
        event.preventDefault()
      }
    >
      <MapContainer
        center={CENTER}
        zoom={11}
        style={{
          height: '100%',
          width: '100%',
        }}
        dragging={false}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        keyboard={true}
        zoomControl={true}
      >
        <MapDragHandler />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {segments.map((seg) => (
          <Polyline
            key={seg.key}
            positions={seg.positions}
            pathOptions={{
              color: seg.color,
              weight: 4,
              dashArray: seg.dashed
                ? '6 6'
                : undefined,
              opacity: 0.85,
            }}
          />
        ))}

        {network.map((r) => {
          const isHighlighted =
            highlightSet
              ? highlightSet.has(
                  r.station_code
                )
              : true

          return (
            <CircleMarker
              key={`${r.station_code}-${r.line}`}
              center={[
                Number(r.latitude),
                Number(r.longitude),
              ]}
              radius={
                r.is_interchange
                  ? 7
                  : 4.5
              }
              pathOptions={{
                color: '#fff',
                weight: 1.5,
                fillColor:
                  LINE_COLOR[r.line] ||
                  '#64748B',
                fillOpacity:
                  isHighlighted
                    ? 1
                    : 0.35,
              }}
              eventHandlers={
                onStationClick
                  ? {
                      click: () =>
                        onStationClick(r),
                    }
                  : undefined
              }
            >
              <Tooltip
                direction="top"
                offset={[0, -6]}
                opacity={0.95}
              >
                {r.station_name}
              </Tooltip>

              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">
                    {r.station_name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {r.line} ·{' '}
                    {r.station_code}
                  </p>

                  {r.is_interchange && (
                    <p className="text-xs mt-1">
                      Interchange station
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}