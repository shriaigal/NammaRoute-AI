import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import MetroChatbot from './components/MetroChatbot.jsx'
import Home from './pages/Home.jsx'
import RoutePlanner from './pages/RoutePlanner.jsx'
import MetroMapPage from './pages/MetroMapPage.jsx'
import StationDetails from './pages/StationDetails.jsx'
import DemandInsights from './pages/DemandInsights.jsx'
import ServiceAlerts from './pages/ServiceAlerts.jsx'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan-route" element={<RoutePlanner />} />
          <Route path="/metro-map" element={<MetroMapPage />} />
          <Route path="/station/:code" element={<StationDetails />} />
          <Route path="/demand-insights" element={<DemandInsights />} />
          <Route path="/service-alerts" element={<ServiceAlerts />} />
          <Route
            path="*"
            element={
              <div className="max-w-3xl mx-auto px-6 py-24 text-center">
                <p className="text-muted">Page not found.</p>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
      <MetroChatbot />
    </div>
  )
}
