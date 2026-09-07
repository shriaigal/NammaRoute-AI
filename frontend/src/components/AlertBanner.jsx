import { AlertTriangle, CheckCircle2, Radio, Cpu } from 'lucide-react'

const SEVERITY_STYLE = {
  Major: 'bg-red-50 border-red-200 text-red-700',
  Minor: 'bg-amber-50 border-amber-200 text-amber-700',
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
      <Radio size={8} className="animate-pulse" /> LIVE
    </span>
  )
}

export function CalculatedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
      <Cpu size={8} /> CALCULATED
    </span>
  )
}

export function PredictionBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
      AI PREDICTION
    </span>
  )
}

export function AlertCard({ alert, onFindAlternative }) {
  const style = SEVERITY_STYLE[alert.severity] || 'bg-surface border-border text-ink'
  let timeStr = ''
  if (alert.updated_at) {
    try {
      timeStr = new Date(alert.updated_at).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch (_) {}
  }

  return (
    <div className={`rounded-xl2 border p-4 sm:p-5 ${style}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{alert.line}</span>
            {alert.severity && (
              <span className="text-[11px] font-medium uppercase px-2 py-0.5 rounded-full bg-white/60">
                {alert.severity}
              </span>
            )}
          </div>
          {(alert.from || alert.to) && (
            <p className="text-sm mt-1">
              {alert.from} {alert.to ? `→ ${alert.to}` : ''}
            </p>
          )}
          {alert.reason && <p className="text-sm mt-1 opacity-90">{alert.reason}</p>}
          {timeStr && (
            <p className="text-xs mt-2 opacity-70">Updated {timeStr}</p>
          )}
          {onFindAlternative && (
            <button
              onClick={() => onFindAlternative(alert)}
              className="mt-3 text-xs font-semibold underline underline-offset-2"
            >
              Find alternative route
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AllClearBanner({ message }) {
  return (
    <div className="rounded-xl2 border border-green-200 bg-green-50 text-green-700 p-4 sm:p-5 flex items-center gap-3">
      <CheckCircle2 size={18} />
      <p className="text-sm font-medium">
        {message || 'No active service alerts at this time.'}
      </p>
    </div>
  )
}

export function UnavailableBanner({ message }) {
  return (
    <div className="rounded-xl2 border border-amber-200 bg-amber-50 text-amber-700 p-4 sm:p-5 flex items-center gap-3">
      <AlertTriangle size={18} />
      <p className="text-sm font-medium">
        {message || 'Live service information is currently unavailable.'}
      </p>
    </div>
  )
}
