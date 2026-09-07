import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, TrendingUp, ShieldAlert, Map as MapIcon,
  Clock, Radio, Cpu, RefreshCw,
} from 'lucide-react'
import StationSelector from '../components/StationSelector.jsx'
import { LiveBadge, UnavailableBanner } from '../components/AlertBanner.jsx'
import api from '../services/api.js'

const LINE_DOT = {
  'Purple Line': '#9B2FAE',
  'Green Line':  '#00A651',
  'Yellow Line': '#F59E0B',
}

export default function Home() {
  const navigate = useNavigate()
  const [stations, setStations] = useState([])
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [routeError, setRouteError] = useState('')

  const [currentStatus, setCurrentStatus] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const [latestNews, setLatestNews] = useState(null)
  const [newsLoading, setNewsLoading] = useState(true)

  const [demand, setDemand] = useState(null)
  const [demandLoading, setDemandLoading] = useState(true)

  const [currentTime, setCurrentTime] = useState(new Date())

  // Tick clock every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    api.getStations().then(({ data }) => data && setStations(data))

    // Current status (live)
    setStatusLoading(true)
    api.getCurrentStatus().then(({ data }) => {
      setCurrentStatus(data)
      setStatusLoading(false)
    })

    // Latest news (live)
    setNewsLoading(true)
    api.getCurrentNews().then(({ data }) => {
      setLatestNews(data)
      setNewsLoading(false)
    })

    // Demand prediction
    setDemandLoading(true)
    api.getDemand().then(({ data }) => {
      setDemand(data)
      setDemandLoading(false)
    })
  }, [])

  function handleFindRoute() {
    setRouteError('')
    if (!source || !destination) {
      setRouteError('Please select both a starting station and a destination.')
      return
    }
    if (source === destination) {
      setRouteError('Please select different stations.')
      return
    }
    navigate(`/plan-route?source=${source}&destination=${destination}`)
  }

  const istTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
  const istDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10 sm:pt-20 sm:pb-14">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <h1 className="font-display font-semibold text-4xl sm:text-5xl tracking-tight leading-[1.1]">
              Navigate Bengaluru Metro smarter.
            </h1>
            <p className="text-muted text-base sm:text-lg mt-4 leading-relaxed">
              AI-powered route planning, live service information, and intelligent
              metro insights — all in one place.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display font-semibold text-2xl">{istTime} IST</p>
            <p className="text-sm text-muted mt-0.5">{istDate}</p>
          </div>
        </div>

        {/* Search card */}
        <div className="rounded-xl2 border border-border bg-white p-5 sm:p-6 shadow-soft mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <StationSelector
              label="From"
              stations={stations}
              value={source}
              onChange={setSource}
              placeholder="Select starting station"
            />
            <StationSelector
              label="To"
              stations={stations}
              value={destination}
              onChange={setDestination}
              placeholder="Select destination station"
            />
          </div>
          {routeError && <p className="text-sm text-red-600 mt-3">{routeError}</p>}
          <button
            onClick={handleFindRoute}
            className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-ink text-white font-medium text-sm px-6 py-3 rounded-xl hover:bg-ink/90 transition-colors focus-ring"
          >
            Find Best Route <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 grid sm:grid-cols-3 gap-4 mb-14">
        <QuickLink to="/metro-map" icon={MapIcon} title="Metro Network Map" desc="Explore all lines and stations" />
        <QuickLink to="/demand-insights" icon={TrendingUp} title="Demand Insights" desc="AI demand predictions" />
        <QuickLink to="/service-alerts" icon={ShieldAlert} title="Service Information" desc="Live metro service status" />
      </section>

      {/* Current Status */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-14">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display font-semibold text-xl">Current Metro Status</h2>
          {!statusLoading && currentStatus?.available && <LiveBadge />}
        </div>

        {statusLoading && (
          <div className="rounded-xl2 border border-border bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <RefreshCw size={14} className="animate-spin" />
              Fetching current status...
            </div>
          </div>
        )}

        {!statusLoading && currentStatus?.available && (
          <div className="rounded-xl2 border border-green-200 bg-green-50 p-5">
            <p className="text-sm text-green-800 leading-relaxed">{currentStatus.summary}</p>
            <p className="text-[11px] text-green-700/70 mt-2">
              Retrieved: {new Date(currentStatus.retrieved_at).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
              })} IST · {currentStatus.disclaimer}
            </p>
          </div>
        )}

        {!statusLoading && !currentStatus?.available && (
          <UnavailableBanner
            message={currentStatus?.message || 'Live service status is currently unavailable. Check BMRCL official channels.'}
          />
        )}
      </section>

      {/* Latest News */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-14">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display font-semibold text-xl">Latest Metro Update</h2>
          {!newsLoading && latestNews?.available && <LiveBadge />}
        </div>

        {newsLoading && (
          <div className="rounded-xl2 border border-border bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <RefreshCw size={14} className="animate-spin" />
              Fetching latest updates...
            </div>
          </div>
        )}

        {!newsLoading && latestNews?.available && (
          <div className="rounded-xl2 border border-border bg-white p-5 shadow-soft">
            <p className="text-sm leading-relaxed">{latestNews.summary}</p>
            <p className="text-[11px] text-muted mt-3">
              Retrieved: {new Date(latestNews.retrieved_at).toLocaleTimeString('en-IN', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
              })} IST · {latestNews.disclaimer}
            </p>
          </div>
        )}

        {!newsLoading && !latestNews?.available && (
          <UnavailableBanner
            message={latestNews?.message || 'Live news is currently unavailable.'}
          />
        )}
      </section>

      {/* Demand prediction */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-16">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display font-semibold text-xl">Network Demand</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
            AI PREDICTION
          </span>
        </div>

        {demandLoading && (
          <div className="rounded-xl2 border border-border bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <RefreshCw size={14} className="animate-spin" />
              Generating demand prediction...
            </div>
          </div>
        )}

        {!demandLoading && demand && (
          <div className="rounded-xl2 border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-soft">
            <p className="text-sm leading-relaxed">{demand.prediction}</p>
            <p className="text-[11px] text-purple-700/70 mt-2">{demand.disclaimer}</p>
          </div>
        )}
      </section>
    </div>
  )
}

function QuickLink({ to, icon: Icon, title, desc }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="text-left rounded-xl2 border border-border bg-white p-5 hover:shadow-soft transition-shadow focus-ring"
    >
      <span className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center mb-3">
        <Icon size={18} />
      </span>
      <h3 className="font-medium text-sm">{title}</h3>
      <p className="text-xs text-muted mt-0.5">{desc}</p>
    </button>
  )
}
