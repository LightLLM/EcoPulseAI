import { useState } from 'react'
import EcoPulseDashboard from './components/EcoPulseDashboard'

function App() {
  const [gatewayUrl, setGatewayUrl] = useState('http://localhost:8080')
  const [harvesterUrl, setHarvesterUrl] = useState('http://localhost:8081')
  const [insightUrl, setInsightUrl] = useState('http://localhost:8082')
  const [plannerUrl, setPlannerUrl] = useState('http://localhost:8083')
  const [assistantUrl, setAssistantUrl] = useState('http://localhost:8084')
  const [site, setSite] = useState('plant-a')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">EcoPulse.AI</h1>
          <p className="text-sm text-gray-600">Energy Intelligence Platform</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Service Configuration */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Service Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gateway URL
              </label>
              <input
                type="text"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harvester URL
              </label>
              <input
                type="text"
                value={harvesterUrl}
                onChange={(e) => setHarvesterUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Insight URL
              </label>
              <input
                type="text"
                value={insightUrl}
                onChange={(e) => setInsightUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Planner URL
              </label>
              <input
                type="text"
                value={plannerUrl}
                onChange={(e) => setPlannerUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assistant URL
              </label>
              <input
                type="text"
                value={assistantUrl}
                onChange={(e) => setAssistantUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Dashboard Component */}
        <EcoPulseDashboard
          gatewayUrl={gatewayUrl}
          harvesterUrl={harvesterUrl}
          insightUrl={insightUrl}
          plannerUrl={plannerUrl}
          assistantUrl={assistantUrl}
          site={site}
        />
      </div>
    </div>
  )
}

export default App

