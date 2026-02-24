import { query, withClient } from '../../lib/db.js'
import { forecastNext7Days } from '../../lib/forecastingService.js'
import type { TimeSeriesPoint } from './salesService'

export type ForecastPoint = {
  date: string
  predictedQuantity: number
  model: string
}

export type ForecastResult = {
  model: string
  horizonDays: number
  inputPoints: number
  predictions: ForecastPoint[]
}

export function generateForecast(
  salesData: TimeSeriesPoint[],
  options: { model?: string; config?: Record<string, unknown> } = {},
): ForecastResult {
  const result = forecastNext7Days(salesData, options) as {
    model: string
    horizonDays: number
    inputPoints: number
    predictions?: Array<{ date: string; predictedQuantity: number; model?: string }>
  }

  const predictions = Array.isArray(result.predictions)
    ? result.predictions.map((point) => ({
        date: point.date,
        predictedQuantity: Number(point.predictedQuantity),
        model: point.model ?? result.model,
      }))
    : []

  return {
    model: result.model,
    horizonDays: result.horizonDays,
    inputPoints: result.inputPoints,
    predictions,
  }
}

export async function storeForecast(params: {
  tenantId: number
  storeId: number
  productId: number
  predictions: ForecastPoint[]
  modelVersion?: string | null
}) {
  if (!Array.isArray(params.predictions) || params.predictions.length === 0) {
    throw new Error('predictions must be a non-empty array.')
  }

  await withClient(async (client: any) => {
    await client.query('BEGIN')

    try {
      const sql = `
        INSERT INTO forecasts (
          tenant_id,
          store_id,
          product_id,
          target_date,
          forecast_qty,
          model_version,
          generated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (tenant_id, store_id, product_id, target_date)
        DO UPDATE SET
          forecast_qty = EXCLUDED.forecast_qty,
          model_version = EXCLUDED.model_version,
          generated_at = EXCLUDED.generated_at
      `

      for (const point of params.predictions) {
        await client.query(sql, [
          params.tenantId,
          params.storeId,
          params.productId,
          point.date,
          point.predictedQuantity,
          params.modelVersion ?? point.model ?? null,
        ])
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })

  return { storedRows: params.predictions.length }
}

export async function fetchStoredForecast(params: {
  tenantId: number
  storeId: number
  productId: number
  days?: number
}) {
  const days = params.days ?? 7

  const result = await query(
    `
      SELECT target_date, forecast_qty, model_version, generated_at
      FROM forecasts
      WHERE tenant_id = $1
        AND store_id = $2
        AND product_id = $3
        AND target_date >= CURRENT_DATE
      ORDER BY target_date ASC
      LIMIT $4
    `,
    [params.tenantId, params.storeId, params.productId, days],
  )

  return result.rows.map((row: any) => ({
    date: row.target_date,
    predictedQuantity: Number(row.forecast_qty),
    modelVersion: row.model_version,
    generatedAt: row.generated_at,
  }))
}
