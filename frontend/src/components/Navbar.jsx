import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Menu, X, TrainFront, Sparkles } from 'lucide-react'

const links = [
  { to: '/', label: 'Home' },
  { to: '/plan-route', label: 'Plan Route' },
  { to: '/metro-map', label: 'Metro Map' },
  { to: '/demand-insights', label: 'Demand Insights' },
  { to: '/service-alerts', label: 'Service Alerts' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <span className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <TrainFront size={18} className="text-white" />
          </span>
          <span className="font-display font-semibold text-lg tracking-tight">NammaRoute AI</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-ring ${
                  isActive ? 'bg-ink text-white' : 'text-muted hover:text-ink hover:bg-surface'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-accent">
          <Sparkles size={16} />
          AI Travel Assistant
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-surface focus-ring"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-border px-4 py-3 flex flex-col gap-1 bg-white">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-ink text-white' : 'text-muted hover:bg-surface'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
