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
        }

        // For TypeScript/JSX files, Bun needs to transpile them to JavaScript
        if (ext === '.tsx' || ext === '.ts' || ext === '.jsx') {
          try {
            // Use Bun's transpiler to convert TypeScript to JavaScript
            const result = await Bun.build({
              entrypoints: [filePath],
              outdir: undefined, // Don't write to disk
              target: 'browser',
              format: 'esm',
              minify: false,
            })

            if (result.success && result.outputs.length > 0) {
              const transpiled = await result.outputs[0].text()
              return new Response(transpiled, {
                headers: {
                  'Content-Type': 'application/javascript',
                },
              })
            }
          } catch (error) {
            console.error(`Error transpiling ${filePath}:`, error)
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

console.log(`🚀 Dev server running at http://localhost:${PORT}`)
console.log('📝 Hot reload enabled')
