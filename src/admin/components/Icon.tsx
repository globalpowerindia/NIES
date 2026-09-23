import Image from 'next/image'

/** Shown in the admin navigation header, at roughly 20–24px. */
export const Icon = () => (
  <Image
    src="/brand/gp-mark.png"
    alt="Global Power"
    width={34}
    height={23}
    style={{ width: 34, height: 'auto' }}
  />
)

export default Icon
