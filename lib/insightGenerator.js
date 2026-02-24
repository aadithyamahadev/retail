import { getOpenAIClient } from './openai'

function mean(values) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizeSales(salesData) {
  if (!Array.isArray(salesData) || salesData.length === 0) {
    throw new Error('salesData must be a non-empty array.')
  }

  return salesData.map((point, index) => {
    const dateValue = point.date ?? point.saleDate ?? point.sale_timestamp
    const quantityValue = point.quantity ?? point.qty

    const date = new Date(dateValue)
    if (!dateValue || Number.isNaN(date.getTime())) {
      throw new Error(`salesData[${index}] has an invalid date.`)
    }

    const quantity = Number(quantityValue)
    if (!Number.isFinite(quantity)) {
      throw new Error(`salesData[${index}] has an invalid quantity.`)
    }

    return {
      date: date.toISOString().slice(0, 10),
      quantity,
    }
  })
}

function normalizeForecast(forecastData) {
  if (!Array.isArray(forecastData) || forecastData.length === 0) {
    throw new Error('forecastData must be a non-empty array.')
  }

  return forecastData.map((point, index) => {
    const dateValue = point.date
    const quantityValue = point.predictedQuantity ?? point.quantity

    const date = new Date(dateValue)
    if (!dateValue || Number.isNaN(date.getTime())) {
      throw new Error(`forecastData[${index}] has an invalid date.`)
    }

    const quantity = Number(quantityValue)
    if (!Number.isFinite(quantity)) {
      throw new Error(`forecastData[${index}] has an invalid predicted quantity.`)
    }

    return {
      date: date.toISOString().slice(0, 10),
      predictedQuantity: quantity,
    }
  })
}

function buildSummary(sales, forecast) {
  const orderedSales = [...sales].sort((left, right) => left.date.localeCompare(right.date))
  const historyWindow = orderedSales.slice(-14)
  const recentWindow = historyWindow.slice(-7)
  const previousWindow = historyWindow.slice(0, Math.max(historyWindow.length - 7, 1))

  const recentAverage = mean(recentWindow.map((item) => item.quantity))
  const previousAverage = mean(previousWindow.map((item) => item.quantity))
  const forecastAverage = mean(forecast.map((item) => item.predictedQuantity))

  const trendDeltaPct = previousAverage === 0 ? 0 : ((recentAverage - previousAverage) / previousAverage) * 100
  const forecastDeltaPct = recentAverage === 0 ? 0 : ((forecastAverage - recentAverage) / recentAverage) * 100

  return {
    recentAverage: Number(recentAverage.toFixed(2)),
    previousAverage: Number(previousAverage.toFixed(2)),
    forecastAverage: Number(forecastAverage.toFixed(2)),
    trendDeltaPct: Number(trendDeltaPct.toFixed(2)),
    forecastDeltaPct: Number(forecastDeltaPct.toFixed(2)),
  }
}

function buildHeuristicInsights(summary) {
  const trendDirection =
    summary.trendDeltaPct > 5 ? 'upward' : summary.trendDeltaPct < -5 ? 'downward' : 'stable'

  const trend =
    trendDirection === 'upward'
      ? `Sales trend is improving, with recent daily demand up about ${summary.trendDeltaPct}% versus the prior week.`
      : trendDirection === 'downward'
        ? `Sales trend is softening, with recent daily demand down about ${Math.abs(summary.trendDeltaPct)}% versus the prior week.`
        : `Sales trend is stable, with recent demand holding close to the previous week.`

  const risk =
    summary.forecastDeltaPct > 12
      ? 'Demand is projected to accelerate next week; stockout risk is elevated on fast-moving SKUs.'
      : summary.forecastDeltaPct < -12
        ? 'Demand is projected to cool next week; overstock risk is elevated if replenishment stays unchanged.'
        : 'Demand is projected to remain near current levels; near-term inventory risk is moderate.'

  const restockSuggestion =
    summary.forecastDeltaPct > 0
      ? `Increase next restock cycle by about ${Math.min(25, Math.max(5, Math.round(summary.forecastDeltaPct)))}% for priority SKUs and monitor daily sell-through.`
      : `Keep restock conservative and align purchase orders to roughly ${Math.max(70, 100 + Math.round(summary.forecastDeltaPct))}% of the current cycle.`

  return { trend, risk, restockSuggestion }
}

async function generateWithOpenAI(summary, model) {
  const client = getOpenAIClient()

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content:
          'You are a retail demand planning assistant. Return concise plain-English recommendations only.',
      },
      {
        role: 'user',
        content: `Generate insights from this summary: ${JSON.stringify(summary)}. Output must include trend, risk, and restockSuggestion.`,
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'retail_insight',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            trend: { type: 'string' },
            risk: { type: 'string' },
            restockSuggestion: { type: 'string' },
          },
          required: ['trend', 'risk', 'restockSuggestion'],
        },
      },
    },
  })

  if (!response.output_text) {
    throw new Error('OpenAI did not return output text.')
  }

  const parsed = JSON.parse(response.output_text)

  if (!parsed.trend || !parsed.risk || !parsed.restockSuggestion) {
    throw new Error('OpenAI output is missing required insight fields.')
  }

  return {
    trend: String(parsed.trend),
    risk: String(parsed.risk),
    restockSuggestion: String(parsed.restockSuggestion),
  }
}

export async function generateRetailInsights({ salesData, forecastData, model = 'gpt-4.1-mini' }) {
  const sales = normalizeSales(salesData)
  const forecast = normalizeForecast(forecastData)
  const summary = buildSummary(sales, forecast)

  try {
    return await generateWithOpenAI(summary, model)
  } catch {
    return buildHeuristicInsights(summary)
  }
}
