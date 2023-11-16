import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

const schema = z.object({
    id: z.string(),
    email: z.string().optional(),
    description: z.string(),
})

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST supported' })
    }

    const body = schema.safeParse(req.body)
    if (!body.success) {
        return res
            .status(400)
            .send({ error: body.error.flatten().formErrors.join(', ') })
    }

    try {
        const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID
        const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
        const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY
        const spreadsheetId = process.env.GOOGLE_SHEETS_SHEET_ID
        if (!clientId || !clientEmail || !privateKey || !spreadsheetId) {
            throw new Error(
                'Server incorrectly configured for bug report submission',
            )
        }

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_id: clientId,
                client_email: clientEmail,
                private_key: privateKey.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        })
        const sheets = google.sheets('v4')
        const sheetsRes = await sheets.spreadsheets.values.append({
            auth,
            spreadsheetId,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            range: 'Sheet1!A:A',
            requestBody: {
                majorDimension: 'ROWS',
                values: [
                    [
                        body.data.id,
                        new Date().toUTCString(),
                        body.data.email,
                        body.data.description,
                    ],
                ],
            },
        })
        res.status(200).json(sheetsRes.data)
    } catch (err) {
        res.status(500).json({
            error: (err as Error).message || (err as object).toString(),
        })
    }
}
