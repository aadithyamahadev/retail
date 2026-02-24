'use client'

import { useState } from 'react'

const highlights = [
  'Per-store and SKU coverage',
  '12-week horizon defaults',
  'CSV/Parquet ingest ready',
]

const readiness = [
  { label: 'Data freshness', value: 'Daily at 02:00 UTC' },
  { label: 'Forecast horizon', value: '12 weeks rolling' },
  { label: 'Model status', value: 'Ready to run' },
]

const checklist = [
  'Upload baseline sales and inventory',
  'Map store and SKU identifiers',
  'Review seasonal uplift factors',
]

export default function Page() {
  const [file, setFile] = useState(null)
  const [ingestMode, setIngestMode] = useState('billing')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [insightFilters, setInsightFilters] = useState({
    tenantId: '1',
    storeId: '1',
    productId: '1',
    lookbackDays: '90',
  })
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false)
  const [insightResult, setInsightResult] = useState(null)
  const [insightError, setInsightError] = useState('')

  async function handleUpload(event) {
    event.preventDefault()

    if (!file) {
      setUploadResult({ type: 'error', message: 'Please select a CSV file first.' })
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)
    setUploadResult(null)

    try {
      const endpoint = ingestMode === 'photo' ? '/api/photo-mode' : '/api/billing-mode'

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Upload failed.')
      }

      setUploadResult({
        type: 'success',
        message: `${ingestMode === 'photo' ? 'Photo' : 'Billing'} upload successful. Inserted ${payload.insertedRows} rows.`,
      })
      setFile(null)
      event.target.reset()
    } catch (error) {
      setUploadResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unexpected upload error.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  function handleInsightFilterChange(event) {
    const { name, value } = event.target
    setInsightFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleGenerateInsights(event) {
    event.preventDefault()

    setInsightError('')
    setInsightResult(null)
    setIsGeneratingInsights(true)

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: Number(insightFilters.tenantId),
          storeId: Number(insightFilters.storeId),
          productId: Number(insightFilters.productId),
          lookbackDays: Number(insightFilters.lookbackDays),
          model: 'moving_average',
          config: { windowSize: 7 },
        }),
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to generate insights.')
      }

      setInsightResult(payload)
    } catch (error) {
      setInsightError(error instanceof Error ? error.message : 'Unexpected insights error.')
    } finally {
      setIsGeneratingInsights(false)
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Retail analytics starter</p>
        <h1>Retail Forecasting Starter</h1>
        <p className="lede">
          Kick off a lightweight demand forecast prototype with sensible defaults for store and
          SKU-level projections.
        </p>
        <form className="upload-form" onSubmit={handleUpload}>
          <label htmlFor="ingestMode" className="file-label">
            Ingestion mode
          </label>
          <select
            id="ingestMode"
            value={ingestMode}
            onChange={(event) => setIngestMode(event.target.value)}
          >
            <option value="billing">Billing mode</option>
            <option value="photo">Photo mode</option>
          </select>
          <label htmlFor="salesCsv" className="file-label">
            {ingestMode === 'photo' ? 'Sales image file' : 'CSV sales file'}
          </label>
          <input
            id="salesCsv"
            name="file"
            type="file"
            accept={ingestMode === 'photo' ? 'image/*' : '.csv,text/csv'}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <div className="actions">
            <button className="primary" type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading…' : `Upload ${ingestMode === 'photo' ? 'Photo' : 'Billing CSV'}`}
            </button>
            <button className="ghost" type="button" disabled>
              Run Forecasts
            </button>
          </div>
          {uploadResult ? (
            <p className={`upload-message ${uploadResult.type}`}>{uploadResult.message}</p>
          ) : null}
        </form>
        <div className="pill-row">
          {highlights.map((item) => (
            <span key={item} className="pill">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Tenant</p>
          <p className="kpi-value">#{insightFilters.tenantId}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Store</p>
          <p className="kpi-value">#{insightFilters.storeId}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Product</p>
          <p className="kpi-value">#{insightFilters.productId}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Lookback</p>
          <p className="kpi-value">{insightFilters.lookbackDays} days</p>
        </article>
      </section>

      <section className="grid">
        <div className="panel">
          <header className="panel-header">
            <p className="eyebrow">Readiness</p>
            <h2>Pipeline snapshot</h2>
          </header>
          <ul className="metric-list">
            {readiness.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <header className="panel-header">
            <p className="eyebrow">Checklist</p>
            <h2>Next three steps</h2>
          </header>
          <ol className="checklist">
            {checklist.map((item) => (
              <li key={item}>
                <span aria-hidden="true">⟡</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="panel insight-workspace">
        <header className="panel-header">
          <p className="eyebrow">AI Assistant</p>
          <h2>Demand Insights</h2>
        </header>

        <form className="insight-form" onSubmit={handleGenerateInsights}>
          <label>
            Tenant ID
            <input
              type="number"
              min="1"
              name="tenantId"
              value={insightFilters.tenantId}
              onChange={handleInsightFilterChange}
              required
            />
          </label>
          <label>
            Store ID
            <input
              type="number"
              min="1"
              name="storeId"
              value={insightFilters.storeId}
              onChange={handleInsightFilterChange}
              required
            />
          </label>
          <label>
            Product ID
            <input
              type="number"
              min="1"
              name="productId"
              value={insightFilters.productId}
              onChange={handleInsightFilterChange}
              required
            />
          </label>
          <label>
            Lookback Days
            <input
              type="number"
              min="7"
              name="lookbackDays"
              value={insightFilters.lookbackDays}
              onChange={handleInsightFilterChange}
              required
            />
          </label>
          <div className="insight-actions">
            <button className="primary" type="submit" disabled={isGeneratingInsights}>
              {isGeneratingInsights ? 'Generating…' : 'Generate AI Insights'}
            </button>
          </div>
        </form>

        {insightError ? <p className="upload-message error">{insightError}</p> : null}

        {insightResult ? (
          <>
            <div className="insight-cards">
              <article className="insight-card">
                <h3>Trend</h3>
                <p>{insightResult.insights.trend}</p>
              </article>
              <article className="insight-card">
                <h3>Risk</h3>
                <p>{insightResult.insights.risk}</p>
              </article>
              <article className="insight-card">
                <h3>Restock Suggestion</h3>
                <p>{insightResult.insights.restockSuggestion}</p>
              </article>
            </div>

            <div className="forecast-table-wrap">
              <h3>Next 7 Days Forecast</h3>
              <table className="forecast-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Predicted Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {insightResult.forecast.predictions.map((item) => (
                    <tr key={item.date}>
                      <td>{item.date}</td>
                      <td>{item.predictedQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </main>
  )
}
