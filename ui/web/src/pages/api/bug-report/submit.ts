/* eslint-disable no-console */
import { Client as NotionClient } from '@notionhq/client'
import { google } from 'googleapis'
import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

const schema = z.object({
    id: z.string(),
    description: z.string(),
    email: z.string().optional(),
    federationName: z.string().optional(),
    username: z.string().optional(),
    metadata: z
        .object({
            platform: z.string(),
            version: z.string(), // App version / Commit Hash
        })
        .optional(),
})

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    // CORS header
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Only POST supported' })
    }

    const body = schema.safeParse(req.body)
    if (!body.success) {
        return res.status(400).send({
            error: body.error.issues
                .map(issue => `${issue.path[0]}: ${issue.message}`)
                .join(', '),
        })
    }

    try {
        const results = await Promise.allSettled([
            appendToGoogleSheet(body.data),
            appendToNotion(body.data),
        ])
        let anySucceeded = false
        results.forEach(result => {
            if (result.status === 'rejected') {
                console.error('Bug report failed to save', result.reason)
            } else {
                anySucceeded = true
            }
        })
        if (!anySucceeded) {
            throw new Error('Bug report failed to save')
        }

        const [sheets, notion] = results
        // Post to slack after responding, but don't throw if it fails.
        try {
            await postToSlack(
                body.data,
                notion.status === 'fulfilled' && 'url' in notion.value
                    ? notion.value.url
                    : '',
            )
        } catch (err) {
            console.warn('Failed to post to Slack', err)
        }

        res.status(200).json({
            sheets: sheets.status === 'fulfilled',
            notion: notion.status === 'fulfilled',
        })
    } catch (err) {
        res.status(500).json({
            error: (err as Error).message || (err as object).toString(),
        })
    }
}

async function appendToGoogleSheet(data: z.infer<typeof schema>) {
    const clientId = process.env.GOOGLE_SHEETS_CLIENT_ID
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY
    const spreadsheetId = process.env.GOOGLE_SHEETS_SHEET_ID
    if (!clientId || !clientEmail || !privateKey || !spreadsheetId) {
        console.error(
            'Missing required environment variable for sheets append',
            {
                GOOGLE_SHEETS_CLIENT_ID: !!clientId,
                GOOGLE_SHEETS_CLIENT_EMAIL: !!clientEmail,
                GOOGLE_SHEETS_PRIVATE_KEY: !!privateKey,
                GOOGLE_SHEETS_SHEET_ID: !!spreadsheetId,
            },
        )
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
                    data.id,
                    new Date().toUTCString(),
                    data.federationName,
                    data.username,
                    data.email,
                    data.description,
                    makeLogsS3Url(data.id),
                ],
            ],
        },
    })
    return sheetsRes.data
}

async function appendToNotion(data: z.infer<typeof schema>) {
    const auth = process.env.NOTION_SECRET_KEY
    const databaseId = process.env.NOTION_DATABASE_ID

    if (!auth || !databaseId) {
        console.error(
            'Missing required environment variable for notion append',
            {
                NOTION_SECRET_KEY: !!auth,
                NOTION_DATABASE_ID: !!databaseId,
            },
        )
        throw new Error(
            'Server incorrectly configured for bug report submission',
        )
    }

    const client = new NotionClient({ auth })

    const res = await client.pages.create({
        parent: {
            database_id: databaseId,
        },
        properties: {
            Title: {
                title: [
                    {
                        text: {
                            content: `Bug report ${data.id.split('-')[0]}`,
                        },
                    },
                ],
            },
            Date: {
                date: { start: new Date().toISOString() },
            },
            'Federation name': {
                rich_text: [
                    {
                        text: {
                            content: data.federationName || '',
                        },
                    },
                ],
            },
            Username: {
                rich_text: [
                    {
                        text: {
                            content: data.username || '',
                        },
                    },
                ],
            },
            Email: {
                email: data.email || null,
            },
            'Report ID': {
                rich_text: [
                    {
                        text: {
                            content: data.id,
                        },
                    },
                ],
            },
            'Logs S3 URL': {
                url: makeLogsS3Url(data.id) || null,
            },
            Platform: {
                rich_text: [
                    {
                        text: {
                            content: data.metadata?.platform ?? '',
                        },
                    },
                ],
            },
            Version: {
                rich_text: [
                    {
                        text: {
                            content: data.metadata?.version ?? '',
                        },
                    },
                ],
            },
        },
        children: [
            {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [
                        {
                            text: {
                                content: 'Description from user (do not edit)',
                            },
                        },
                    ],
                },
            },
            {
                object: 'block',
                type: 'quote',
                quote: {
                    rich_text: [
                        {
                            text: {
                                content: data.description,
                            },
                        },
                    ],
                },
            },
            {
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [
                        {
                            text: {
                                content: 'Internal notes',
                            },
                        },
                    ],
                },
            },
            {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [
                        {
                            text: {
                                content: 'Add notes here',
                            },
                            annotations: {
                                italic: true,
                                color: 'gray',
                            },
                        },
                    ],
                },
            },
        ],
    })

    return res
}

async function postToSlack(data: z.infer<typeof schema>, notionUrl: string) {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!slackWebhookUrl) {
        console.error(
            'Missing required environment variable for Slack post: SLACK_WEBHOOK_URL',
        )
        throw new Error(
            'Server incorrectly configured for bug report submission',
        )
    }

    const fields = [
        {
            label: 'Username',
            value: data.username || '_N/A_',
        },
        {
            label: 'Federation name',
            value: data.federationName || '_N/A_',
        },
        {
            label: 'Email',
            value: data.email || '_N/A_',
        },
        {
            label: 'Report ID',
            value: '`' + data.id + '`',
        },
        {
            label: 'Platform',
            value: data.metadata?.platform || 'unknown',
        },
        {
            label: 'Version',
            value: data.metadata?.version || 'unknown',
        },
        {
            label: "User's description",
            value: `\n> ${data.description}`, // Placed in block below.
        },
    ]

    const s3Url = makeLogsS3Url(data.id)
    const blocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: 'A new bug report has been submitted.',
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: fields
                    .map(({ label, value }) => `*${label}:* ${value}`)
                    .join('\n'),
            },
        },
        {
            type: 'actions',
            elements: [
                notionUrl && {
                    type: 'button',
                    style: 'primary',
                    url: notionUrl,
                    text: {
                        type: 'plain_text',
                        emoji: true,
                        text: ':globe_with_meridians: View in Notion',
                    },
                },
                s3Url && {
                    type: 'button',
                    url: s3Url,
                    text: {
                        type: 'plain_text',
                        emoji: true,
                        text: ':package: Download logs',
                    },
                },
            ].filter(el => !!el),
        },
    ]

    await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: 'A new bug report has been submitted.',
            blocks,
        }),
    })
}

function makeLogsS3Url(id: string) {
    const region = process.env.AWS_REGION
    const bucket = process.env.AWS_BUG_REPORT_BUCKET_NAME
    if (!region || !bucket) {
        console.warn('Unable to make S3 URL, missing region or bucket name')
        return ''
    }
    return `https://s3.console.aws.amazon.com/s3/object/${bucket}?region=${region}&prefix=${id}.tar.gz`
}
