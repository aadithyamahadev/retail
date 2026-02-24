import { getOpenAIClient } from '../../lib/openai.js'
import { generateRetailInsights } from '../../lib/insightGenerator.js'
import type { SaleInsertInput, TimeSeriesPoint } from './salesService'
import type { ForecastPoint } from './forecastService'

export async function sendImageToVisionAPI(params: {
  imageBuffer: Buffer | Uint8Array
  mimeType: string
  model?: string
}) {
  if (!params.mimeType?.startsWith('image/')) {
    throw new Error('Only image MIME types are supported.')
  }

  const base64 = Buffer.from(params.imageBuffer).toString('base64')
  const client = getOpenAIClient()

  const response = await client.responses.create({
    model: params.model ?? 'gpt-4.1-mini',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: [
              'Extract structured sales rows from this retail image (receipt, invoice, or bill).',
              'Return JSON only.',
              'Include tenant_id, store_id, product_id, sale_timestamp, quantity, amount, source_ref.',
            ].join(' '),
          },
          {
            type: 'input_image',
            image_url: `data:${params.mimeType};base64,${base64}`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'sales_extraction',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            sales: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  tenant_id: { type: 'number' },
                  store_id: { type: 'number' },
                  product_id: { type: 'number' },
                  sale_timestamp: { type: 'string' },
                  quantity: { type: 'number' },
                  amount: { type: 'number' },
                  source_ref: { type: ['string', 'null'] },
                },
                required: [
                  'tenant_id',
                  'store_id',
                  'product_id',
                  'sale_timestamp',
                  'quantity',
                  'amount',
                  'source_ref',
                ],
              },
            },
          },
          required: ['sales'],
        },
      },
    },
  })

  if (!response.output_text) {
    throw new Error('No structured output returned from Vision API.')
  }

  let parsed
  try {
    parsed = JSON.parse(response.output_text)
  } catch {
    throw new Error('Vision API returned invalid JSON output.')
  }

  if (!parsed || !Array.isArray(parsed.sales)) {
    throw new Error('Vision API output is missing sales array.')
  }

  const normalizedRows = parsed.sales.map((row: any, index: number) => {
    const tenantId = Number(row.tenant_id)
    const storeId = Number(row.store_id)
    const productId = Number(row.product_id)
    const quantity = Number(row.quantity)
    const amount = Number(row.amount)
    const timestamp = new Date(row.sale_timestamp)

    if (![tenantId, storeId, productId, quantity, amount].every(Number.isFinite)) {
      throw new Error(`Row ${index + 1}: invalid numeric fields.`)
    }

    if (Number.isNaN(timestamp.getTime())) {
      throw new Error(`Row ${index + 1}: invalid sale_timestamp.`)
    }

    return {
      tenantId,
      storeId,
      productId,
      saleTimestamp: timestamp.toISOString(),
      quantity,
      amount,
      source: 'photo',
      sourceRef: row.source_ref ? String(row.source_ref) : null,
    }
  }) as SaleInsertInput[]

  return normalizedRows
}

export async function generateInsights(params: {
  salesData: TimeSeriesPoint[]
  forecastData: ForecastPoint[]
  model?: string
}) {
  return generateRetailInsights({
    salesData: params.salesData,
    forecastData: params.forecastData,
    model: params.model,
  })
}
