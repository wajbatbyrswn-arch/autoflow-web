/**
 * Parse a Facebook or Instagram post URL into { platform, post_id, post_url }.
 * Returns null if the URL doesn't match any known pattern.
 * Accepts raw post_id as a fallback (e.g. user pasted just the numeric id).
 */
export function parsePostUrl(input) {
  const raw = String(input || '').trim()
  if (!raw) return null

  // Plain numeric id → treat as Facebook post id (most common case for raw ids).
  if (/^\d{8,}$/.test(raw)) return { platform: 'facebook', post_id: raw, post_url: '' }

  let url
  try { url = new URL(raw) } catch { return null }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const path = url.pathname.replace(/\/+$/, '')

  // ─── Instagram ─────────────────────────────────────────────
  // Posts:  instagram.com/p/{shortcode}/
  // Reels:  instagram.com/reel/{shortcode}/  or  /reels/{shortcode}/
  // IGTV:   instagram.com/tv/{shortcode}/
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    const m = path.match(/^\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)
    if (m) return { platform: 'instagram', post_id: m[1], post_url: raw }
    return null
  }

  // ─── Facebook ──────────────────────────────────────────────
  if (host === 'facebook.com' || host === 'fb.com' || host.endsWith('.facebook.com') || host === 'm.facebook.com') {
    // /{page}/posts/{id}, /{page}/videos/{id}, /{page}/photos/{id}
    let m = path.match(/^\/[^/]+\/(?:posts|videos|photos|reel|reels)\/([A-Za-z0-9_-]+)/)
    if (m) return { platform: 'facebook', post_id: m[1], post_url: raw }

    // /permalink.php?story_fbid={id}&id={page}
    if (path.endsWith('/permalink.php')) {
      const id = url.searchParams.get('story_fbid')
      if (id) return { platform: 'facebook', post_id: id, post_url: raw }
    }
    // /story.php?story_fbid={id}&id={page}
    if (path.endsWith('/story.php')) {
      const id = url.searchParams.get('story_fbid')
      if (id) return { platform: 'facebook', post_id: id, post_url: raw }
    }
    // /share/p/{id}/  or  /share/v/{id}/
    m = path.match(/^\/share\/(?:p|v|r)\/([A-Za-z0-9_-]+)/)
    if (m) return { platform: 'facebook', post_id: m[1], post_url: raw }

    // /watch/?v={id}
    if (path === '/watch' || path === '/watch.php') {
      const id = url.searchParams.get('v')
      if (id) return { platform: 'facebook', post_id: id, post_url: raw }
    }
    return null
  }

  return null
}
