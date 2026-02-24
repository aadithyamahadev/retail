import { fetchTimeSeries, getBestseller } from '../../../server/services/salesService'
import { generateForecast } from '../../../server/services/forecastService'
import { generateInsights } from '../../../server/services/aiService'
import { assertSameOrigin, clampLookbackDays } from '../../../server/security/requestGuards'

function parsePositiveInt(value: unknown, fieldName: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`)
  }

  return parsed
}

function parseRequest(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object.')
  }

  const payload = body as Record<string, unknown>

  return {
    tenantId: parsePositiveInt(payload.tenantId, 'tenantId'),
    storeId: parsePositiveInt(payload.storeId, 'storeId'),
    productId: parsePositiveInt(payload.productId, 'productId'),
    lookbackDays: clampLookbackDays(
      payload.lookbackDays ? parsePositiveInt(payload.lookbackDays, 'lookbackDays') : 90,
    ),
    model: typeof payload.model === 'string' ? payload.model : 'moving_average',
    config: (payload.config as Record<string, unknown>) ?? {},
    insightModel: typeof payload.insightModel === 'string' ? payload.insightModel : 'gpt-4.1-mini',
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)

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

    const bestseller = await getBestseller({
      tenantId: params.tenantId,
      storeId: params.storeId,
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
        bestseller,
      },
      { status: 200 },
    )
  } catch (error: unknown) {
    const statusCode = error instanceof Error && error.message.includes('Cross-origin') ? 403 : 400
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected server error.',
      },
      { status: statusCode },
    )
  }
}
