import { describe, expect, it } from 'vitest'
import { generateRetailInsights } from './insightGenerator'

describe('generateRetailInsights', () => {
  it('returns structured plain-English insight fields', async () => {
    const salesData = [
      { date: '2026-02-01', quantity: 20 },
      { date: '2026-02-02', quantity: 22 },
      { date: '2026-02-03', quantity: 24 },
      { date: '2026-02-04', quantity: 26 },
      { date: '2026-02-05', quantity: 28 },
      { date: '2026-02-06', quantity: 30 },
      { date: '2026-02-07', quantity: 32 },
      { date: '2026-02-08', quantity: 34 },
      { date: '2026-02-09', quantity: 36 },
      { date: '2026-02-10', quantity: 38 },
      { date: '2026-02-11', quantity: 40 },
      { date: '2026-02-12', quantity: 42 },
      { date: '2026-02-13', quantity: 44 },
      { date: '2026-02-14', quantity: 46 },
    ]

    const forecastData = [
      { date: '2026-02-15', predictedQuantity: 48 },
      { date: '2026-02-16', predictedQuantity: 49 },
      { date: '2026-02-17', predictedQuantity: 50 },
      { date: '2026-02-18', predictedQuantity: 52 },
      { date: '2026-02-19', predictedQuantity: 53 },
      { date: '2026-02-20', predictedQuantity: 54 },
      { date: '2026-02-21', predictedQuantity: 55 },
    ]

    const insights = await generateRetailInsights({ salesData, forecastData })

    expect(insights).toEqual(
      expect.objectContaining({
        trend: expect.any(String),
        risk: expect.any(String),
        restockSuggestion: expect.any(String),
      }),
    )

    expect(insights.trend.length).toBeGreaterThan(10)
    expect(insights.risk.length).toBeGreaterThan(10)
    expect(insights.restockSuggestion.length).toBeGreaterThan(10)
  })
})
