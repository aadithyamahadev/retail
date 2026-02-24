import { sendImageToVisionAPI } from '../../../server/services/aiService'
import { insertSales } from '../../../server/services/salesService'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return Response.json(
        { success: false, error: 'Expected an image file in form field "file".' },
        { status: 400 },
      )
    }

    if (!file.type?.startsWith('image/')) {
      return Response.json(
        { success: false, error: 'Only image uploads are supported.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { success: false, error: 'Image file exceeds 10MB limit.' },
        { status: 400 },
      )
    }

    const extractedRows = await sendImageToVisionAPI({
      imageBuffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    })

    if (extractedRows.length === 0) {
      return Response.json(
        { success: false, error: 'No sales rows could be extracted from the image.' },
        { status: 422 },
      )
    }

    const insertResult = await insertSales(extractedRows, true)

    return Response.json(
      {
        success: true,
        insertedRows: insertResult.insertedRows,
        insertedIds: insertResult.insertedIds,
        parsedData: extractedRows,
      },
      { status: 201 },
    )
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected server error.',
      },
      { status: 500 },
    )
  }
}
