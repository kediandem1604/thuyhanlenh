// Bật / tắt chế độ xem thử. Phần "máy chủ giả" (dữ liệu mẫu) nằm ở ./backend và chỉ tải khi cần.
import { isDemoMode, setDemoHandler, setOrgId } from '@/api/client'

const KEY = 'thuy-han-lenh:demo'

/** Phiên này đang xem thử (giữ qua lần tải lại trang, mất khi đóng tab) */
export function demoRequested() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Nạp máy chủ giả nếu phiên đang xem thử — gọi trước khi hỏi /api/me */
export async function ensureDemoBackend() {
  if (!demoRequested() || isDemoMode()) return
  const { createDemoBackend } = await import('./backend')
  setDemoHandler(createDemoBackend())
}

/** Vào xem thử: bắt đầu ở bang mẫu Kinh Hồng Các */
export async function enterDemo() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* trình duyệt chặn lưu trữ — vẫn xem được tới khi tải lại trang */
  }
  setOrgId('kinh-hong-cac')
  const { createDemoBackend } = await import('./backend')
  setDemoHandler(createDemoBackend())
}

/** Thoát xem thử về trang giới thiệu */
export function exitDemo(next = '/') {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* không sao */
  }
  setDemoHandler(null)
  setOrgId(null)
  location.assign(next)
}
