import { describe, expect, it } from 'vitest'

import { DEFAULT_PER_PAGE, parseListingParams, rawParamsOf } from './listing-params'

const parse = (query: string) => parseListingParams(rawParamsOf(new URLSearchParams(query)))

describe('parseListingParams', () => {
  it('keeps a spec value that contains a comma whole', () => {
    const query = new URLSearchParams()
    query.append('spec.pwPowerSource', 'Electric, 220V single phase')
    query.append('spec.pwPowerSource', 'Electric, 415V three phase')
    expect(parse(query.toString()).specs).toEqual({
      pwPowerSource: ['Electric, 220V single phase', 'Electric, 415V three phase'],
    })
  })

  it('still reads comma-separated brands and sub-categories', () => {
    const params = parse('brand=hcc,eastman&sub=drills')
    expect(params.brands).toEqual(['hcc', 'eastman'])
    expect(params.sub).toEqual(['drills'])
  })

  it('defaults to 20 per page and accepts only the offered sizes', () => {
    expect(DEFAULT_PER_PAGE).toBe(20)
    expect(parse('').perPage).toBe(20)
    expect(parse('perPage=40').perPage).toBe(40)
    expect(parse('perPage=60').perPage).toBe(60)
    expect(parse('perPage=5000').perPage).toBe(20)
    expect(parse('perPage=abc').perPage).toBe(20)
  })
})
