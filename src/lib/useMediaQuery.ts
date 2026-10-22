import { useSyncExternalStore } from 'react'

/** Theo dõi media query, ví dụ useMediaQuery('(min-width: 640px)') */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', cb)
      return () => mql.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
