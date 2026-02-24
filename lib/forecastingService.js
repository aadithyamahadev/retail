class BaseForecaster {
  constructor(config = {}) {
    this.config = config
  }

  forecast() {
    throw new Error('Forecast method must be implemented by subclass.')
  }
}

class MovingAverageForecaster extends BaseForecaster {
  forecast(series, horizonDays = 7) {
    if (!Array.isArray(series) || series.length === 0) {
      throw new Error('salesData must include at least one time-series point.')
    }

    const windowSize = Number(this.config.windowSize ?? 7)
    if (!Number.isInteger(windowSize) || windowSize < 1) {
      throw new Error('windowSize must be a positive integer.')
    }

    const values = series.map((point) => point.quantity)
    const predictions = []

    for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
      const effectiveWindow = Math.min(windowSize, values.length)
      const window = values.slice(values.length - effectiveWindow)
      const movingAverage = window.reduce((sum, value) => sum + value, 0) / effectiveWindow

      const forecastDate = new Date(series.at(-1).date)
      forecastDate.setUTCDate(forecastDate.getUTCDate() + dayOffset + 1)

      const prediction = {
        date: forecastDate.toISOString().slice(0, 10),
        predictedQuantity: Number(movingAverage.toFixed(2)),
        model: 'moving_average',
      }

      predictions.push(prediction)
      values.push(movingAverage)
    }

    return predictions
  }
}

class SarimaForecaster extends BaseForecaster {
  forecast() {
    throw new Error('SARIMA forecaster is not implemented yet. Plug your SARIMA model here later.')
  }
}

function toIsoDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value in salesData: ${value}`)
  }

  return date.toISOString().slice(0, 10)
}

function normalizeSeries(salesData) {
  if (!Array.isArray(salesData) || salesData.length === 0) {
    throw new Error('salesData must be a non-empty array.')
  }

  const dailyTotals = new Map()

  salesData.forEach((item, index) => {
    const rawDate = item.date ?? item.saleDate ?? item.sale_timestamp
    const quantity = Number(item.quantity ?? item.qty)

    if (!rawDate) {
      throw new Error(`salesData[${index}] is missing date/saleDate/sale_timestamp.`)
    }

    if (!Number.isFinite(quantity)) {
      throw new Error(`salesData[${index}] has invalid quantity.`)
    }

    const day = toIsoDate(rawDate)
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + quantity)
  })

  return [...dailyTotals.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, quantity]) => ({ date, quantity }))
}

export function createForecaster(model = 'moving_average', config = {}) {
  switch (model) {
    case 'moving_average':
      return new MovingAverageForecaster(config)
    case 'sarima':
      return new SarimaForecaster(config)
    default:
      throw new Error(`Unsupported model: ${model}`)
  }
}

export function forecastNext7Days(salesData, options = {}) {
  const normalizedSeries = normalizeSeries(salesData)
  const model = options.model ?? 'moving_average'
  const forecaster = createForecaster(model, options.config)

  return {
    model,
    horizonDays: 7,
    inputPoints: normalizedSeries.length,
    predictions: forecaster.forecast(normalizedSeries, 7),
  }
}
