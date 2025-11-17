/**
 * Test Builders
 *
 * Fluent API for building test requests and data structures.
 * Simple builder pattern (not complex class hierarchy).
 */

/**
 * Request builder for creating test requests
 */
export class RequestBuilder {
  private httpMethod = 'GET'
  private requestPath = '/'
  private requestBody?: unknown
  private headers: Record<string, string> = {}

  /**
   * Set HTTP method
   */
  method(method: string): this {
    this.httpMethod = method
    return this
  }

  /**
   * Set request path
   */
  path(path: string): this {
    this.requestPath = path
    return this
  }

  /**
   * Set request body
   */
  body(body: unknown): this {
    this.requestBody = body
    return this
  }

  /**
   * Set request header
   */
  header(key: string, value: string): this {
    this.headers[key] = value
    return this
  }

  /**
   * Set Content-Type header
   */
  contentType(type: string): this {
    return this.header('Content-Type', type)
  }

  /**
   * Set JSON body and Content-Type
   */
  json(body: unknown): this {
    this.requestBody = body
    return this.contentType('application/json')
  }

  /**
   * Build Request object
   */
  build(baseUrl = 'http://localhost'): Request {
    return new Request(`${baseUrl}${this.requestPath}`, {
      method: this.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: this.requestBody ? JSON.stringify(this.requestBody) : undefined,
    })
  }
}

/**
 * Create a new request builder
 */
export function requestBuilder(): RequestBuilder {
  return new RequestBuilder()
}

/**
 * Convenience functions for common request patterns
 */
export const testRequests = {
  /**
   * Create POST request to intake endpoint
   */
  intake: (body: { message: string; conversationHistory?: string[] }): Request => {
    return requestBuilder().method('POST').path('/api/intake').json(body).build()
  },

  /**
   * Create POST request to prefill generation endpoint
   */
  prefill: (body: unknown): Request => {
    return requestBuilder().method('POST').path('/api/prefill').json(body).build()
  },

  /**
   * Create GET request to health endpoint
   */
  health: (): Request => {
    return requestBuilder().method('GET').path('/api/health').build()
  },

  /**
   * Create GET request to carriers endpoint
   */
  carriers: (): Request => {
    return requestBuilder().method('GET').path('/api/carriers').build()
  },

  /**
   * Create GET request to states endpoint
   */
  states: (): Request => {
    return requestBuilder().method('GET').path('/api/states').build()
  },
}
