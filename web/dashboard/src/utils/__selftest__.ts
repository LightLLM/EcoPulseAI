/**
 * Self-test utilities for EcoPulse Dashboard
 * Tests deterministic CSV generation and data validation
 */

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

function generateCSV(config: CSVConfig): string {
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

export function runSelfTest(): {
  passed: boolean
  results: string[]
} {
  const results: string[] = []
  let allPassed = true

  const config: CSVConfig = {
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
  }

  // Test 1: Deterministic generation
  const csv1 = generateCSV(config)
  const csv2 = generateCSV(config)
  
  if (csv1 === csv2) {
    results.push('✓ Test 1 PASSED: CSV generation is deterministic')
  } else {
    results.push('✗ Test 1 FAILED: CSV generation is not deterministic')
    allPassed = false
  }

  // Test 2: Header validation
  const lines = csv1.split('\n')
  const header = lines[0]
  
  if (header.includes('timestamp') && header.includes('kw')) {
    results.push('✓ Test 2 PASSED: Header contains required fields')
  } else {
    results.push('✗ Test 2 FAILED: Header missing required fields')
    allPassed = false
  }

  // Test 3: Row count
  const rowCount = lines.length - 1 // Exclude header
  if (rowCount === config.rows) {
    results.push(`✓ Test 3 PASSED: Generated ${rowCount} rows as expected`)
  } else {
    results.push(`✗ Test 3 FAILED: Expected ${config.rows} rows, got ${rowCount}`)
    allPassed = false
  }

  // Test 4: Numeric validation
  if (lines.length > 1) {
    const firstRow = lines[1]
    const values = firstRow.split(',')
    const kw = parseFloat(values[1])
    
    if (!isNaN(kw) && kw > 0) {
      results.push(`✓ Test 4 PASSED: First row kw=${kw.toFixed(2)} is a valid number`)
    } else {
      results.push(`✗ Test 4 FAILED: Invalid kw value: ${values[1]}`)
      allPassed = false
    }

    // Test 5: Optional columns
    if (config.includeCost && values.length > 2) {
      const cost = parseFloat(values[2])
      if (!isNaN(cost)) {
        results.push(`✓ Test 5 PASSED: cost_usd=${cost.toFixed(2)} is valid`)
      } else {
        results.push(`✗ Test 5 FAILED: Invalid cost_usd value`)
        allPassed = false
      }
    }

    if (config.includeCo2 && values.length > 3) {
      const co2 = parseFloat(values[3])
      if (!isNaN(co2)) {
        results.push(`✓ Test 6 PASSED: co2_kg=${co2.toFixed(2)} is valid`)
      } else {
        results.push(`✗ Test 6 FAILED: Invalid co2_kg value`)
        allPassed = false
      }
    }

    if (config.includeTemp && values.length > 4) {
      const temp = parseFloat(values[4])
      if (!isNaN(temp)) {
        results.push(`✓ Test 7 PASSED: temp_c=${temp.toFixed(1)} is valid`)
      } else {
        results.push(`✗ Test 7 FAILED: Invalid temp_c value`)
        allPassed = false
      }
    }
  }

  return {
    passed: allPassed,
    results
  }
}

