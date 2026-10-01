/**
 * The video id in a YouTube link, from any of the shapes people paste:
 * watch?v=, youtu.be/, /shorts/, /embed/ and /live/. Null if it isn't one.
 */
export const youTubeId = (url: string): string | null => {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^(www|m|music)\./, '')
  const id =
    host === 'youtu.be'
      ? parsed.pathname.slice(1)
      : host === 'youtube.com' || host === 'youtube-nocookie.com'
        ? (parsed.searchParams.get('v') ??
          parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1])
        : null
  return id && /^[\w-]{11}$/.test(id) ? id : null
}
