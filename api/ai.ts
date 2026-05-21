/**
 * Vercel API Route: /api/ai
 * Proxies requests to Anthropic, keeping the API key server-side.
 *
 * Fix: removed Edge Runtime — Edge has a 4MB body limit which breaks
 * image uploads. Node.js runtime supports up to 4.5MB and handles
 * larger base64 payloads correctly.
 */

export const config = {
  runtime: 'nodejs', // NOT edge — edge has 4MB body limit, breaks image uploads
  api: {
    bodyParser: {
      sizeLimit: '10mb', // allow large base64 images from mobile cameras
    },
  },
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const { system, messages, max_tokens = 1000 } = body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens,
        system,
        messages,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return new Response(JSON.stringify({ error: error.error?.message ?? 'Anthropic API error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
