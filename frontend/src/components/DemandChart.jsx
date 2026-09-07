import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#9B2FAE', '#00A651', '#2563EB', '#F59E0B', '#EC4899']

export function TrendLineChart({ data, dataKey = 'total_activity', label = 'Total activity', height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EE" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={30} />
        <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip formatter={(v) => v.toLocaleString('en-IN')} />
        <Line type="monotone" dataKey={dataKey} name={label} stroke="#9B2FAE" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PaymentBarChart({ data, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E7EE" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <Tooltip formatter={(v) => v.toLocaleString('en-IN')} />
        <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SharePieChart({ data, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend verticalAlign="bottom" height={36} />
        <Tooltip formatter={(v) => v.toLocaleString('en-IN')} />
      </PieChart>
    </ResponsiveContainer>
  )
}
