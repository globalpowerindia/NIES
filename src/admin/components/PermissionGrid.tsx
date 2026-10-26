'use client'

import { FieldLabel, useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'

import { ACTION_LABELS, ACTIONS, RESOURCES, sanitiseGrants, type Action, type Grants } from '@/access/permissions'

const GROUPS = [...new Set(RESOURCES.map((resource) => resource.group))]

/**
 * The role's permissions as a grid of sections × actions, stored as JSON.
 * Only actions a section allows can be ticked (see RESOURCES); editing,
 * creating or deleting implies viewing, so those tick View with them.
 */
export const PermissionGrid: JSONFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, disabled } = useField<Grants>({ path: path ?? field.name })
  const grants = sanitiseGrants(value)
  const locked = readOnly || disabled

  const toggle = (key: (typeof RESOURCES)[number]['key'], action: Action, on: boolean) => {
    const current = new Set(grants[key] ?? [])
    if (on) {
      current.add(action)
      if (action !== 'read') current.add('read')
    } else if (action === 'read') {
      current.clear()
    } else {
      current.delete(action)
    }
    setValue(sanitiseGrants({ ...grants, [key]: [...current] }))
  }

  const setRow = (key: (typeof RESOURCES)[number]['key'], actions: readonly Action[], on: boolean) =>
    setValue(sanitiseGrants({ ...grants, [key]: on ? [...actions] : [] }))

  return (
    <div className="field-type permission-grid">
      <FieldLabel label={field.label ?? 'Permissions'} path={path} />
      <style>{`
        .permission-grid table { width:100%; border-collapse:collapse; font-size:13px; }
        .permission-grid th, .permission-grid td { padding:8px 10px; border-bottom:1px solid var(--theme-elevation-100); text-align:center; }
        .permission-grid th:first-child, .permission-grid td:first-child { text-align:left; }
        .permission-grid thead th { position:sticky; top:0; background:var(--theme-elevation-0); font-weight:600; }
        .permission-grid .pg__group td { background:var(--theme-elevation-50); font-weight:600; text-transform:uppercase; letter-spacing:.04em; font-size:11px; color:var(--theme-elevation-600); }
        .permission-grid .pg__note { display:block; font-size:11px; color:var(--theme-elevation-500); margin-top:2px; }
        .permission-grid .pg__na { color:var(--theme-elevation-300); }
        .permission-grid input[type=checkbox] { width:16px; height:16px; cursor:pointer; }
        .permission-grid button { background:none; border:0; padding:0; color:var(--theme-success-500); cursor:pointer; font-size:12px; }
      `}</style>
      <table>
        <thead>
          <tr>
            <th scope="col">Section</th>
            {ACTIONS.map((action) => (
              <th key={action} scope="col">{ACTION_LABELS[action]}</th>
            ))}
            <th scope="col" aria-label="Whole row" />
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => [
            <tr className="pg__group" key={group}>
              <td colSpan={ACTIONS.length + 2}>{group}</td>
            </tr>,
            ...RESOURCES.filter((resource) => resource.group === group).map((resource) => {
              const granted = grants[resource.key] ?? []
              const full = resource.actions.every((action) => granted.includes(action))
              return (
                <tr key={resource.key}>
                  <th scope="row" style={{ fontWeight: 500 }}>
                    {resource.label}
                    {'note' in resource && <span className="pg__note">{resource.note}</span>}
                  </th>
                  {ACTIONS.map((action) =>
                    (resource.actions as readonly Action[]).includes(action) ? (
                      <td key={action}>
                        <input
                          type="checkbox"
                          aria-label={`${ACTION_LABELS[action]} ${resource.label}`}
                          checked={granted.includes(action)}
                          disabled={locked}
                          onChange={(event) => toggle(resource.key, action, event.target.checked)}
                        />
                      </td>
                    ) : (
                      <td key={action} className="pg__na" title="Can't be granted to a role">
                        —
                      </td>
                    ),
                  )}
                  <td>
                    {!locked && (
                      <button type="button" onClick={() => setRow(resource.key, resource.actions, !full)}>
                        {full ? 'None' : 'All'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            }),
          ])}
        </tbody>
      </table>
    </div>
  )
}

export default PermissionGrid
