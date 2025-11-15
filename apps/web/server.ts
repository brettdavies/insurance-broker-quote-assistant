import { readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { serve } from 'bun'

const PORT = process.env.FRONTEND_PORT ? Number.parseInt(process.env.FRONTEND_PORT, 10) : 3000

// Process CSS files through PostCSS/Tailwind
async function processCSS(filePath: string): Promise<string> {
  try {
    const postcss = await import('postcss')
    const tailwindcss = await import('tailwindcss')
    const autoprefixer = await import('autoprefixer')

    const css = readFileSync(filePath, 'utf-8')
    const result = await postcss.default([tailwindcss.default, autoprefixer.default]).process(css, {
      from: filePath,
    })

    return result.css
  } catch (error) {
    // CSS processing errors in dev server - log to console for visibility
    // biome-ignore lint/suspicious/noConsole: Dev server error handling
    console.error('Error processing CSS:', error)
    // Fallback to raw CSS if processing fails
    return readFileSync(filePath, 'utf-8')
  }
}

serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    const pathname = url.pathname

    // Proxy API requests to backend server (port 7070)
    if (pathname.startsWith('/api/')) {
      const apiUrl = `http://localhost:7070${pathname}${url.search}`
      try {
        const apiResponse = await fetch(apiUrl, {
          method: req.method,
          headers: req.headers,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined,
        })
        return apiResponse
      } catch (error) {
        // Proxy errors in dev server - log to console for visibility
        // biome-ignore lint/suspicious/noConsole: Dev server error handling
        console.error(`Proxy error for ${pathname}:`, error)
        return new Response(
          JSON.stringify({
            error: {
              code: 'PROXY_ERROR',
              message: `Failed to proxy request to backend: ${error instanceof Error ? error.message : String(error)}`,
            },
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      }
    }

    // Serve index.html for root and all routes (SPA routing)
    if (pathname === '/' || pathname === '/index.html') {
      const html = readFileSync(join(import.meta.dir, 'index.html'), 'utf-8')
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    // Serve static files (JS, CSS, etc.)
    try {
      const filePath = join(import.meta.dir, pathname)
      const file = Bun.file(filePath)

      // NEVER serve test files - they should not be loaded in the browser
      if (pathname.includes('.test.') || pathname.includes('/__tests__/')) {
        return new Response('Not Found', { status: 404 })
      }

      if (await file.exists()) {
        const ext = extname(pathname)

        // Process CSS files through Tailwind/PostCSS
        if (ext === '.css') {
          const processedCSS = await processCSS(filePath)
          return new Response(processedCSS, {
            headers: {
              'Content-Type': 'text/css',
            },
          })
        }

        // Set proper content types
        const contentType: Record<string, string> = {
          '.js': 'application/javascript',
          '.ts': 'application/typescript',
          '.tsx': 'application/typescript',
          '.jsx': 'application/javascript',
          '.json': 'application/json',
          '.html': 'text/html',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
        }

        // For TypeScript/JSX files, bundle everything (including npm dependencies)
        // This allows the browser to load a single bundled file
        if (ext === '.tsx' || ext === '.ts' || ext === '.jsx') {
          try {
            // Bundle everything - npm dependencies and relative imports
            const result = await Bun.build({
              entrypoints: [filePath],
              outdir: undefined,
              target: 'browser',
              format: 'esm',
              minify: false,
              // Externalize bun:test - test utilities can't be bundled for browser
              external: ['bun:test'],
              // Plugin to completely skip test files during bundling
              plugins: [
                {
                  name: 'skip-test-files',
                  setup(build) {
                    build.onResolve({ filter: /\.test\.(ts|tsx|js|jsx)$/ }, () => ({
                      path: 'data:text/javascript,export {}',
                      external: true,
                    }))
                    build.onResolve({ filter: /__tests__/ }, () => ({
                      path: 'data:text/javascript,export {}',
                      external: true,
                    }))
                  },
                },
              ],
              // Don't externalize other dependencies - bundle all npm packages
              // This ensures npm packages are included in the bundle
            })

            if (result.success && result.outputs.length > 0) {
              const transpiled = await result.outputs[0].text()
              return new Response(transpiled, {
                headers: {
                  'Content-Type': 'application/javascript',
                },
              })
            }
            // Log detailed errors
            const errors = result.logs.filter((log) => log.level === 'error')
            // biome-ignore lint/suspicious/noConsole: Dev server build error logging
            console.error(`Build failed for ${filePath}:`)
            for (const log of errors) {
              // biome-ignore lint/suspicious/noConsole: Dev server build error logging
              console.error(`  ${log.message}`)
            }

            return new Response(`Build failed: ${errors.map((e) => e.message).join('; ')}`, {
              status: 500,
              headers: {
                'Content-Type': 'text/plain',
              },
            })
          } catch (error) {
            // Transpilation errors in dev server - log to console for visibility
            // biome-ignore lint/suspicious/noConsole: Dev server error handling
            console.error(`Error transpiling ${filePath}:`, error)
            return new Response(
              `Transpilation error: ${error instanceof Error ? error.message : String(error)}`,
              {
                status: 500,
                headers: {
                  'Content-Type': 'text/plain',
                },
              }
            )
          }
        }

        return new Response(file, {
          headers: {
            'Content-Type': contentType[ext] || 'application/octet-stream',
          },
        })
      }
    } catch (error) {
      // File not found, continue to 404
    }

    // For SPA routing, serve index.html for all other routes
    if (!pathname.includes('.')) {
      const html = readFileSync(join(import.meta.dir, 'index.html'), 'utf-8')
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    return new Response('Not Found', { status: 404 })
  },
})

// Dev server startup messages - using console for dev server visibility
// These are informational messages for developers, not application logs
// biome-ignore lint/suspicious/noConsole: Dev server startup messages
console.log(`🚀 Dev server running at http://localhost:${PORT}`)
// biome-ignore lint/suspicious/noConsole: Dev server startup messages
console.log('📝 Hot reload enabled')
