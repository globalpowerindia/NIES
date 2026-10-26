import { describe, expect, it } from 'vitest'

import { parseCsv, toCsv } from './csv'

describe('parseCsv', () => {
  it('reads quoted cells, doubled quotes, CRLF and blank lines', () => {
    const text = '﻿sku,name\r\nA-1,"Drill, 13 mm"\r\n\r\nB-2,"The ""Pro"" kit"\n'
    expect(parseCsv(text)).toEqual([
      ['sku', 'name'],
      ['A-1', 'Drill, 13 mm'],
      ['B-2', 'The "Pro" kit'],
    ])
  })

  it('keeps line breaks inside a quoted cell and a missing final newline', () => {
    expect(parseCsv('a,b\n"one\ntwo",3')).toEqual([
      ['a', 'b'],
      ['one\ntwo', '3'],
    ])
  })

  it('keeps empty cells', () => {
    expect(parseCsv('a,,c\n,,')).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
    ])
  })
})

describe('toCsv', () => {
  it('quotes only what needs it, and reads back the same', () => {
    const rows = [
      ['sku', 'name', 'price'],
      ['A-1', 'Drill, "Pro"', 2499],
      ['B-2', null, ''],
    ]
    const csv = toCsv(rows)
    expect(csv.startsWith('﻿sku,name,price\r\nA-1,"Drill, ""Pro""",2499\r\n')).toBe(true)
    expect(parseCsv(csv)).toEqual(rows.map((row) => row.map((cell) => (cell == null ? '' : String(cell)))))
  })
})
