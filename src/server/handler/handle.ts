import setCors from '../net/setCors.js'
import { startCommand } from './commands.js'

export interface Req {
  request: Request
  headers: Headers
  url: URL
  method: string
  query: URLSearchParams
}

export interface Post<T> extends Req {
  body: T
}

async function createRequest(request: Request): Promise<Req> {
  const req: Req = {
    request,
    headers: request.headers,
    url: new URL(request.url),
    method: request.method,
    query: request.url.includes('?')
      ? new URLSearchParams(request.url.split('?')[1])
      : new URLSearchParams(),
  };

  if ((request.method === 'POST' || request.method === 'PUT') && request.headers.get('Content-Type')?.includes('application/json')) {
    try {
      // Check if there's content to be read
      if (request.headers.get('Content-Length') !== '0') {
        const body = await request.json(); // Assuming the body is JSON
        (req as Post<typeof body>).body = body;
      }
    } catch (error) {
      console.error('Error parsing request body:', error);
      // You may decide how to handle this error.
      // For example, you could set the body to null or an empty object,
      // or throw an error if a valid JSON body is critical for your application.
      (req as Post<null>).body = null;
    }
  }

  return req;
}


function handleResponse(req: Req, response: Response | any): Response {
  if (!(response instanceof Response)) {
    if (typeof response === 'string') {
      response = new Response(response, { status: 200 })
    } else if (typeof response === 'object') {
      response = new Response(JSON.stringify(response), { status: 200 })
    } else if (typeof response === 'number') {
      response = new Response(response.toString(), { status: 200 })
    } else {
      response = new Response(null, { status: 204 })
    }
  }

  const origin = req.headers.get('Origin')
  response.headers.set('Access-Control-Allow-Origin', origin || '*')
  response.headers.set('Access-Control-Allow-Credentials', 'true')

  return response
}

/**
 * Handles incoming requests.
 * 1. Check CORS
 * 2. Load command
 * 3. Execute command
 * 4. Handles errors
 */
export async function handleRequest(request: Request) {
  try {
    const req = await createRequest(request)

    const corsResponse = setCors(req)
    if (corsResponse) return corsResponse

    const response = await startCommand(req)
    return handleResponse(req, response)
  } catch (e: unknown) {
    console.error('handleRequest', e)
    return new Response('Internal Server Error', { status: 500 })
  }
}
