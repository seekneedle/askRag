addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Configure your backend API URL from environment variable
  const BACKEND_URL = 'http://8.152.213.191:8471'

  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, access-control-allow-origin, X-Requested-With',
    'Access-Control-Max-Age': '86400',
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
    const backendUrl = new URL(url.pathname, BACKEND_URL)
    
    // Create new headers
    const newHeaders = new Headers()
    for (const [key, value] of request.headers) {
      // Skip host header
      if (key.toLowerCase() === 'host') continue
      newHeaders.set(key, value)
    }
    
    // Add custom headers if needed
    newHeaders.set('Host', new URL(BACKEND_URL).host)
    
    const backendRequest = new Request(backendUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: 'follow'
    })

    const response = await fetch(backendRequest)
    
    // Create response headers
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
    return new Response(JSON.stringify({ error: 'Proxy error', details: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}
