import { describe, expect, it } from 'vitest'

import { isSafeLinkUrl } from './link'

describe('custom link URLs', () => {
  it('accepts site paths and https addresses', () => {
    for (const url of ['/catalogue', '/category/drills?sort=price', 'https://wa.me/919876543210', ' /offers ']) {
      expect([url, isSafeLinkUrl(url)]).toEqual([url, true])
    }
  })

  it('refuses script, data, plain http and other-host tricks', () => {
    for (const url of ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<script>', 'http://example.com', '//evil.com', '/\\evil.com', 'java\tscript:alert(1)', 'catalogue', '']) {
      expect([url, isSafeLinkUrl(url)]).toEqual([url, false])
    }
  })
})
