addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Configure your backend API URL
  const BACKEND_URL = 'http://8.152.213.191:8471'

  // Clone the request headers
  const headers = new Headers(request.headers)
  
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  try {
    // Forward the request to your backend
    const url = new URL(request.url)
    const backendRequest = new Request(BACKEND_URL + url.pathname, {
      method: request.method,
      headers: headers,
      body: request.body
    })

    const response = await fetch(backendRequest)
    
    // Clone the response and add CORS headers
    const responseHeaders = new Headers(response.headers)
    Object.keys(corsHeaders).forEach(key => {
      responseHeaders.set(key, corsHeaders[key])
    })

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}
