import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Vercel Serverless Function: /api/ai
 *
 * Uses @vercel/node (not Edge) with maxDuration: 30s — enough for Claude Sonnet.
 * Body size up to 10MB to handle base64-encoded images from mobile cameras.
 *
 * Set ANTHROPIC_API_KEY in Vercel project environment variables.
 */

export const config = {
  maxDuration: 30,        // seconds — Vercel Hobby plan supports up to 60s
  api: {
    bodyParser: {
      sizeLimit: '10mb',  // base64 images after client resize are ~200KB, but give headroom
    },
  },
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel environment variables' })
  }

  try {
    const { system, messages, max_tokens = 1000 } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens,
        system,
        messages,
      }),
    })

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } }
      return res.status(response.status).json({
        error: error?.error?.message ?? `Anthropic API error (${response.status})`,
      })
    }

    const data = await response.json()
    return res.status(200).json(data)

  } catch (e) {
    console.error('[BeHealth /api/ai]', e)
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Internal server error',
    })
  }
}
