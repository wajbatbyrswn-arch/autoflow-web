/**
 * Compress an image File to a JPEG data URL, fitting within maxDim and target quality.
 * Keeps aspect ratio. Returns dataURL string.
 */
export function compressImage(file, { maxDim = 800, quality = 0.75, mime = 'image/jpeg' } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('no file'))
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim }
        else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        try { resolve(canvas.toDataURL(mime, quality)) } catch (e) { reject(e) }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
