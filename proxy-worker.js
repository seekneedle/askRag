addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const BACKEND_URL = 'https://openspeech.bytedance.com'

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  // Only allow POST requests to the TTS endpoint
  if (request.method !== 'POST' || !request.url.includes('/api/v1/tts')) {
    return new Response('Not Found', { status: 404 })
  }

  try {
    // Extract the request body
    const requestBody = await request.json()

    // Prepare the fetch options
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;GmakIY6Um9DZgCQl7Rr0RJNfDukCJ8RB`,
        ...corsHeaders
      },
      body: JSON.stringify(requestBody)
    }

    // Fetch from the backend
    const response = await fetch(`${BACKEND_URL}/api/v1/tts`, fetchOptions)

    // Create a new response with CORS headers
    const responseBody = await response.arrayBuffer()
    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders
    })
  }
}
