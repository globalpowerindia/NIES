import { describe, expect, it } from 'vitest'

import { diffDocuments } from './audit'

describe('audit diffs', () => {
  it('records each changed field, before and after', () => {
    expect(diffDocuments({ name: 'Drill', sellingPricePaise: 150_000 }, { name: 'Drill', sellingPricePaise: 120_000 })).toEqual({
      sellingPricePaise: { from: 150_000, to: 120_000 },
    })
  })

  it('never copies secrets, and ignores timestamps and derived fields', () => {
    const changes = diffDocuments(
      { hash: 'old', salt: 'a', sessions: [], resetPasswordToken: 'x', updatedAt: '1', searchA: 'old' },
      { hash: 'new', salt: 'b', sessions: [{ id: 's' }], resetPasswordToken: 'y', updatedAt: '2', searchA: 'new' },
    )
    expect(changes).toEqual({})
  })

  it('treats a populated relationship and its bare id as the same value', () => {
    const brand = { id: 4, name: 'Bosch', createdAt: '2026-01-01' }
    expect(diffDocuments({ brand: 4, category: 9 }, { brand, category: { id: 10, createdAt: 'x' } })).toEqual({
      category: { from: 9, to: 10 },
    })
  })

  it('cuts long values short instead of copying them whole', () => {
    const changes = diffDocuments({ notes: 'a' }, { notes: 'b'.repeat(5000) })
    expect(String(changes.notes.to).length).toBeLessThan(600)
    expect(String(changes.notes.to)).toMatch(/…$/)
  })

  it('records a whole document as removed on delete', () => {
    expect(diffDocuments({ code: 'DIWALI', isActive: true }, undefined)).toEqual({
      code: { from: 'DIWALI', to: null },
      isActive: { from: true, to: null },
    })
  })
})
