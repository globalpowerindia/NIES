'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { AccountField, fieldInputClass } from '@/components/account/AccountField'
import { FormAlert } from '@/components/auth/fields'
import { useAuthSubmit } from '@/components/auth/useAuthSubmit'
import { Button } from '@/components/ui/Button'

/**
 * The name fields of the profile page. They look like the design's plain
 * boxes, but are inputs: editing either one brings up Save and Cancel.
 */
export const ProfileForm = ({ firstName, lastName }: { firstName: string; lastName: string }) => {
  const router = useRouter()
  const saved = { firstName, lastName }
  const [values, setValues] = useState(saved)
  const [justSaved, setJustSaved] = useState(false)
  const profile = useAuthSubmit('/api/auth/profile')

  const dirty = values.firstName.trim() !== firstName || values.lastName.trim() !== lastName

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const reply = await profile.submit({
      firstName: values.firstName,
      lastName: values.lastName || undefined,
    })
    if (!reply) return
    setValues({ firstName: values.firstName.trim(), lastName: values.lastName.trim() })
    setJustSaved(true)
    // The sidebar shows the name too; re-render it from the server.
    router.refresh()
  }

  const field = (name: 'firstName' | 'lastName', label: string, autoComplete: string) => {
    const error = profile.fields[name]
    return (
      <AccountField label={label} htmlFor={`profile-${name}`} error={error}>
        <input
          id={`profile-${name}`}
          name={name}
          value={values[name]}
          onChange={(event) => {
            setValues((v) => ({ ...v, [name]: event.target.value }))
            setJustSaved(false)
            profile.clearField(name)
          }}
          autoComplete={autoComplete}
          maxLength={60}
          required={name === 'firstName'}
          placeholder={name === 'lastName' ? 'Not added' : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `profile-${name}-message` : undefined}
          className={fieldInputClass(error)}
        />
      </AccountField>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {profile.error && <FormAlert>{profile.error}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        {field('firstName', 'First Name', 'given-name')}
        {field('lastName', 'Last Name', 'family-name')}
      </div>
      {(dirty || justSaved) && (
        <div className="flex items-center justify-end gap-3" aria-live="polite">
          {dirty ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValues(saved)
                  profile.clearField('firstName')
                  profile.clearField('lastName')
                }}
                disabled={profile.pending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="blue" disabled={profile.pending}>
                {profile.pending ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          ) : (
            <p className="text-body3 text-dark-300">Saved.</p>
          )}
        </div>
      )}
    </form>
  )
}
