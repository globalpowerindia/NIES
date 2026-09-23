import Image from 'next/image'

/** Shown on the login and unauthorised screens. */
export const Logo = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
    }}
  >
    <Image
      src="/brand/logo.png"
      alt="Global Power"
      width={220}
      height={87}
      priority
      style={{ width: 220, height: 'auto' }}
    />
    <span
      style={{
        fontSize: '13px',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--theme-elevation-500)',
      }}
    >
      Commerce Admin
    </span>
  </div>
)

export default Logo
