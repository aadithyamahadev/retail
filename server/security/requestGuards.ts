const ALLOWED_CSV_MIME_TYPES = new Set(['text/csv', 'application/vnd.ms-excel'])

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') ?? 'https'

  if (!origin || !host) {
    throw new Error('Request origin could not be verified.')
  }

  const expectedOrigin = `${proto}://${host}`
  if (origin !== expectedOrigin) {
    throw new Error('Cross-origin requests are not allowed.')
  }
}

export function assertCsvFile(file: File, maxSizeBytes: number) {
  if (file.size > maxSizeBytes) {
    throw new Error(`CSV file exceeds ${Math.floor(maxSizeBytes / (1024 * 1024))}MB limit.`)
  }

  if (file.type && !ALLOWED_CSV_MIME_TYPES.has(file.type)) {
    throw new Error('Invalid CSV file type.')
  }
}

export function assertImageFile(file: File, maxSizeBytes: number) {
  if (!file.type?.startsWith('image/')) {
    throw new Error('Only image uploads are supported.')
  }

  if (file.size > maxSizeBytes) {
    throw new Error(`Image file exceeds ${Math.floor(maxSizeBytes / (1024 * 1024))}MB limit.`)
  }
}

export function clampLookbackDays(value: number, min = 7, max = 365) {
  if (value < min || value > max) {
    throw new Error(`lookbackDays must be between ${min} and ${max}.`)
  }

  return value
}
