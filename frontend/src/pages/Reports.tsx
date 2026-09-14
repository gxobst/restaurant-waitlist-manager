import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getDailyReport } from '../services/index.ts'
import { useAppStore } from '../store/appStore.ts'
import ErrorBoundary from '../components/ErrorBoundary.tsx'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function Reports() {
  const navigate = useNavigate()
  const isManager = useAppStore((s) => s.isManager)

  if (!isManager) {
    navigate('/')
    return null
  }

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['dailyReport'],
    queryFn: getDailyReport,
  })

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <div data-testid="skeleton-loader" className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`bg-gray-200 rounded animate-pulse ${
                i === 9 ? 'w-2/3' : 'w-full'
              }`}
              style={{ height: i === 0 ? '1.25rem' : '1rem' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6 p-4">
        <div data-testid="error-boundary" className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
          <p className="text-sm font-medium text-red-800">Unable to load report</p>
          <p className="text-sm text-red-600 mt-1">Failed to fetch daily report data. Please check your connection and try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 text-sm font-medium min-h-12 text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-4">
        <h1 className="text-2xl font-bold text-gray-900">Daily Report</h1>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total Parties</p>
            <p className="text-2xl font-semibold text-gray-900">{report?.total_parties ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Average Wait Time</p>
            <p className="text-2xl font-semibold text-gray-900">{report?.average_wait_minutes ?? 0} min</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">No-Show Rate</p>
            <p className="text-2xl font-semibold text-gray-900">{Math.round((report?.no_show_rate ?? 0) * 100)}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Seat Utilization</p>
            <p className="text-2xl font-semibold text-gray-900">{Math.round((report?.seat_utilization ?? 0) * 100)}%</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistics Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Total Parties', value: report?.total_parties ?? 0 },
              { name: 'Avg Wait (min)', value: report?.average_wait_minutes ?? 0 },
              { name: 'No-Show Rate (%)', value: Math.round((report?.no_show_rate ?? 0) * 100) },
              { name: 'Seat Utilization (%)', value: Math.round((report?.seat_utilization ?? 0) * 100) },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              const header = 'Metric,Value'
              const totalParties = report?.total_parties ?? 0
              const avgWait = report?.average_wait_minutes ?? 0
              const noShowRate = report?.no_show_rate ?? 0
              const seatUtilization = report?.seat_utilization ?? 0
              const row = `Total Parties,${totalParties}\nAverage Wait Time,${avgWait}\nNo-Show Rate,${noShowRate}\nSeat Utilization,${seatUtilization}`
              const csvContent = `${header}\n${row}`
              const blob = new Blob([csvContent], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'daily-report.csv'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="min-h-12 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              const totalParties = report?.total_parties ?? 0
              const avgWait = report?.average_wait_minutes ?? 0
              const noShowRate = report?.no_show_rate ?? 0
              const seatUtilization = report?.seat_utilization ?? 0
              const html = `
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Daily Report</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 40px; }
                      h1 { color: #111827; }
                      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                      th, td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
                      th { background-color: #f3f4f6; }
                    </style>
                  </head>
                  <body>
                    <h1>Daily Waitlist Report</h1>
                    <table>
                      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
                      <tbody>
                        <tr><td>Total Parties</td><td>${totalParties}</td></tr>
                        <tr><td>Average Wait Time (min)</td><td>${avgWait}</td></tr>
                        <tr><td>No-Show Rate</td><td>${noShowRate}</td></tr>
                        <tr><td>Seat Utilization</td><td>${seatUtilization}</td></tr>
                      </tbody>
                    </table>
                  </body>
                </html>
              `
              const newTab = window.open('', '_blank')
              if (newTab) {
                newTab.document.open()
                newTab.document.write(html)
                newTab.document.close()
              }
            }}
            className="min-h-12 px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700"
          >
            Export PDF
          </button>
        </div>
      </div>
    </ErrorBoundary>
  )
}
