export default function StatCard({ label, value, sublabel, icon: Icon }) {
  return (
    <div className="rounded-xl2 border border-border bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {label}
        </span>
        {Icon && <Icon size={16} className="text-muted" />}
      </div>
      <div className="text-2xl font-display font-semibold">{value}</div>
      {sublabel && <div className="text-xs text-muted mt-1">{sublabel}</div>}
    </div>
  )
}
