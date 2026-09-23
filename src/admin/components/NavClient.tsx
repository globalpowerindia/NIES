'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export type NavItem = {
  label: string
  href: string
  badge?: number
  badgeTone?: 'brand' | 'warning' | 'danger'
}

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

const STORAGE_KEY = 'gp-nav-collapsed'

const readCollapsed = (): string[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export const NavClient = ({ groups, staffName }: { groups: NavGroup[]; staffName: string }) => {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setCollapsed(readCollapsed()), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setQuery('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* private mode — collapsing still works for this session */
      }
      return next
    })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0)
  }, [groups, query])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav className="gpn" aria-label="Admin">
      <style>{`
        .gpn { display:flex; flex-direction:column; height:100%; gap:2px;
          padding: calc(var(--base)*0.8) calc(var(--base)*0.6) calc(var(--base)*0.6); overflow-y:auto; }
        .gpn__brand { display:flex; align-items:center; gap:9px; padding:4px 8px calc(var(--base)*0.6); }
        .gpn__brand span { font-size:12px; letter-spacing:.09em; text-transform:uppercase; color:var(--theme-elevation-500); }
        .gpn__search { display:flex; align-items:center; gap:6px; border:1px solid var(--theme-border-color);
          background:var(--theme-elevation-0); border-radius:var(--style-radius-s); padding:6px 10px; margin-bottom:8px; }
        .gpn__search input { border:0; background:transparent; outline:none; font:inherit; font-size:13px; width:100%;
          color:var(--theme-elevation-800); }
        .gpn__kbd { font-size:10px; border:1px solid var(--theme-border-color); border-radius:3px; padding:1px 5px;
          color:var(--theme-elevation-450); flex:none; }
        .gpn__group { margin-bottom:2px; }
        .gpn__gbtn { display:flex; align-items:center; gap:6px; width:100%; background:none; border:0; cursor:pointer;
          font:inherit; font-size:10.5px; font-weight:600; letter-spacing:.09em; text-transform:uppercase;
          color:var(--theme-elevation-450); padding:9px 8px 5px; }
        .gpn__gbtn svg { transition:transform .15s ease; flex:none; }
        .gpn__gbtn[aria-expanded="false"] svg { transform:rotate(-90deg); }
        .gpn__items { display:flex; flex-direction:column; gap:1px; }
        .gpn__link { display:flex; align-items:center; gap:8px; padding:7px 10px; border-radius:var(--style-radius-s);
          text-decoration:none; color:var(--theme-elevation-700); font-size:13.5px; line-height:1.3; }
        .gpn__link:hover { background:var(--theme-elevation-100); color:var(--theme-elevation-900); }
        .gpn__link[data-active="true"] { background:var(--theme-elevation-800); color:var(--theme-elevation-0); font-weight:500; }
        .gpn__badge { margin-left:auto; font-size:11px; font-weight:600; border-radius:999px; padding:1px 7px;
          font-variant-numeric:tabular-nums; }
        .gpn__badge[data-tone="brand"] { background:#eaebf2; color:#293681; }
        .gpn__badge[data-tone="warning"] { background:#fbf1d9; color:#8a6300; }
        .gpn__badge[data-tone="danger"] { background:#ffe3e0; color:#ce2d2a; }
        .gpn__link[data-active="true"] .gpn__badge { background:rgba(255,255,255,.18); color:#fff; }
        .gpn__foot { margin-top:auto; padding-top:10px; border-top:1px solid var(--theme-border-color); }
        .gpn__who { padding:6px 10px 8px; font-size:12px; color:var(--theme-elevation-500); }
        .gpn__who b { display:block; color:var(--theme-elevation-800); font-size:13px; font-weight:600; }
        .gpn__empty { padding:10px; font-size:12.5px; color:var(--theme-elevation-500); }
      `}</style>

      <div className="gpn__brand">
        <Image src="/brand/gp-mark.png" alt="" width={26} height={18} style={{ width: 26, height: 'auto' }} />
        <span>Commerce</span>
      </div>

      <div className="gpn__search">
        <input
          ref={inputRef}
          id="gp-nav-search"
          type="search"
          value={query}
          placeholder="Jump to…"
          aria-label="Filter navigation"
          onChange={(e) => setQuery(e.target.value)}
        />
        {!query && <span className="gpn__kbd">/</span>}
      </div>

      {filtered.length === 0 && <p className="gpn__empty">Nothing matches “{query}”.</p>}

      {filtered.map((group) => {
        const open = !collapsed.includes(group.id) || query.length > 0
        return (
          <div className="gpn__group" key={group.id}>
            <button
              type="button"
              className="gpn__gbtn"
              aria-expanded={open}
              aria-controls={`gpn-${group.id}`}
              onClick={() => toggle(group.id)}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                <path d="M2 3.5L5 6.5L8 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              {group.label}
            </button>
            {open && (
              <div className="gpn__items" id={`gpn-${group.id}`}>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="gpn__link"
                    data-active={isActive(item.href)}
                  >
                    {item.label}
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="gpn__badge" data-tone={item.badgeTone ?? 'brand'}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <div className="gpn__foot">
        <div className="gpn__who">
          Signed in as
          <b>{staffName}</b>
        </div>
        <div className="gpn__items">
          <Link href="/admin/account" className="gpn__link" data-active={isActive('/admin/account')}>
            My account
          </Link>
          <Link href="/admin/logout" className="gpn__link">
            Log out
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default NavClient
