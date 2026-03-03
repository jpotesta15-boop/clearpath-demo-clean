/**
 * Converts a video URL (YouTube, Vimeo, Google Drive) to an embeddable iframe src.
 * Returns null if the URL is not supported for embedding.
 */
export function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be' && u.pathname.slice(1)) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.replace(/^\/+/, '').split('/')[0]
      if (id) return `https://player.vimeo.com/video/${id}`
    }
    // Google Drive: /file/d/ID/view or /open?id=ID → embed with /preview
    if (u.hostname.includes('drive.google.com')) {
      const pathMatch = u.pathname.match(/\/file\/d\/([^/]+)/)
      const idFromPath = pathMatch?.[1]
      const idFromQuery = u.searchParams.get('id')
      const fileId = idFromPath || idFromQuery
      if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`
    }
  } catch {
    // ignore
  }
  return null
}
