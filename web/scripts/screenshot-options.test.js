import { describe, expect, it } from 'vitest'
import { defaults, parseArgs } from './screenshot-options.mjs'

describe('parseArgs', () => {
  it('returns defaults for empty args', () => {
    expect(parseArgs([])).toEqual({
      url: defaults.url,
      out: defaults.out,
      width: defaults.width,
      height: defaults.height,
      timeout: defaults.timeout,
      fullPage: false,
      help: false,
    })
  })

  it('parses user options', () => {
    expect(
      parseArgs([
        '--url',
        'http://localhost:9999',
        '--out',
        '../tmp/snap.png',
        '--width',
        '800',
        '--height',
        '600',
        '--timeout',
        '5000',
        '--full-page',
      ]),
    ).toEqual({
      url: 'http://localhost:9999',
      out: '../tmp/snap.png',
      width: 800,
      height: 600,
      timeout: 5000,
      fullPage: true,
      help: false,
    })
  })

  it('throws on invalid width', () => {
    expect(() => parseArgs(['--width', '0'])).toThrow(
      '--width must be a positive number',
    )
  })
})
