import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AppShell, ThemeSync } from '@/components/layout/AppShell'
import { Toaster } from '@/components/layout/Toaster'
import { Celebration } from '@/components/layout/Celebration'
import { AuthGate } from '@/auth/AuthGate'
import NotFoundPage from '@/pages/NotFoundPage'

// Trang Tổng Quan tách gói riêng nhưng tải ngay song song với bước kiểm tra đăng nhập → không phải chờ thêm
const loadDashboard = () => import('@/pages/dashboard/DashboardPage')
void loadDashboard()
const DashboardPage = lazy(loadDashboard)
const MembersPage = lazy(() => import('@/pages/members/MembersPage'))
const MemberProfilePage = lazy(() => import('@/pages/members/MemberProfilePage'))
const MentorshipPage = lazy(() => import('@/pages/mentorship/MentorshipPage'))
const RomancePage = lazy(() => import('@/pages/romance/RomancePage'))
const RecruitmentPage = lazy(() => import('@/pages/recruitment/RecruitmentPage'))
const DungeonsPage = lazy(() => import('@/pages/dungeons/DungeonsPage'))
const TeamBuilderPage = lazy(() => import('@/pages/team/TeamBuilderPage'))
const GuildWarPage = lazy(() => import('@/pages/war/GuildWarPage'))
const CalendarPage = lazy(() => import('@/pages/calendar/CalendarPage'))
const RankingsPage = lazy(() => import('@/pages/rankings/RankingsPage'))
const AchievementsPage = lazy(() => import('@/pages/achievements/AchievementsPage'))
const TreasuryPage = lazy(() => import('@/pages/treasury/TreasuryPage'))
const ChibiStudioPage = lazy(() => import('@/pages/studio/ChibiStudioPage'))
const ArchitecturePage = lazy(() => import('@/pages/architecture/ArchitecturePage'))
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))

function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="seal h-14 w-14 animate-pulse text-[30px]">令</span>
        <span className="text-[12px] tracking-[0.2em] text-muted">ĐANG MỞ QUYỂN TRỤC…</span>
      </div>
    </div>
  )
}

const s = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: s(<DashboardPage />) },
      { path: 'thanh-vien', element: s(<MembersPage />) },
      { path: 'thanh-vien/:id', element: s(<MemberProfilePage />) },
      { path: 'su-do', element: s(<MentorshipPage />) },
      { path: 'tinh-duyen', element: s(<RomancePage />) },
      { path: 'chieu-mo', element: s(<RecruitmentPage />) },
      { path: 'pho-ban', element: s(<DungeonsPage />) },
      { path: 'bay-tran', element: s(<TeamBuilderPage />) },
      { path: 'bang-chien', element: s(<GuildWarPage />) },
      { path: 'lich', element: s(<CalendarPage />) },
      { path: 'phong-van', element: s(<RankingsPage />) },
      { path: 'thanh-tuu', element: s(<AchievementsPage />) },
      { path: 'bang-kho', element: s(<TreasuryPage />) },
      { path: 'xuong-chibi', element: s(<ChibiStudioPage />) },
      { path: 'kien-truc', element: s(<ArchitecturePage />) },
      { path: 'thiet-lap', element: s(<SettingsPage />) },
      // link mời đã xử lý ở cổng vào (AuthGate) — router tạo lúc tải trang nên vẫn nhớ đường dẫn cũ
      { path: 'moi/:code', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return (
    <>
      <ThemeSync />
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
      <Toaster />
      <Celebration />
    </>
  )
}
