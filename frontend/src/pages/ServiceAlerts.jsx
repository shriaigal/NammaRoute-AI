import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AllClearBanner, UnavailableBanner, LiveBadge } from '../components/AlertBanner.jsx'
import api from '../services/api.js'
import { RefreshCw, Radio } from 'lucide-react'

export default function ServiceAlerts() {
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [disruptions, setDisruptions] = useState(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [disruptionLoading, setDisruptionLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState(null)

  function loadData() {
    setStatusLoading(true)
    setDisruptionLoading(true)

    api.getCurrentStatus().then(({ data }) => {
      setStatus(data)
      setStatusLoading(false)
    })

    api.getCurrentUpdates().then(({ data }) => {
      setDisruptions(data)
      setDisruptionLoading(false)
    })

    setLastRefreshed(new Date())
  }

  useEffect(() => {
    loadData()
  }, [])

  const timeLabel = lastRefreshed
    ? lastRefreshed.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : ''

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl">Service Information</h1>
          <p className="text-muted text-sm mt-1">
            Live Namma Metro service status retrieved via AI web access.
          </p>
          {lastRefreshed && (
            <p className="text-xs text-muted mt-1">
              Last checked: {timeLabel} IST
            </p>
          )}
        </div>
        <button
          onClick={loadData}
          disabled={statusLoading || disruptionLoading}
          className="shrink-0 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-border hover:bg-surface disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={(statusLoading || disruptionLoading) ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Current Status */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display font-semibold text-lg">Current Service Status</h2>
          {!statusLoading && status?.available && <LiveBadge />}
        </div>

        {statusLoading && (
          <div className="rounded-xl2 border border-border bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <RefreshCw size={14} className="animate-spin" />
              Retrieving current service status...
            </div>
          </div>
        )}

        {!statusLoading && status?.available && (
          <div className="rounded-xl2 border border-green-200 bg-green-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={14} className="text-green-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wide text-green-600">
                Live Service Information
              </span>
            </div>
            <p className="text-sm text-green-800 leading-relaxed">{status.summary}</p>
            <p className="text-[11px] text-green-700/70 mt-3">
              {status.disclaimer}
            </p>
          </div>
        )}

        {!statusLoading && !status?.available && (
          <UnavailableBanner
            message={status?.message || 'Live service status is currently unavailable. Please check BMRCL official channels.'}
          />
        )}
      </section>

      {/* Disruptions */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display font-semibold text-lg">Disruptions & Delays</h2>
          {!disruptionLoading && disruptions?.available && <LiveBadge />}
        </div>

        {disruptionLoading && (
          <div className="rounded-xl2 border border-border bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <RefreshCw size={14} className="animate-spin" />
              Checking for current disruptions...
            </div>
          </div>
        )}

        {!disruptionLoading && disruptions?.available && (
          <div className="rounded-xl2 border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={14} className="text-amber-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wide text-amber-600">
                Live Disruption Check
              </span>
            </div>
            <p className="text-sm text-amber-800 leading-relaxed">{disruptions.summary}</p>
            <p className="text-[11px] text-amber-700/70 mt-3">
              {disruptions.disclaimer}
            </p>
          </div>
        )}

        {!disruptionLoading && !disruptions?.available && (
          <UnavailableBanner
            message={disruptions?.message || 'Live disruption information is currently unavailable.'}
          />
        )}
      </section>

      {/* Official source links */}
      <section className="rounded-xl2 border border-border bg-white p-5 shadow-soft">
        <h3 className="font-semibold text-sm mb-3">Official BMRCL Channels</h3>
        <div className="space-y-2 text-sm">
          <a
            href="https://english.bmrc.co.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-accent hover:underline"
          >
            BMRCL Official Website →
          </a>
          <a
            href="https://twitter.com/NammaMetroRail"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-accent hover:underline"
          >
            Namma Metro on X / Twitter →
          </a>
        </div>
        <p className="text-xs text-muted mt-4">
          For critical travel decisions, always verify with official BMRCL sources.
          Live information in this application is retrieved via AI web search and may not reflect
          real-time operational status with complete accuracy.
        </p>
      </section>
    </div>
  )
}
