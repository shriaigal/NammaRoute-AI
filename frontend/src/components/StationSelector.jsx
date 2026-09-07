import { useMemo, useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

const LINE_DOT = {
  'Purple Line': '#9B2FAE',
  'Green Line': '#00A651',
  'Yellow Line': '#F59E0B',
}

export default function StationSelector({
  label,
  stations,
  value,
  onChange,
  placeholder,
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFocused(false)
      }
    }

    document.addEventListener('mousedown', onClick)

    return () => {
      document.removeEventListener('mousedown', onClick)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    const base = q
      ? stations.filter((s) =>
          s.station_name?.toLowerCase().includes(q)
        )
      : stations

    // Do NOT limit to first 8 stations.
    // All stations from all metro lines must be available.
    return base
  }, [query, stations])

  const selected = stations.find(
    (s) => s.station_code === value
  )

  return (
    <div className="flex-1 min-w-0" ref={wrapRef}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">
        {label}
      </label>

      <div className="relative">
        <div
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-3 bg-white transition-colors ${
            focused
              ? 'border-accent ring-2 ring-accent/15'
              : 'border-border'
          }`}
        >
          <Search size={16} className="text-muted shrink-0" />

          <input
            className="flex-1 min-w-0 outline-none text-sm placeholder:text-muted/70 bg-transparent"
            placeholder={placeholder || 'Select a station'}
            value={focused ? query : selected?.station_name || ''}
            onFocus={() => {
              setFocused(true)
              setQuery('')
            }}
            onChange={(e) => setQuery(e.target.value)}
          />

          {selected && !focused && (
            <button
              type="button"
              aria-label={`Clear ${label}`}
              onClick={() => onChange('')}
              className="text-muted hover:text-ink"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {focused && (
          <div className="absolute z-30 mt-2 w-full bg-white border border-border rounded-xl shadow-soft max-h-64 overflow-auto">
            {filtered.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted">
                No matching stations.
              </div>
            )}

            {filtered.map((s) => (
              <button
                key={`${s.line}-${s.station_code}`}
                type="button"
                onClick={() => {
                  onChange(s.station_code)
                  setFocused(false)
                  setQuery('')
                }}
                className="w-full flex items-center gap-2.5 text-left px-4 py-2.5 hover:bg-surface text-sm"
              >
<span
  className="w-2 h-2 rounded-full shrink-0"
  style={{
    backgroundColor: LINE_DOT[s.line] || '#64748B',
  }}
/>

                <span className="flex-1 truncate">
                  {s.station_name}
                </span>

                <span className="text-xs text-muted">
                  {s.line?.replace(' Line', '')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}