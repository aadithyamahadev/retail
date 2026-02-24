import { insertSales } from '../../../server/services/salesService'

const REQUIRED_COLUMNS = [
  'tenant_id',
  'store_id',
  'product_id',
  'sale_timestamp',
  'quantity',
  'amount',
  'source',
]

const VALID_SOURCES = new Set(['photo', 'billing'])

function parseCsvLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function parseCsv(csvText) {
  const rawLines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (rawLines.length < 2) {
    throw new Error('CSV must include a header row and at least one data row.')
  }

  const headers = parseCsvLine(rawLines[0]).map((header) => header.toLowerCase())
  const rows = rawLines.slice(1).map((line, lineIndex) => {
    const values = parseCsvLine(line)
    if (values.length !== headers.length) {
      throw new Error(`Row ${lineIndex + 2} has ${values.length} columns; expected ${headers.length}.`)
    }

    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index]
    })

    return row
  })

  return { headers, rows }
}

function validateColumns(headers) {
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column))

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
  }
}

function normalizeRow(row, rowNumber) {
  const tenantId = Number(row.tenant_id)
  const storeId = Number(row.store_id)
  const productId = Number(row.product_id)
  const quantity = Number(row.quantity)
  const amount = Number(row.amount)
  const source = String(row.source || '').toLowerCase()

  if (![tenantId, storeId, productId, quantity, amount].every(Number.isFinite)) {
    throw new Error(`Row ${rowNumber}: tenant_id, store_id, product_id, quantity, and amount must be numeric.`)
  }

  if (!VALID_SOURCES.has(source)) {
    throw new Error(`Row ${rowNumber}: source must be one of: photo, billing.`)
  }

  const timestamp = new Date(row.sale_timestamp)
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(`Row ${rowNumber}: sale_timestamp is invalid.`)
  }

  return {
    tenantId,
    storeId,
    productId,
    saleTimestamp: timestamp.toISOString(),
    quantity,
    amount,
    source,
    sourceRef: row.source_ref || null,
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return Response.json(
        { success: false, error: 'Expected a CSV file in form field "file".' },
        { status: 400 },
      )
    }

    const csvText = await file.text()
    const { headers, rows } = parseCsv(csvText)
    validateColumns(headers)

    const normalizedRows = rows.map((row, index) => normalizeRow(row, index + 2))

    await insertSales(normalizedRows)

    return Response.json(
      {
        success: true,
        insertedRows: normalizedRows.length,
        message: 'CSV uploaded and sales inserted successfully.',
      },
      { status: 201 },
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
