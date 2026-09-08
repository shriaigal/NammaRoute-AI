import { Clock, MapPin, ArrowLeftRight, Route as RouteIcon } from 'lucide-react'

const LINE_BG = {
  'Purple Line': 'bg-purpleLine',
  'Green Line': 'bg-greenLine',
  'Yellow Line': 'bg-yellowLine'
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center text-ink shrink-0">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  )
}

export default function RouteCard({ route, title = 'Recommended Route' }) {
  if (!route) return null
  return (
    <div className="rounded-xl2 border border-border bg-white p-5 sm:p-6 shadow-soft">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-lg">{title}</h3>
        <div className="flex gap-1.5">
          {route.lines?.map((l) => (
            <span
              key={l}
              className={`text-[11px] font-medium text-white px-2 py-1 rounded-full ${LINE_BG[l] || 'bg-muted'}`}
            >
              {l}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-muted mb-5">
        {route.source} → {route.destination}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat icon={MapPin} label="Stations" value={route.station_count} />
        <Stat icon={Clock} label="Duration" value={`${route.estimated_time_minutes} min`} />
        <Stat icon={RouteIcon} label="Distance" value={`${route.distance_km} km`} />
        <Stat icon={ArrowLeftRight} label="Interchanges" value={route.interchange_count} />
      </div>
    </div>
  )
}
