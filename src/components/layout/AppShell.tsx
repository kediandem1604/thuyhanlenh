import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { ArrowLeft, Settings } from 'lucide-react'
import { featureOfPath } from '@/app/useNav'
import { FEATURE_INFO, ORG_TYPES, type Feature } from '@/domain/orgs'
import { useCan, useGuild } from '@/store/guild'
import { useUi } from '@/store/ui'
import { InkScape } from './InkScape'
import { Petals } from './Petals'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { DemoRibbon } from '@/demo/DemoRibbon'

export function AppShell() {
  const petals = useUi((s) => s.petals)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <>
      <InkScape />
      <div className="app-grain" />
      {petals && <Petals />}
      <Sidebar />
      <div className="relative z-10 min-h-dvh lg:pl-[272px]">
        <DemoRibbon />
        <Topbar />
        <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <FeatureGate pathname={pathname}>
              <Outlet />
            </FeatureGate>
          </motion.div>
        </main>
      </div>
      <CommandPalette />
    </>
  )
}

/** Trang của chức năng đang tắt ở tổ chức này → báo rõ thay vì hiện trang rỗng */
function FeatureGate({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const feature = featureOfPath(pathname)
  const org = useGuild((s) => s.me?.org ?? null)
  if (!feature || !org || org.features.includes(feature)) return <>{children}</>
  return <FeatureOff feature={feature} />
}

function FeatureOff({ feature }: { feature: Feature }) {
  const org = useGuild((s) => s.me?.org)!
  const canManage = useCan('org.manage')
  const info = FEATURE_INFO[feature]
  const type = ORG_TYPES[org.type]
  const allowed = type.allowed.includes(feature)
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="panel corners w-full max-w-lg p-8 text-center">
        <span className="seal mx-auto h-16 w-16 text-[34px] opacity-70">{info.han}</span>
        <h1 className="title-display text-gold-grad mt-5 text-[28px]">{info.name}</h1>
        <p className="mt-2 text-[14px] text-ink-2">
          {allowed
            ? `${type.name} ${org.name} đang tắt chức năng này.`
            : org.type === 'kimlan'
              ? 'Kim Lan trong game chỉ có phó bản, bày trận và lịch đi phó bản — chức năng này không dùng cho Kim Lan.'
              : `${type.name} không có chức năng này.`}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn">
            <ArrowLeft size={15} /> Về trang chính
          </Link>
          {allowed && type.toggleable && canManage && (
            <Link to="/thiet-lap" className="btn btn-gold">
              <Settings size={15} /> Bật trong Thiết Lập
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

/** Áp giao diện Dạ / Nhật và giao diện của tổ chức đang xem lên <html> — dùng ở gốc app (cả màn đăng nhập). */
export function ThemeSync() {
  const theme = useUi((s) => s.theme)
  const orgTheme = useGuild((s) => s.me?.org?.theme ?? null)
  useEffect(() => {
    const el = document.documentElement
    el.dataset.theme = theme
    if (orgTheme) el.dataset.orgTheme = orgTheme
    else delete el.dataset.orgTheme
    const bach = orgTheme === 'bach-gia'
    const color = theme === 'dark' ? (bach ? '#070b16' : '#0a0d16') : bach ? '#e8ecf1' : '#efe5d2'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [theme, orgTheme])
  return null
}
