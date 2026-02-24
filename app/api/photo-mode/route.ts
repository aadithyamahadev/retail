import { sendImageToVisionAPI } from '../../../server/services/aiService'
import { insertSales } from '../../../server/services/salesService'
import { assertImageFile, assertSameOrigin } from '../../../server/security/requestGuards'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return Response.json(
        { success: false, error: 'Expected an image file in form field "file".' },
        { status: 400 },
      )
    }

    assertImageFile(file, MAX_FILE_SIZE_BYTES)

    const parsedRows = await sendImageToVisionAPI({
      imageBuffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
    })

    if (parsedRows.length === 0) {
      return Response.json(
        { success: false, error: 'No sales rows could be extracted from the image.' },
        { status: 422 },
      )
    }

    const insertResult = await insertSales(parsedRows, true)

    return Response.json(
      {
        success: true,
        insertedRows: insertResult.insertedRows,
        insertedIds: insertResult.insertedIds,
        parsedData: parsedRows,
      },
      { status: 201 },
    )
  } catch (error: unknown) {
    const statusCode = error instanceof Error && error.message.includes('Cross-origin') ? 403 : 500
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected server error.',
      },
      { status: statusCode },
    )
  }
}
