import { fetchTimeSeries } from '../../../server/services/salesService'
import { generateForecast, storeForecast } from '../../../server/services/forecastService'

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

  const tenantId = parsePositiveInt(body.tenantId, 'tenantId')
  const storeId = parsePositiveInt(body.storeId, 'storeId')
  const productId = parsePositiveInt(body.productId, 'productId')
  const lookbackDays = body.lookbackDays ? parsePositiveInt(body.lookbackDays, 'lookbackDays') : 90

  return {
    tenantId,
    storeId,
    productId,
    lookbackDays,
    model: body.model ?? 'moving_average',
    config: body.config ?? {},
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

    await storeForecast({
      tenantId: params.tenantId,
      storeId: params.storeId,
      productId: params.productId,
      predictions: forecast.predictions,
      modelVersion: params.model,
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
