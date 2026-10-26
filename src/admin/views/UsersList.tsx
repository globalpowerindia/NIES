import type { ListViewServerProps, Where } from 'payload'

import { DataList } from '@/admin/components/list/DataList'
import { combineWhere, readListParams, searchWhere } from '@/admin/components/list/params'
import type { ListRow } from '@/admin/components/list/types'

/** Filters: everyone, super admins, each role by id ("role-12"), and disabled accounts. */
const viewWhere = (view: string): Where | undefined => {
  if (view === 'admins') return { isSuperAdmin: { equals: true } }
  if (view === 'inactive') return { isActive: { equals: false } }
  const roleId = Number(/^role-(\d+)$/.exec(view)?.[1])
  return Number.isInteger(roleId) && roleId > 0
    ? { and: [{ role: { equals: roleId } }, { isSuperAdmin: { not_equals: true } }] }
    : undefined
}

export const UsersList = async ({ payload, searchParams }: ListViewServerProps) => {
  const { view, q, page, limit } = readListParams(searchParams)
  const where = combineWhere(viewWhere(view), searchWhere(q, ['name', 'email']))

  const [result, admins, roles] = await Promise.all([
    payload.find({ collection: 'users', where, limit, page, sort: 'name', depth: 1 }),
    payload.count({ collection: 'users', where: { isSuperAdmin: { equals: true } } }),
    payload.find({ collection: 'roles', sort: 'name', pagination: false, depth: 0, select: { name: true } }),
  ])
  const roleCounts = await Promise.all(
    roles.docs.map((role) =>
      payload.count({ collection: 'users', where: { and: [{ role: { equals: role.id } }, { isSuperAdmin: { not_equals: true } }] } }),
    ),
  )

  const rows: ListRow[] = result.docs.map((user) => {
    const roleName = user.role && typeof user.role === 'object' ? user.role.name : null
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
        user.isSuperAdmin
          ? { t: 'pill', v: 'Super admin', tone: 'danger' }
          : { t: 'pill', v: roleName ?? 'No role', tone: roleName ? 'brand' : 'neutral' },
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
        ...roles.docs.slice(0, 3).map((role, index) => ({ label: role.name, value: roleCounts[index].totalDocs })),
      ]}
      filters={[
        { key: 'all', label: 'Everyone' },
        { key: 'admins', label: 'Super admins', count: admins.totalDocs },
        ...roles.docs.map((role, index) => ({ key: `role-${role.id}`, label: role.name, count: roleCounts[index].totalDocs })),
        { key: 'inactive', label: 'Disabled' },
      ]}
      columns={[
        { header: 'Person' },
        { header: 'Role', width: 160 },
        { header: 'Access', width: 120 },
        { header: 'Added', width: 150 },
      ]}
      rows={rows}
      emptyMessage="No staff match this view."
    />
  )
}

export default UsersList
