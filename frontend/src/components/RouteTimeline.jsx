const LINE_COLOR = {
  'Purple Line': '#9B2FAE',
  'Green Line': '#00A651',
  'Yellow Line': '#F59E0B',
}

export default function RouteTimeline({ stations, interchanges = [] }) {
  if (!stations?.length) return null

  const interchangeSet = new Set(interchanges)

  return (
    <div className="rounded-xl2 border border-border bg-white p-5 sm:p-6 shadow-soft">
      <h3 className="font-display font-semibold text-lg mb-5">
        Station Sequence
      </h3>

     <ol className="relative pl-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
  {stations.map((s, i) => {
    const isInterchange = interchangeSet.has(s.station_name)
    const isFirst = i === 0
    const isLast = i === stations.length - 1

    const color = LINE_COLOR[s.line] || '#64748B'

    return (
      <li
        key={`${s.station_code}-${i}`}
        className="relative pl-7 pb-6 last:pb-0"
      >
        {!isLast && (
          <span
            className="absolute left-[9px] top-4 bottom-0 w-0.5"
            style={{
              backgroundColor: color,
              opacity: 0.35,
            }}
          />
        )}

        <span
          className="absolute left-0 top-0.5 rounded-full border-2 border-white"
          style={{
            backgroundColor: color,
            width: isFirst || isLast ? 20 : 14,
            height: isFirst || isLast ? 20 : 14,
            marginLeft: isFirst || isLast ? -3 : 0,
            boxShadow: `0 0 0 2px ${color}33`,
          }}
        />

        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm ${
              isFirst || isLast ? 'font-semibold' : ''
            }`}
          >
            {s.station_name}
          </span>

          {isInterchange && (
            <span className="text-[11px] font-medium text-white bg-ink px-2 py-0.5 rounded-full shrink-0">
              Interchange
            </span>
          )}
        </div>

        <span className="text-xs text-muted">
          {s.line}
        </span>
      </li>
    )
  })}
</ol>
    </div>
  )
}