import { useMemo, useEffect, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
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

/*
 * ============================================================
 * LIVE USER LOCATION
 * ============================================================
 *
 * Uses navigator.geolocation.watchPosition()
 * so the user's location keeps updating without
 * refreshing the page.
 *
 * The latest location is sent to the parent MetroMap
 * through the onLocationChange callback.
 */
function LiveUserLocation({ onLocationChange }) {
  const map = useMap()

  const [locationError, setLocationError] = useState(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      const message =
        'Geolocation is not supported by this browser.'

      setLocationError(message)

      if (onLocationChange) {
        onLocationChange(null)
      }

      return
    }

    let firstLocationReceived = false

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const accuracy = position.coords.accuracy

        const location = {
          latitude,
          longitude,
          accuracy,
        }

        setLocationError(null)

        if (onLocationChange) {
          onLocationChange(location)
        }

        /*
         * Center the map only on the first valid
         * GPS location.
         *
         * After the first location, the map will NOT
         * automatically move when the user moves.
         * This allows normal manual map dragging.
         */
        if (!firstLocationReceived) {
          firstLocationReceived = true

          map.setView(
            [latitude, longitude],
            Math.max(map.getZoom(), 15)
          )
        }
      },
      (error) => {
        console.error('Location error:', error)

        const message =
          error.message ||
          'Unable to get your current location.'

        setLocationError(message)

        /*
         * Do not remove the existing location if
         * a temporary GPS error occurs.
         */
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    )

    /*
     * Stop watching the location when the component
     * is removed.
     */
    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [map, onLocationChange])

  /*
   * This component does not render the marker itself.
   *
   * The actual marker is rendered in MetroMap so
   * the My Location button can use the exact same
   * live location state.
   */

  return null
}


/*
 * ============================================================
 * USER LOCATION DISPLAY
 * ============================================================
 *
 * Displays:
 * 1. GPS accuracy circle
 * 2. Blue current-location marker
 */
function UserLocationMarker({ userLocation }) {
  if (!userLocation) {
    return null
  }

  return (
    <>
      {/* GPS accuracy circle */}
      <Circle
        center={[
          userLocation.latitude,
          userLocation.longitude,
        ]}
        radius={userLocation.accuracy}
        pathOptions={{
          color: '#2563EB',
          fillColor: '#3B82F6',
          fillOpacity: 0.12,
          weight: 1,
        }}
      />

      {/* Live user location marker */}
      <CircleMarker
        center={[
          userLocation.latitude,
          userLocation.longitude,
        ]}
        radius={9}
        pathOptions={{
          color: '#FFFFFF',
          weight: 3,
          fillColor: '#2563EB',
          fillOpacity: 1,
        }}
      >
        <Tooltip
          direction="top"
          offset={[0, -8]}
          opacity={0.95}
        >
          Your current location
        </Tooltip>

        <Popup>
          <div className="text-sm">
            <p className="font-semibold">
              Your Location
            </p>

            <p className="text-xs text-gray-500 mt-1">
              Latitude:{' '}
              {userLocation.latitude.toFixed(6)}
            </p>

            <p className="text-xs text-gray-500">
              Longitude:{' '}
              {userLocation.longitude.toFixed(6)}
            </p>

            <p className="text-xs text-gray-500">
              Accuracy:{' '}
              {Math.round(userLocation.accuracy)} m
            </p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  )
}


/*
 * ============================================================
 * MY LOCATION BUTTON
 * ============================================================
 *
 * Google Maps style location button.
 *
 * When clicked:
 * - Uses the latest live GPS position
 * - Smoothly moves the map to the user
 * - Zooms to level 17
 */
function MyLocationButton({ userLocation }) {
  const map = useMap()

  const handleMyLocation = () => {
    if (!userLocation) {
      alert(
        'Your current location is not available yet. Please allow location access and try again.'
      )
      return
    }

    map.flyTo(
      [
        userLocation.latitude,
        userLocation.longitude,
      ],
      17,
      {
        animate: true,
        duration: 1,
      }
    )
  }

  return (
    <div
      className="leaflet-control"
      style={{
        position: 'absolute',
        right: '20px',
        bottom: '30px',
        zIndex: 1000,
        margin: 0,
      }}
    >
      <button
        type="button"
        onClick={handleMyLocation}
        title="My Location"
        aria-label="My Location"
        style={{
          width: '33px',
          height: '33px',
          borderRadius: '50%',
          border: '1px solid #d1d5db',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow:
            '0 2px 8px rgba(0, 0, 0, 0.25)',
          fontSize: '18px',
          lineHeight: 1,
          padding: 0,
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor =
            '#f3f4f6'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor =
            '#ffffff'
        }}
      >
        ◎
      </button>
    </div>
  )
}


