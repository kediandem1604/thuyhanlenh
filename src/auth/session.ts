import { api, errorMessage, isDemoMode } from '@/api/client'
import { exitDemo } from '@/demo/mode'
import { useGuild } from '@/store/guild'
import { toast } from '@/store/ui'

/** Đăng xuất rồi tải lại về trang đầu (xóa sạch dữ liệu trong bộ nhớ). */
export async function logout() {
  // đang xem thử: chỉ cần thoát chế độ xem thử, không có phiên thật để huỷ
  if (isDemoMode()) return exitDemo('/')
  try {
    await api.post('/auth/logout')
  } catch {
    /* phiên đã hết hạn cũng coi như đã thoát */
  }
  useGuild.getState().clear()
  location.assign('/')
}

/** Chế độ dev: đăng nhập thử với tư cách một môn hạ (hoặc khách mới). */
export async function devLogin(body: { characterId: string } | { memberId: string } | { guestName: string }) {
  try {
    await api.post('/auth/dev/login', body)
    return true
  } catch (e) {
    toast({ tone: 'error', title: 'Không đăng nhập được', desc: errorMessage(e) })
    return false
  }
}

/** Chuyển sang Discord để đăng nhập, quay lại đúng trang đang mở. */
export function discordLogin() {
  const next = location.pathname + location.search
  location.assign(`/auth/discord/login?next=${encodeURIComponent(next === '/' ? '/' : next)}`)
}
