import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryProvider } from './providers/QueryProvider'
import HostView from './pages/HostView'
import GuestStatus from './pages/GuestStatus'
import ManagerSettings from './pages/ManagerSettings'
import Reports from './pages/Reports'

function App() {
  return (
    <BrowserRouter>
      <QueryProvider>
        <div className="min-h-screen bg-gray-50">
          <header className="sticky top-0 z-50 bg-white shadow-sm">
            <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-4">
              <h1 className="text-xl font-semibold text-gray-900">Restaurant Waitlist Manager</h1>
            </div>
          </header>
          <main className="max-w-lg lg:max-w-2xl mx-auto p-4 space-y-4">
            <Routes>
              <Route path="/" element={<HostView />} />
              <Route path="/status/:token" element={<GuestStatus />} />
              <Route path="/settings" element={<ManagerSettings />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </main>
        </div>
      </QueryProvider>
    </BrowserRouter>
  )
}

export default App
