import { useState } from 'react'

interface EcoPulseDashboardProps {
  gatewayUrl: string
  harvesterUrl: string
  insightUrl: string
  plannerUrl: string
  assistantUrl: string
  site: string
}

interface CSVConfig {
  rows: number
  baseKw: number
  variation: number
  spikeChance: number
  spikeMode: 'single' | 'clustered'
  spikeHours: number
  seed: number
  includeCost: boolean
  includeCo2: boolean
  includeTemp: boolean
}

interface StatusMessage {
  type: 'info' | 'success' | 'error'
  message: string
  timestamp: string
}

export default function EcoPulseDashboard({
  gatewayUrl,
  harvesterUrl,
  insightUrl,
  plannerUrl,
  assistantUrl,
  site
}: EcoPulseDashboardProps) {
  const [config, setConfig] = useState<CSVConfig>({
    rows: 100,
    baseKw: 50,
    variation: 10,
    spikeChance: 0.1,
    spikeMode: 'clustered',
    spikeHours: 3,
    seed: 12345,
    includeCost: true,
    includeCo2: true,
    includeTemp: true
  })

  const [status, setStatus] = useState<StatusMessage[]>([])
  const [csvPreview, setCsvPreview] = useState<string>('')
  const [insights, setInsights] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [useGemini, setUseGemini] = useState(false)
  const [assistantQuery, setAssistantQuery] = useState('')
  const [assistantAnswer, setAssistantAnswer] = useState('')

  const addStatus = (type: StatusMessage['type'], message: string) => {
    setStatus(prev => [{
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev].slice(0, 20))
  }

  // Deterministic random number generator (seeded)
  class SeededRandom {
    private seed: number

    constructor(seed: number) {
      this.seed = seed
    }

    next(): number {
      this.seed = (this.seed * 9301 + 49297) % 233280
      return this.seed / 233280
    }
  }

  // Generate deterministic CSV
  const generateCSV = (): string => {
    const rng = new SeededRandom(config.seed)
    const lines: string[] = []
    
    // Header
    const headers = ['timestamp', 'kw']
    if (config.includeCost) headers.push('cost_usd')
    if (config.includeCo2) headers.push('co2_kg')
    if (config.includeTemp) headers.push('temp_c')
    lines.push(headers.join(','))

    // Determine spike positions (deterministic)
    const spikePositions = new Set<number>()
    if (config.spikeMode === 'clustered') {
      const clusterStart = Math.floor(rng.next() * (config.rows - config.spikeHours))
      for (let i = 0; i < config.spikeHours; i++) {
        if (clusterStart + i < config.rows) {
          spikePositions.add(clusterStart + i)
        }
      }
    } else {
      for (let i = 0; i < config.rows; i++) {
        if (rng.next() < config.spikeChance) {
          spikePositions.add(i)
        }
      }
    }

    // Generate rows
    const baseTime = new Date('2024-01-01T00:00:00Z')
    for (let i = 0; i < config.rows; i++) {
      const timestamp = new Date(baseTime.getTime() + i * 60 * 60 * 1000).toISOString()
      
      let kw = config.baseKw + (rng.next() - 0.5) * 2 * config.variation
      
      // Apply spike
      if (spikePositions.has(i)) {
        kw += config.baseKw * 0.5 * (1 + rng.next())
      }

      const row: (string | number)[] = [timestamp, kw.toFixed(2)]
      
      if (config.includeCost) {
        row.push((kw * 0.12 * rng.next()).toFixed(2))
      }
      if (config.includeCo2) {
        row.push((kw * 0.5 * (0.8 + rng.next() * 0.4)).toFixed(2))
      }
      if (config.includeTemp) {
        row.push((20 + (rng.next() - 0.5) * 10).toFixed(1))
      }

      lines.push(row.join(','))
    }

    return lines.join('\n')
  }

  const downloadCSV = () => {
    const csv = generateCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `energy_${site}_${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addStatus('success', 'CSV generated and downloaded')
  }

  const uploadCSV = async () => {
    try {
      const csv = generateCSV()
      const blob = new Blob([csv], { type: 'text/csv' })
      const file = new File([blob], `energy_${site}.csv`, { type: 'text/csv' })
      
      const formData = new FormData()
      formData.append('file', file)

      addStatus('info', `Uploading CSV to ${gatewayUrl}/upload...`)
      const response = await fetch(`${gatewayUrl}/upload?site=${site}`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      addStatus('success', `Uploaded ${result.rows_ingested} rows successfully`)
    } catch (error: any) {
      addStatus('error', `Upload failed: ${error.message}`)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      addStatus('info', `Uploading ${file.name}...`)
      const response = await fetch(`${gatewayUrl}/upload?site=${site}`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      addStatus('success', `Uploaded ${result.rows_ingested} rows from ${file.name}`)
    } catch (error: any) {
      addStatus('error', `Upload failed: ${error.message}`)
    }
  }

  const triggerHarvester = async () => {
    try {
      addStatus('info', `Triggering harvester at ${harvesterUrl}/trigger...`)
      const response = await fetch(`${harvesterUrl}/trigger?site=${site}`, {
        method: 'POST'
      })
      const result = await response.json()
      if (result.status === 'success') {
        addStatus('success', `Harvester: ${result.message}`)
      } else {
        addStatus('error', `Harvester: ${result.message || result.error}`)
      }
    } catch (error: any) {
      addStatus('error', `Harvester failed: ${error.message}`)
    }
  }

  const triggerInsight = async () => {
    try {
      const url = `${insightUrl}/analyze?site=${site}${useGemini ? '&mode=gemini' : ''}`
      addStatus('info', `Running insight analysis${useGemini ? ' (Gemini mode)' : ''}...`)
      const response = await fetch(url, {
        method: 'POST'
      })
      const result = await response.json()
      if (result.status === 'success') {
        addStatus('success', `Insight: ${result.anomalies} anomalies, ${result.forecasted} forecast points`)
        refreshInsights()
      } else {
        addStatus('error', `Insight: ${result.message || result.error}`)
      }
    } catch (error: any) {
      addStatus('error', `Insight failed: ${error.message}`)
    }
  }

  const triggerPlanner = async () => {
    try {
      addStatus('info', `Generating plan at ${plannerUrl}/plan...`)
      const response = await fetch(`${plannerUrl}/plan?site=${site}`, {
        method: 'POST'
      })
      const result = await response.json()
      if (result.status === 'success') {
        addStatus('success', `Plan generated: ${result.items_count} items`)
        refreshPlans()
      } else {
        addStatus('error', `Planner: ${result.message || result.error}`)
      }
    } catch (error: any) {
      addStatus('error', `Planner failed: ${error.message}`)
    }
  }

  const askAssistant = async () => {
    if (!assistantQuery.trim()) return

    try {
      addStatus('info', `Asking assistant: ${assistantQuery}...`)
      const response = await fetch(`${assistantUrl}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site, q: assistantQuery })
      })
      const result = await response.json()
      setAssistantAnswer(result.answer)
      addStatus('success', 'Assistant responded')
    } catch (error: any) {
      addStatus('error', `Assistant failed: ${error.message}`)
    }
  }

  const refreshInsights = async () => {
    try {
      const response = await fetch(`${gatewayUrl}/insights?site=${site}`)
      const data = await response.json()
      setInsights(data)
      addStatus('success', `Loaded ${data.length} insights`)
    } catch (error: any) {
      addStatus('error', `Failed to load insights: ${error.message}`)
    }
  }

  const refreshPlans = async () => {
    try {
      const response = await fetch(`${gatewayUrl}/plans?site=${site}`)
      const data = await response.json()
      setPlans(data)
      addStatus('success', `Loaded ${data.length} plans`)
    } catch (error: any) {
      addStatus('error', `Failed to load plans: ${error.message}`)
    }
  }

  const runSelfTest = () => {
    // Test deterministic generation
    const csv1 = generateCSV()
    const csv2 = generateCSV()
    
    if (csv1 === csv2) {
      addStatus('success', 'Self-test passed: CSV generation is deterministic')
      
      // Verify structure
      const lines = csv1.split('\n')
      const header = lines[0]
      const firstRow = lines[1]
      
      if (header.includes('timestamp') && header.includes('kw')) {
        addStatus('success', `Self-test: Header valid, ${lines.length - 1} rows generated`)
      } else {
        addStatus('error', 'Self-test: Invalid header')
      }
      
      if (firstRow) {
        const values = firstRow.split(',')
        const kw = parseFloat(values[1])
        if (!isNaN(kw)) {
          addStatus('success', `Self-test: First row kw=${kw.toFixed(2)} (valid number)`)
        } else {
          addStatus('error', 'Self-test: Invalid kw value')
        }
      }
    } else {
      addStatus('error', 'Self-test failed: CSV generation is not deterministic')
    }
  }

  const previewCSV = () => {
    const csv = generateCSV()
    const lines = csv.split('\n').slice(0, 6) // Header + 5 rows
    setCsvPreview(lines.join('\n'))
    addStatus('info', 'CSV preview generated')
  }

  return (
    <div className="space-y-6">
      {/* Mock CSV Generator */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Mock CSV Generator</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
            <input
              type="number"
              value={config.rows}
              onChange={(e) => setConfig({ ...config, rows: parseInt(e.target.value) || 100 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base kW</label>
            <input
              type="number"
              value={config.baseKw}
              onChange={(e) => setConfig({ ...config, baseKw: parseFloat(e.target.value) || 50 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variation</label>
            <input
              type="number"
              value={config.variation}
              onChange={(e) => setConfig({ ...config, variation: parseFloat(e.target.value) || 10 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spike Chance</label>
            <input
              type="number"
              step="0.1"
              value={config.spikeChance}
              onChange={(e) => setConfig({ ...config, spikeChance: parseFloat(e.target.value) || 0.1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spike Mode</label>
            <select
              value={config.spikeMode}
              onChange={(e) => setConfig({ ...config, spikeMode: e.target.value as 'single' | 'clustered' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="single">Single</option>
              <option value="clustered">Clustered</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spike Hours</label>
            <input
              type="number"
              value={config.spikeHours}
              onChange={(e) => setConfig({ ...config, spikeHours: parseInt(e.target.value) || 3 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Seed</label>
            <input
              type="number"
              value={config.seed}
              onChange={(e) => setConfig({ ...config, seed: parseInt(e.target.value) || 12345 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeCost}
                onChange={(e) => setConfig({ ...config, includeCost: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Cost (USD)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeCo2}
                onChange={(e) => setConfig({ ...config, includeCo2: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">CO2 (kg)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.includeTemp}
                onChange={(e) => setConfig({ ...config, includeTemp: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Temp (°C)</span>
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Generate & Download
          </button>
          <button
            onClick={uploadCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Generate & Upload
          </button>
          <button
            onClick={previewCSV}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Preview CSV
          </button>
          <button
            onClick={runSelfTest}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Run Self-Test
          </button>
        </div>

        {csvPreview && (
          <div className="mt-4 p-4 bg-gray-50 rounded border">
            <h3 className="font-semibold mb-2">CSV Preview (first 5 rows):</h3>
            <pre className="text-xs overflow-x-auto">{csvPreview}</pre>
          </div>
        )}
      </div>

      {/* Manual Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Manual Upload</h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Run Agents */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Run Agents</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={triggerHarvester}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Harvester /trigger
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerInsight}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
            >
              Insight /analyze
            </button>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useGemini}
                onChange={(e) => setUseGemini(e.target.checked)}
                className="mr-1"
              />
              <span className="text-sm">Use Gemini</span>
            </label>
          </div>
          <button
            onClick={triggerPlanner}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Planner /plan
          </button>
        </div>

        {/* Assistant */}
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={assistantQuery}
              onChange={(e) => setAssistantQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && askAssistant()}
              placeholder="Ask a question..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={askAssistant}
              className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
            >
              Assistant /ask
            </button>
          </div>
          {assistantAnswer && (
            <div className="mt-2 p-3 bg-pink-50 rounded border border-pink-200">
              <p className="text-sm">{assistantAnswer}</p>
            </div>
          )}
        </div>
      </div>

      {/* Insights & Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Insights</h2>
            <button
              onClick={refreshInsights}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.length === 0 ? (
              <p className="text-gray-500 text-sm">No insights yet. Run /analyze first.</p>
            ) : (
              insights.map((insight, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border">
                  <div className="text-sm font-semibold">{insight.summary}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {insight.anomalies?.length || 0} anomalies, {insight.forecast_24h?.length || 0} forecast points
                    {insight.mode && ` (${insight.mode})`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{insight.created_at}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Plans</h2>
            <button
              onClick={refreshPlans}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {plans.length === 0 ? (
              <p className="text-gray-500 text-sm">No plans yet. Run /plan first.</p>
            ) : (
              plans.map((plan, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded border">
                  <div className="text-sm font-semibold mb-2">{plan.rationale}</div>
                  <div className="space-y-1">
                    {plan.items?.map((item: any, itemIdx: number) => (
                      <div key={itemIdx} className="text-xs pl-2 border-l-2 border-blue-300">
                        <span className={`font-semibold ${
                          item.priority === 'high' ? 'text-red-600' :
                          item.priority === 'medium' ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>
                          [{item.priority.toUpperCase()}]
                        </span> {item.action} (impact: {item.expected_impact_kw.toFixed(1)} kW)
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">{plan.created_at}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Status & Debug */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Status & Debug</h2>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {status.length === 0 ? (
            <p className="text-gray-500 text-sm">No status messages yet.</p>
          ) : (
            status.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm p-2 rounded ${
                  msg.type === 'success' ? 'bg-green-50 text-green-800' :
                  msg.type === 'error' ? 'bg-red-50 text-red-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                <span className="text-xs text-gray-500">[{msg.timestamp}]</span> {msg.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

