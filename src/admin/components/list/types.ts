export type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'muted'

/**
 * Cells are a small serialisable DSL rather than render functions, because a
 * server view cannot pass functions across the boundary to a client component.
 */
export type Cell =
  | { t: 'text'; v: string; sub?: string }
  | { t: 'link'; v: string; href: string; sub?: string }
  | { t: 'money'; v: number; strike?: boolean }
  | { t: 'num'; v: number; suffix?: string }
  | { t: 'pill'; v: string; tone: Tone }
  | { t: 'pills'; items: { v: string; tone: Tone }[] }
  | { t: 'thumb'; src: string | null; alt: string; v: string; sub?: string }
  | { t: 'bool'; v: boolean; on: string; off: string }
  | { t: 'date'; v: string | null }
  | { t: 'empty' }

export type ListColumn = {
  header: string
  align?: 'left' | 'right'
  width?: number
  hideBelow?: 'sm' | 'md'
}

export type ListRow = {
  id: string
  href: string
  cells: Cell[]
}

export type ListFilter = {
  key: string
  label: string
  count?: number
}

export type ListKpi = {
  label: string
  value: string | number
  tone?: Tone
}

export type BulkAction = {
  key: string
  label: string
  endpoint: string
  /** Extra JSON merged into the request body. */
  payload?: Record<string, unknown>
  confirm?: string
}

export type DataListProps = {
  title: string
  basePath: string
  totalDocs: number
  kpis?: ListKpi[]
  filters?: ListFilter[]
  activeFilter?: string
  columns: ListColumn[]
  rows: ListRow[]
  page: number
  totalPages: number
  searchPlaceholder?: string
  searchValue?: string
  bulkActions?: BulkAction[]
  createHref?: string
  createLabel?: string
  emptyMessage?: string
}
