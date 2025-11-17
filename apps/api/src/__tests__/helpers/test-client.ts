/**
 * Test Client
 *
 * Abstraction for making API requests in tests.
 * Eliminates duplication of `new Request()` pattern.
 */

import type { Hono } from 'hono'

/**
 * Test client for making API requests
 */
export class TestClient {
  constructor(
    private app: Hono,
    private baseUrl = 'http://localhost'
  ) {}

  /**
   * Make a POST request
   */
  async post(path: string, body?: unknown, headers?: Record<string, string>): Promise<Response> {
    return this.request('POST', path, body, headers)
  }

  /**
   * Make a GET request
   */
  async get(path: string, headers?: Record<string, string>): Promise<Response> {
    return this.request('GET', path, undefined, headers)
  }

  /**
   * Make a PUT request
   */
  async put(path: string, body?: unknown, headers?: Record<string, string>): Promise<Response> {
    return this.request('PUT', path, body, headers)
  }

  /**
   * Make a DELETE request
   */
  async delete(path: string, headers?: Record<string, string>): Promise<Response> {
    return this.request('DELETE', path, undefined, headers)
  }

  /**
   * Make a request and parse JSON response
   */
  async postJson<T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.post(path, body, headers)
    return (await response.json()) as T
  }

  /**
   * Make a request and parse JSON response
   */
  async getJson<T = unknown>(path: string, headers?: Record<string, string>): Promise<T> {
    const response = await this.get(path, headers)
    return (await response.json()) as T
  }

  /**
   * Internal request method
   */
  private async request(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<Response> {
    const url = `${this.baseUrl}${path}`
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    const request = new Request(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.app.request(request)
  }
}