/*
 * ============================================================
 * CUSTOM LEFT MOUSE BUTTON MAP DRAGGING
 * ============================================================
 *
 * LEFT CLICK + HOLD + MOVE = MAP MOVES
 *
 * This is kept separate from Leaflet's default
 * dragging so the behavior is explicitly controlled.
 */
function MapDragHandler() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()

    let isDragging = false
    let lastX = 0
    let lastY = 0
    let activePointerId = null

    const handlePointerDown = (event) => {
      /*
       * Only left mouse button.
       *
       * 0 = left button.
       */
      if (
        event.pointerType === 'mouse' &&
        event.button !== 0
      ) {
        return
      }

      /*
       * Do not start map dragging when clicking
       * Leaflet controls.
       */
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
        container.setPointerCapture(
          event.pointerId
        )
      } catch {
        // Ignore pointer capture errors.
      }

      container.style.cursor = 'grabbing'
      document.body.style.userSelect = 'none'

      event.preventDefault()
      event.stopPropagation()
    }

    const handlePointerMove = (event) => {
      if (!isDragging) {
        return
      }

      if (
        activePointerId !== null &&
        event.pointerId !== activePointerId
      ) {
        return
      }

      const deltaX =
        event.clientX - lastX

      const deltaY =
        event.clientY - lastY

      lastX = event.clientX
      lastY = event.clientY

      if (
        deltaX === 0 &&
        deltaY === 0
      ) {
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
      if (!isDragging) {
        return
      }

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
          container.hasPointerCapture(
            activePointerId
          )
        ) {
          container.releasePointerCapture(
            activePointerId
          )
        }
      } catch {
        // Ignore pointer capture errors.
      }

      activePointerId = null

      container.style.cursor = 'grab'
      document.body.style.userSelect = ''
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
      document.body.style.userSelect = ''
    }
  }, [map])

  return null
}


/*
 * ============================================================
 * MAIN METRO MAP COMPONENT
 * ============================================================
 */
export default function MetroMap({
  network = [],
  height = 480,
  highlightedStationCodes = null,
  blockedPairs = [],
  onStationClick,
}) {
  /*
   * ==========================================================
   * LIVE USER LOCATION STATE
   * ==========================================================
   *
   * This state is intentionally kept here instead of
   * inside LiveUserLocation.
   *
   * This allows both:
   * - UserLocationMarker
   * - MyLocationButton
   *
   * to use the same live GPS location.
   */
  const [userLocation, setUserLocation] =
    useState(null)

  /*
   * Group stations by metro line.
   */
  const byLine = useMemo(() => {
    const map = {}

    for (const row of network) {
      map[row.line] =
        map[row.line] || []

      map[row.line].push(row)
    }

    Object.values(map).forEach(
      (rows) => {
        rows.sort(
          (a, b) =>
            Number(a.sequence) -
            Number(b.sequence)
        )
      }
    )

    return map
  }, [network])


  /*
   * ==========================================================
   * METRO LINE SEGMENTS
   * ==========================================================
   */
  const segments = useMemo(() => {
    const out = []

    for (const [line, rows] of Object.entries(
      byLine
    )) {
      const byCode =
        Object.fromEntries(
          rows.map((r) => [
            r.station_code,
            r,
          ])
        )

      for (const r of rows) {
        if (!r.next_station_code) {
          continue
        }

        const next =
          byCode[
            r.next_station_code
          ]

        if (!next) {
          continue
        }

        const isBlocked =
          blockedPairs.some(
            (p) =>
              p.has(
                r.station_code
              ) &&
              p.has(
                r.next_station_code
              )
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


  /*
   * Highlighted stations.
   */
  const highlightSet =
    highlightedStationCodes
      ? new Set(
          highlightedStationCodes
        )
      : null


  /*
   * ==========================================================
   * MAP UI
   * ==========================================================
   */
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

        {/* Custom left-button map dragging */}
        <MapDragHandler />


        {/* Live GPS watcher */}
        <LiveUserLocation
          onLocationChange={setUserLocation}
        />


        {/* Live blue user location marker */}
        <UserLocationMarker
          userLocation={userLocation}
        />


        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />


        {/* ==================================================
            MY LOCATION BUTTON
            ================================================== */}
        <MyLocationButton
          userLocation={userLocation}
        />


        {/* ==================================================
            METRO LINE SEGMENTS
            ================================================== */}
        {segments.map((seg) => (
          <Polyline
            key={seg.key}
            positions={seg.positions}
            pathOptions={{
              color: seg.color,
              weight: 4,
              dashArray:
                seg.dashed
                  ? '6 6'
                  : undefined,
              opacity: 0.85,
            }}
          />
        ))}


        {/* ==================================================
            METRO STATIONS
            ================================================== */}
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
                  LINE_COLOR[
                    r.line
                  ] ||
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
                        onStationClick(
                          r
                        ),
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