/** Chuyển SVG chibi thành ảnh PNG (nền trong suốt) và tải xuống */
export async function downloadSvgAsPng(svg: SVGSVGElement, fileName: string, scale = 2) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const vb = svg.viewBox.baseVal
  const width = Number(svg.getAttribute('width')) || vb.width || 320
  const height = Number(svg.getAttribute('height')) || vb.height || 400
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('class')
  clone.removeAttribute('style')

  const data = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Không đọc được ảnh SVG'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Không tạo được ảnh PNG')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Tên file an toàn (bỏ dấu, khoảng trắng → gạch nối) */
export function slugify(name: string) {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'nhan-vat'
  )
}
