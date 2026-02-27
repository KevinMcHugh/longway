const DEFAULT_URL = 'http://127.0.0.1:4173'
const DEFAULT_OUTPUT = '../tmp/frontend.png'
const DEFAULT_WIDTH = 1440
const DEFAULT_HEIGHT = 900
const DEFAULT_TIMEOUT = 20000

export function parseArgs(argv) {
  const options = {
    url: DEFAULT_URL,
    out: DEFAULT_OUTPUT,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    timeout: DEFAULT_TIMEOUT,
    fullPage: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help') {
      options.help = true
    } else if (arg === '--full-page') {
      options.fullPage = true
    } else if (arg === '--url') {
      options.url = argv[++i]
    } else if (arg === '--out') {
      options.out = argv[++i]
    } else if (arg === '--width') {
      options.width = Number(argv[++i])
    } else if (arg === '--height') {
      options.height = Number(argv[++i])
    } else if (arg === '--timeout') {
      options.timeout = Number(argv[++i])
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (!options.url || !options.out) {
    throw new Error('--url and --out values must be non-empty')
  }
  if (!Number.isFinite(options.width) || options.width <= 0) {
    throw new Error('--width must be a positive number')
  }
  if (!Number.isFinite(options.height) || options.height <= 0) {
    throw new Error('--height must be a positive number')
  }
  if (!Number.isFinite(options.timeout) || options.timeout <= 0) {
    throw new Error('--timeout must be a positive number')
  }

  return options
}

export const defaults = {
  url: DEFAULT_URL,
  out: DEFAULT_OUTPUT,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  timeout: DEFAULT_TIMEOUT,
}
