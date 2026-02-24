import { fetchTimeSeries } from '../../../server/services/salesService'
import { generateForecast } from '../../../server/services/forecastService'
import { generateInsights } from '../../../server/services/aiService'

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`)
  }

  return parsed
}

function parseRequest(body) {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.')
  }

  return {
    tenantId: parsePositiveInt(body.tenantId, 'tenantId'),
    storeId: parsePositiveInt(body.storeId, 'storeId'),
    productId: parsePositiveInt(body.productId, 'productId'),
    lookbackDays: body.lookbackDays ? parsePositiveInt(body.lookbackDays, 'lookbackDays') : 90,
    model: body.model ?? 'moving_average',
    config: body.config ?? {},
    insightModel: body.insightModel ?? 'gpt-4.1-mini',
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const params = parseRequest(body)

    const salesData = await fetchTimeSeries(params)

    if (salesData.length === 0) {
      return Response.json(
        {
          success: false,
          error: 'No sales data found for the provided tenant/store/product in the lookback window.',
        },
        { status: 404 },
      )
    }

    const forecast = generateForecast(salesData, {
      model: params.model,
      config: params.config,
    })

    const insights = await generateInsights({
      salesData,
      forecastData: forecast.predictions,
      model: params.insightModel,
    })

    return Response.json(
      {
        success: true,
        filters: {
          tenantId: params.tenantId,
          storeId: params.storeId,
          productId: params.productId,
          lookbackDays: params.lookbackDays,
        },
        history: salesData,
        forecast,
        insights,
      },
      { status: 200 },
    )
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected server error.',
      },
      { status: 400 },
    )
  }
}
