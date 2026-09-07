import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StationCard from '../components/StationCard.jsx'
import MetroMap from '../components/MetroMap.jsx'
import { UnavailableBanner } from '../components/AlertBanner.jsx'
import api from '../services/api.js'
import { RefreshCw, Sparkles } from 'lucide-react'

export default function StationDetails() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [station, setStation] = useState(null)
  const [network, setNetwork] = useState([])
  const [stationCurrent, setStationCurrent] = useState(null)
  const [currentLoading, setCurrentLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setStation(null)
    setStationCurrent(null)
    setError('')

    api.getStation(code).then(({ data, error: err }) => {
      if (err) {
        setError(err)
      } else if (data?.data) {
        setStation(data.data)
      } else if (data && !data.success) {
        setError(data.error || 'Station not found.')
      } else {
        setStation(data)
      }
    })

    api.getNetwork().then(({ data }) => data && setNetwork(data))

    // Load demand prediction
    setCurrentLoading(true)
    api.getStationCurrent(code).then(({ data }) => {
      if (data) setStationCurrent(data)
      setCurrentLoading(false)
    })
  }, [code])

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-muted">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-accent underline"
        >
          Go back
        </button>
      </div>
    )
  }

  if (!station) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center gap-2 text-sm text-muted">
          <RefreshCw size={14} className="animate-spin" />
          Loading station details...
        </div>
      </div>
    )
  }

  const stationData = station.station_name ? station : station

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <StationCard station={stationData} />

          {/* Demand Prediction */}
          {(currentLoading || stationCurrent?.demand_prediction) && (
            <div className="rounded-xl2 border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-soft">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-purple-600" />
                <h3 className="font-semibold text-sm">Current Demand</h3>
                <span className="text-[10px] font-bold uppercase tracking-wide text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                  AI PREDICTION
                </span>
              </div>

              {currentLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <RefreshCw size={12} className="animate-spin" />
                  Generating prediction...
                </div>
              ) : stationCurrent?.demand_prediction ? (
                <>
                  <p className="text-sm leading-relaxed">
                    {stationCurrent.demand_prediction.prediction}
                  </p>
                  <p className="text-[11px] text-muted mt-2">
                    {stationCurrent.demand_prediction.disclaimer}
                  </p>
                </>
              ) : null}
            </div>
          )}

          {/* Service status placeholder */}
          <div>
            <h3 className="font-display font-semibold text-base mb-3">Service Information</h3>
            <UnavailableBanner
              message="Live service information for individual stations is not available. Check the Service Alerts page for current network status."
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() =>
                navigate(`/plan-route?source=${stationData.station_code}`)
              }
              className="text-sm font-medium bg-ink text-white px-4 py-2.5 rounded-xl hover:bg-ink/90"
            >
              Plan Route From Here
            </button>
            <button
              onClick={() =>
                navigate(`/plan-route?destination=${stationData.station_code}`)
              }
              className="text-sm font-medium border border-border px-4 py-2.5 rounded-xl hover:bg-surface"
            >
              Plan Route To Here
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h3 className="font-display font-semibold text-base mb-3">Location</h3>
          <MetroMap
            network={network}
            highlightedStationCodes={[stationData.station_code]}
            height={480}
          />
        </div>
      </div>
    </div>
  )
}
