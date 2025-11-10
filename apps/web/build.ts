import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'bun'

async function processCSS() {
  try {
    const postcss = await import('postcss')
    const tailwindcss = await import('tailwindcss')
    const autoprefixer = await import('autoprefixer')

    const cssPath = join(import.meta.dir, 'src', 'index.css')
    const css = readFileSync(cssPath, 'utf-8')

    const result = await postcss.default([tailwindcss.default, autoprefixer.default]).process(css, {
      from: cssPath,
    })

    // Write processed CSS to a temp file that Bun can bundle
    const processedPath = join(import.meta.dir, 'src', 'index.processed.css')
    writeFileSync(processedPath, result.css)

    return processedPath
  } catch (error) {
    console.error('Error processing CSS:', error)
    throw error
  }
}

async function buildApp() {
  // Process CSS first
  const processedCSSPath = await processCSS()

  const mainPath = join(import.meta.dir, 'src', 'main.tsx')
  let originalMainContent = ''

  try {
    // Temporarily update main.tsx to import processed CSS
    originalMainContent = readFileSync(mainPath, 'utf-8')
    const updatedMain = originalMainContent.replace(
      "import './index.css'",
      "import './index.processed.css'"
    )
    writeFileSync(mainPath, updatedMain)

    // Build with Bun
    const result = await build({
      entrypoints: [mainPath],
      outdir: join(import.meta.dir, 'dist'),
      target: 'browser',
      format: 'esm',
      minify: false,
    })

    if (!result.success) {
      console.error('Build failed:', result.logs)
      process.exit(1)
    }

    console.log('✅ Build complete')
  } catch (error) {
    console.error('Build error:', error)
    process.exit(1)
  } finally {
    // Always restore original main.tsx and clean up processed CSS
    try {
      if (originalMainContent) {
        writeFileSync(mainPath, originalMainContent)
      }
      unlinkSync(processedCSSPath)
    } catch {
      // Ignore cleanup errors
    }
  }
}

buildApp()
