addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const BACKEND_URL = 'http://tech.surewiser.com:8471'

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    })
  }

  try {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+/g, '/')
    const backendUrl = `${BACKEND_URL}${path}${url.search}`

    console.log('Attempting to fetch:', backendUrl)

    let requestBody = null
    if (request.body) {
      const bodyText = await request.text()
      requestBody = bodyText
      console.log('Request body:', requestBody)
    }

    // Use the exact same fetch options that worked locally
    const fetchOptions = {
      method: request.method,
      headers: {
        'Authorization': 'Basic bmVlZGxlOm5lZWRsZQ==',
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: requestBody,
      redirect: 'follow',
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
        scrapeShield: false,
        apps: false,
        resolveOverride: '8.152.213.191',
        noResolve: true,
        tlsVersion: "none"  // Allow HTTP
      }
    }

    console.log('Fetch options:', JSON.stringify(fetchOptions, null, 2))

    const response = await fetch(backendUrl, fetchOptions)
    console.log('Response status:', response.status)

    if (path.includes('stream_query')) {
      const { readable, writable } = new TransformStream()
      response.body.pipeTo(writable).catch(error => {
        console.error('Stream error:', error)
      })
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders
        }
      })
    }

    const responseBody = await response.text()
    console.log('Response body:', responseBody)

    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  } catch (error) {
    console.error('Worker error:', error)
    return new Response(JSON.stringify({
      error: 'Proxy error',
      message: error.message,
      stack: error.stack,
      url: BACKEND_URL
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
}
