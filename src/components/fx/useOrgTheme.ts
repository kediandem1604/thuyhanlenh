import { useSyncExternalStore } from 'react'
import { ORG_THEME_IDS, type OrgThemeId } from '@/domain/orgs'

/*
 * Giao diện tổ chức đang áp dụng = thuộc tính `data-org-theme` trên <html> (ThemeSync đặt).
 * Đọc thẳng từ DOM để hạt rơi / hạc / màn ăn mừng luôn khớp với token CSS đang hiển thị.
 * Thiếu hoặc sai giá trị → 'kinh-hong'.
 */
const ATTR = 'data-org-theme'
export const DEFAULT_ORG_THEME: OrgThemeId = 'kinh-hong'

function read(): OrgThemeId {
  const v = document.documentElement.getAttribute(ATTR)
  return v && (ORG_THEME_IDS as string[]).includes(v) ? (v as OrgThemeId) : DEFAULT_ORG_THEME
}

const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (!observer) {
    observer = new MutationObserver(() => listeners.forEach((l) => l()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] })
  }
  return () => {
    listeners.delete(cb)
    if (listeners.size === 0 && observer) {
      observer.disconnect()
      observer = null
    }
  }
}

/** Id giao diện tổ chức hiện tại; `override` (nếu có) thắng — dùng cho xem trước / màn sảnh. */
export function useOrgThemeId(override?: OrgThemeId | null): OrgThemeId {
  const id = useSyncExternalStore(subscribe, read, () => DEFAULT_ORG_THEME)
  return override ?? id
}
