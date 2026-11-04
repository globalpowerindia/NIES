import { describe, expect, it } from 'vitest'

import { deviceOf, isBot, productSlugOf, sourceOf } from './traffic-rules'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const ANDROID_PHONE = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'

describe('deviceOf', () => {
  it('tells phones, tablets and desktops apart', () => {
    expect(deviceOf(IPHONE)).toBe('phone')
    expect(deviceOf(ANDROID_PHONE)).toBe('phone')
    expect(deviceOf(ANDROID_TABLET)).toBe('tablet')
    expect(deviceOf(DESKTOP)).toBe('desktop')
  })
})

describe('isBot', () => {
  it('skips crawlers, headless browsers and empty user agents', () => {
    expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBot('Mozilla/5.0 HeadlessChrome/130.0')).toBe(true)
    expect(isBot('')).toBe(true)
  })

  it('keeps real browsers', () => {
    expect(isBot(IPHONE)).toBe(false)
    expect(isBot(DESKTOP)).toBe(false)
  })
})

describe('sourceOf', () => {
  const source = (referrer: string, utm = '') => sourceOf(referrer, utm, 'www.shop.test')

  it('names the sites a shop cares about, whatever the subdomain or country', () => {
    expect(source('https://www.google.co.in/')).toBe('Google')
    expect(source('https://l.instagram.com/?u=x')).toBe('Instagram')
    expect(source('https://wa.me/123')).toBe('WhatsApp')
    expect(source('https://youtu.be/abc')).toBe('YouTube')
  })

  it('shows any other site by its host', () => {
    expect(source('https://www.toolsforum.in/thread/1')).toBe('toolsforum.in')
  })

  it('treats no referrer, a bad one and the shop itself as direct', () => {
    expect(source('')).toBe('Direct')
    expect(source('not a url')).toBe('Direct')
    expect(source('https://shop.test/cart')).toBe('Direct')
  })

  it('lets a campaign tag win over the referrer', () => {
    expect(source('https://www.google.com/', 'newsletter')).toBe('newsletter')
    expect(source('https://www.google.com/', 'Facebook')).toBe('Facebook')
  })
})

describe('productSlugOf', () => {
  it('finds the slug on a product page only', () => {
    expect(productSlugOf('/products/hammer-drill')).toBe('hammer-drill')
    expect(productSlugOf('/products')).toBeNull()
    expect(productSlugOf('/products/hammer-drill/extra')).toBeNull()
    expect(productSlugOf('/cart')).toBeNull()
  })
})
