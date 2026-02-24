import { describe, expect, it } from 'vitest'
import { forecastNext7Days } from './forecastingService'

describe('forecastNext7Days', () => {
  it('returns 7-day moving average forecast from time-series sales data', () => {
    const salesData = [
      { date: '2026-02-01', quantity: 10 },
      { date: '2026-02-02', quantity: 20 },
      { date: '2026-02-03', quantity: 30 },
      { date: '2026-02-04', quantity: 40 },
      { date: '2026-02-05', quantity: 50 },
      { date: '2026-02-06', quantity: 60 },
      { date: '2026-02-07', quantity: 70 },
    ]

    const result = forecastNext7Days(salesData)

    expect(result.model).toBe('moving_average')
    expect(result.predictions).toHaveLength(7)
    expect(result.predictions[0]).toMatchObject({
      date: '2026-02-08',
      predictedQuantity: 40,
      model: 'moving_average',
    })
  })
})
