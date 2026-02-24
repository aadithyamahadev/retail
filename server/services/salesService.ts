import { query, withClient } from '../../lib/db.js'

export type SaleSource = 'photo' | 'billing'

export type SaleInsertInput = {
  tenantId: number
  storeId: number
  productId: number
  saleTimestamp: string
  quantity: number
  amount: number
  source: SaleSource
  sourceRef?: string | null
}

export type TimeSeriesPoint = {
  date: string
  quantity: number
}

export async function insertSales(rows: SaleInsertInput[], returnIds = false) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('rows must be a non-empty array.')
  }

  const insertedIds: number[] = []

  await withClient(async (client: any) => {
    await client.query('BEGIN')

    try {
      const insertQuery = returnIds
        ? `
          INSERT INTO sales (
            tenant_id,
            store_id,
            product_id,
            sale_timestamp,
            quantity,
            amount,
            source,
            source_ref
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::sale_source, $8)
          RETURNING id
        `
        : `
          INSERT INTO sales (
            tenant_id,
            store_id,
            product_id,
            sale_timestamp,
            quantity,
            amount,
            source,
            source_ref
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::sale_source, $8)
        `

      for (const row of rows) {
        const result = await client.query(insertQuery, [
          row.tenantId,
          row.storeId,
          row.productId,
          row.saleTimestamp,
          row.quantity,
          row.amount,
          row.source,
          row.sourceRef ?? null,
        ])

        if (returnIds && result.rows[0]?.id) {
          insertedIds.push(Number(result.rows[0].id))
        }
      }

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })

  return {
    insertedRows: rows.length,
    insertedIds,
  }
}

export async function getBestseller(params: {
  tenantId: number
  storeId?: number
  startDate?: string
  endDate?: string
}) {
  const values: Array<number | string> = [params.tenantId]
  const filters: string[] = ['tenant_id = $1']

  if (typeof params.storeId === 'number') {
    values.push(params.storeId)
    filters.push(`store_id = $${values.length}`)
  }

  if (params.startDate) {
    values.push(params.startDate)
    filters.push(`sale_timestamp >= $${values.length}::timestamptz`)
  }

  if (params.endDate) {
    values.push(params.endDate)
    filters.push(`sale_timestamp <= $${values.length}::timestamptz`)
  }

  const sql = `
    SELECT
      product_id,
      SUM(quantity)::numeric AS total_quantity,
      SUM(amount)::numeric AS total_amount
    FROM sales
    WHERE ${filters.join(' AND ')}
    GROUP BY product_id
    ORDER BY total_quantity DESC
    LIMIT 1
  `

  const result = await query(sql, values)

  if (result.rows.length === 0) {
    return null
  }

  return {
    productId: Number(result.rows[0].product_id),
    totalQuantity: Number(result.rows[0].total_quantity),
    totalAmount: Number(result.rows[0].total_amount),
  }
}

export async function fetchTimeSeries(params: {
  tenantId: number
  storeId: number
  productId: number
  lookbackDays?: number
}) {
  const lookbackDays = params.lookbackDays ?? 90

  const sql = `
    SELECT
      DATE_TRUNC('day', sale_timestamp)::date AS sale_day,
      SUM(quantity)::numeric AS quantity
    FROM sales
    WHERE tenant_id = $1
      AND store_id = $2
      AND product_id = $3
      AND sale_timestamp >= NOW() - ($4 || ' days')::interval
    GROUP BY sale_day
    ORDER BY sale_day ASC
  `

  const result = await query(sql, [params.tenantId, params.storeId, params.productId, lookbackDays])

  return result.rows.map((row: any) => ({
    date: row.sale_day,
    quantity: Number(row.quantity),
  })) as TimeSeriesPoint[]
}
