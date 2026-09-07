import { Sparkles, Cpu } from 'lucide-react'
import { CalculatedBadge } from './AlertBanner.jsx'

export default function AIRecommendation({ recommendation, loading, routeData }) {
  return (
    <div className="rounded-xl2 border border-accent/20 bg-gradient-to-br from-accent/[0.04] to-transparent p-5 sm:p-6 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
          <Sparkles size={16} />
        </span>
        <h3 className="font-display font-semibold text-lg">AI Travel Insight</h3>
      </div>

      {/* Route summary stats */}
      {routeData && (
        <div className="mb-4 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-2">
            <CalculatedBadge />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted">Distance</span>
              <p className="font-semibold">~{routeData.distance_km} km</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted">Est. Time</span>
              <p className="font-semibold">~{routeData.estimated_time_minutes} min</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted">Interchanges</span>
              <p className="font-semibold">{routeData.interchange_count}</p>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted">Stations</span>
              <p className="font-semibold">{routeData.station_count}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted mt-2">
            Calculated · Not official BMRCL live travel time
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Cpu size={14} className="animate-pulse" />
          <span>Generating AI travel insight...</span>
        </div>
      )}

      {!loading && recommendation && (
        <p className="text-sm leading-relaxed text-ink/90">{recommendation}</p>
      )}

      {!loading && !recommendation && !routeData && (
        <p className="text-sm text-muted">Plan a route to see an AI travel insight.</p>
      )}
    </div>
  )
}
