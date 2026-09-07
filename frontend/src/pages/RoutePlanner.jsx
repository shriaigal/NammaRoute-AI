import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import StationSelector from '../components/StationSelector.jsx'
import RouteCard from '../components/RouteCard.jsx'
import RouteTimeline from '../components/RouteTimeline.jsx'
import AIRecommendation from '../components/AIRecommendation.jsx'
import MetroMap from '../components/MetroMap.jsx'
import api from '../services/api.js'
import { ArrowRightLeft, RefreshCw } from 'lucide-react'
import { CalculatedBadge } from '../components/AlertBanner.jsx'

export default function RoutePlanner() {
  const [params, setParams] = useSearchParams()
  const source = params.get('source') || ''
  const destination = params.get('destination') || ''

  const [stations, setStations] = useState([])
  const [network, setNetwork] = useState([])
  const [routeData, setRouteData] = useState(null)
  const [altData, setAltData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [showAlt, setShowAlt] = useState(false)

  useEffect(() => {
    api.getStations().then(({ data }) => data && setStations(data))
    api.getNetwork().then(({ data }) => data && setNetwork(data))
  }, [])

  const runSearch = useCallback(async (src, dst) => {
    if (!src || !dst) return
    setError('')
    setRouteData(null)
    setAltData(null)
    setAiInsight('')
    setShowAlt(false)
    setLoading(true)

    const { data, error: err } = await api.getAlternativeRoute(src, dst)
    setLoading(false)

    if (err) {
      setError(err)
      return
    }

    setRouteData(data)

    // Fetch AI insight
    const primaryRoute = data?.original_route
    if (primaryRoute) {
      setAiLoading(true)
      const { data: rec } = await api.aiRecommend({ recommended_route: primaryRoute })
      setAiLoading(false)
      if (rec?.text || rec?.ai_insight) {
        setAiInsight(rec.text || rec.ai_insight)
      }
    }
  }, [])

  useEffect(() => {
    if (source && destination) runSearch(source, destination)
  }, [source, destination, runSearch])

  function handleSearch() {
    if (!source || !destination) {
      setError('Please select both a starting station and a destination.')
      return
    }
    if (source === destination) {
      setError('Please select different stations.')
      return
    }
    setParams({ source, destination })
  }

  function swap() {
    setParams({ source: destination, destination: source })
  }

  // Primary route is always the original (calculated shortest path)
  const primaryRoute = routeData?.original_route
  const alternativeRoute = routeData?.alternative_route
  const activeRoute = showAlt && alternativeRoute ? alternativeRoute : primaryRoute
  const highlightedCodes = activeRoute?.stations?.map((s) => s.station_code)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display font-semibold text-2xl sm:text-3xl mb-6">Plan Your Route</h1>

      {/* Search form */}
      <div className="rounded-xl2 border border-border bg-white p-5 sm:p-6 shadow-soft mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
          <StationSelector
            label="From Station"
            stations={stations}
            value={source}
            onChange={(v) => setParams({ source: v, destination })}
          />
          <button
            onClick={swap}
            className="self-center sm:mb-3 p-2.5 rounded-lg border border-border hover:bg-surface focus-ring shrink-0"
            aria-label="Swap stations"
          >
            <ArrowRightLeft size={16} />
          </button>
          <StationSelector
            label="To Station"
            stations={stations}
            value={destination}
            onChange={(v) => setParams({ source, destination: v })}
          />
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          onClick={handleSearch}
          className="mt-5 w-full sm:w-auto bg-ink text-white font-medium text-sm px-6 py-3 rounded-xl hover:bg-ink/90 transition-colors focus-ring"
        >
          Find Best Route
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <RefreshCw size={14} className="animate-spin" />
          Calculating best route...
        </div>
      )}

      {routeData && !loading && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Route toggle if alternative exists */}
            {alternativeRoute && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAlt(false)}
                  className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                    !showAlt
                      ? 'bg-ink text-white border-ink'
                      : 'border-border hover:bg-surface'
                  }`}
                >
                  Primary Route
                </button>
                <button
                  onClick={() => setShowAlt(true)}
                  className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${
                    showAlt
                      ? 'bg-ink text-white border-ink'
                      : 'border-border hover:bg-surface'
                  }`}
                >
                  Alternative Route
                </button>
              </div>
            )}

            {/* Route info label */}
            <div className="flex items-center gap-2">
              <CalculatedBadge />
              <span className="text-xs text-muted">
                Shortest path · avg 34 km/h · 25s dwell · 4 min interchange penalty
              </span>
            </div>

            <RouteCard
              route={activeRoute}
              title={showAlt ? 'Alternative Route' : 'Recommended Route'}
            />

            <RouteTimeline
              stations={activeRoute?.stations}
              interchanges={activeRoute?.interchanges}
            />

            <div>
              <h3 className="font-display font-semibold text-lg mb-3">Route on the Map</h3>
              <MetroMap
                network={network}
                highlightedStationCodes={highlightedCodes}
                height={420}
              />
            </div>
          </div>

          <div className="space-y-6">
            <AIRecommendation
              recommendation={aiInsight}
              loading={aiLoading}
              routeData={activeRoute}
            />

            {/* Route comparison */}
            {alternativeRoute && (
              <div className="rounded-xl2 border border-border bg-white p-4 shadow-soft">
                <h4 className="font-semibold text-sm mb-3">Route Comparison</h4>
                <div className="space-y-2 text-sm">
                  <RouteCompareRow
                    label="Primary"
                    km={primaryRoute?.distance_km}
                    min={primaryRoute?.estimated_time_minutes}
                    ic={primaryRoute?.interchange_count}
                    active={!showAlt}
                  />
                  <RouteCompareRow
                    label="Alternative"
                    km={alternativeRoute?.distance_km}
                    min={alternativeRoute?.estimated_time_minutes}
                    ic={alternativeRoute?.interchange_count}
                    active={showAlt}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!routeData && !loading && (
        <p className="text-sm text-muted">
          Select a starting station and a destination to see your route.
        </p>
      )}
    </div>
  )
}

function RouteCompareRow({ label, km, min, ic, active }) {
  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg ${
        active ? 'bg-ink text-white' : 'bg-surface text-ink'
      }`}
    >
      <span className="font-medium text-xs">{label}</span>
      <span className="text-xs">
        {km} km · {min} min · {ic} interchange{ic !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
