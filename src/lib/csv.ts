/**
 * CSV as spreadsheets write it (RFC 4180): commas, double-quoted cells with
 * "" for a quote, CRLF or LF line ends, and Excel's byte-order mark.
 * Dependency-free, so the admin's import page and the server read files the
 * same way.
 */

/** Rows of cells. Blank lines are dropped; a quoted cell may span lines. */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0

  const endRow = () => {
    row.push(cell)
    if (row.length > 1 || row[0] !== '') rows.push(row)
    row = []
    cell = ''
  }

  for (; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell === '') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      endRow()
    } else {
      cell += char
    }
  }
  if (cell !== '' || row.length) endRow()
  return rows
}

type Cell = string | number | null | undefined

const quote = (value: Cell): string => {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * A CSV file from rows. Starts with a byte-order mark so Excel reads the
 * text as UTF-8 (₹, accented brand names) instead of guessing.
 */
export const toCsv = (rows: Cell[][]): string => `﻿${rows.map((row) => row.map(quote).join(',')).join('\r\n')}\r\n`
