const LINE_BG = { 'Purple Line': 'bg-purpleLine', 'Green Line': 'bg-greenLine' }

export default function StationCard({ station }) {
  if (!station) return null
  return (
    <div className="rounded-xl2 border border-border bg-white p-6 shadow-soft">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        {station.lines?.map((l) => (
          <span key={l} className={`text-[11px] font-medium text-white px-2 py-1 rounded-full ${LINE_BG[l]}`}>
            {l}
          </span>
        ))}
        {station.is_interchange && (
          <span className="text-[11px] font-medium bg-ink text-white px-2 py-1 rounded-full">
            Interchange Station
          </span>
        )}
      </div>
      <h2 className="font-display font-semibold text-2xl mt-2">{station.station_name}</h2>
      {station.station_name_kannada && (
        <p className="text-muted text-sm mt-0.5">{station.station_name_kannada}</p>
      )}

      <dl className="grid grid-cols-2 gap-4 mt-6">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Station Code</dt>
          <dd className="text-sm font-medium mt-0.5">{station.station_code}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Layout</dt>
          <dd className="text-sm font-medium mt-0.5">{station.layout}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Opened</dt>
          <dd className="text-sm font-medium mt-0.5">{station.opened_date}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-muted">Day of Opening</dt>
          <dd className="text-sm font-medium mt-0.5">{station.day}</dd>
        </div>
      </dl>
    </div>
  )
}
