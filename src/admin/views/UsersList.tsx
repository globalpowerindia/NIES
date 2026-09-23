import type { ListViewServerProps, Where } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow, Tone } from '@/admin/components/list/types'

const VIEWS: Record<string, Where> = {
  admins: { role: { equals: 'SUPER_ADMIN' } },
  managers: { role: { equals: 'MANAGER' } },
  staff: { role: { equals: 'STAFF' } },
  inactive: { isActive: { equals: false } },
}

const ROLE: Record<string, { label: string; tone: Tone }> = {
  SUPER_ADMIN: { label: 'Super admin', tone: 'danger' },
  MANAGER: { label: 'Manager', tone: 'brand' },
  STAFF: { label: 'Staff', tone: 'neutral' },
}

export const UsersList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)
  const where = combineWhere(VIEWS[view], searchWhere(q, ['name', 'email']))

  const [result, admins, managers, staff] = await Promise.all([
    payload.find({ collection: 'users', where, limit, page, sort: 'name', depth: 0 }),
    payload.count({ collection: 'users', where: { role: { equals: 'SUPER_ADMIN' } } }),
    payload.count({ collection: 'users', where: { role: { equals: 'MANAGER' } } }),
    payload.count({ collection: 'users', where: { role: { equals: 'STAFF' } } }),
  ])

  const rows: ListRow[] = result.docs.map((user) => {
    const role = ROLE[user.role] ?? ROLE.STAFF
    return {
      id: String(user.id),
      href: `/admin/collections/users/${user.id}`,
      cells: [
        {
          t: 'link',
          v: user.name,
          href: `/admin/collections/users/${user.id}`,
          sub: user.email,
        },
        { t: 'pill', v: role.label, tone: role.tone },
        { t: 'bool', v: user.isActive ?? true, on: 'Active', off: 'Disabled' },
        { t: 'date', v: user.createdAt },
      ],
    }
  })

  return (
    <DataList
      title="Staff"
      basePath="/admin/collections/users"
      totalDocs={result.totalDocs}
      page={result.page ?? 1}
      totalPages={result.totalPages ?? 1}
      activeFilter={view}
      searchValue={q}
      searchPlaceholder="Name or email"
      createHref="/admin/collections/users/create"
      createLabel="Invite staff"
      kpis={[
        { label: 'Super admins', value: admins.totalDocs },
        { label: 'Managers', value: managers.totalDocs },
        { label: 'Staff', value: staff.totalDocs },
      ]}
      filters={[
        { key: 'all', label: 'Everyone' },
        { key: 'admins', label: 'Super admins', count: admins.totalDocs },
        { key: 'managers', label: 'Managers', count: managers.totalDocs },
        { key: 'staff', label: 'Staff', count: staff.totalDocs },
        { key: 'inactive', label: 'Disabled' },
      ]}
      columns={[
        { header: 'Person' },
        { header: 'Role', width: 140 },
        { header: 'Access', width: 120 },
        { header: 'Added', width: 150 },
      ]}
      rows={rows}
      emptyMessage="No staff match this view."
    />
  )
}

export default UsersList
