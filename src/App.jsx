import { useState } from 'react'
import './App.css'

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

function App() {
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

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
      const response = await fetch('/api/upload-sales', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Upload failed.')
      }

      setUploadResult({
        type: 'success',
        message: `Uploaded successfully. Inserted ${payload.insertedRows} rows.`,
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
          <label htmlFor="salesCsv" className="file-label">
            CSV sales file
          </label>
          <input
            id="salesCsv"
            name="file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <div className="actions">
            <button className="primary" type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading…' : 'Upload CSV'}
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
    </main>
  )
}

export default App
