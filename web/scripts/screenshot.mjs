import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { defaults, parseArgs } from './screenshot-options.mjs'

function printUsage() {
  console.log(
    [
      'Usage: npm run screenshot -- [options]',
      '',
      'Options:',
      `  --url <url>         Page URL to capture (default: ${defaults.url})`,
      `  --out <path>        Output PNG path relative to web/ (default: ${defaults.out})`,
      `  --width <px>        Viewport width (default: ${defaults.width})`,
      `  --height <px>       Viewport height (default: ${defaults.height})`,
      `  --timeout <ms>      Navigation timeout in milliseconds (default: ${defaults.timeout})`,
      '  --full-page         Capture full scrollable page',
      '  --help              Show this help',
    ].join('\n'),
  )
}

async function capture(options) {
  let playwright
  try {
    playwright = await import('playwright')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Playwright is required for screenshots.\nInstall it with: cd web && npm install -D playwright\nOriginal error: ${message}`,
    )
  }

  const browser = await playwright.chromium.launch({ headless: true })
  try {
    const page = await browser.newPage({
      viewport: { width: options.width, height: options.height },
    })
    await page.goto(options.url, {
      waitUntil: 'networkidle',
      timeout: options.timeout,
    })

    const outputPath = path.resolve(process.cwd(), options.out)
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await page.screenshot({ path: outputPath, fullPage: options.fullPage })
    console.log(`Saved screenshot: ${outputPath}`)
  } finally {
    await browser.close()
  }
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2))
    if (options.help) {
      printUsage()
      return
    }
    await capture(options)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  }
}

await main()
