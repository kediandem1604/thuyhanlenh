import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Clock, Eye, Inbox, Lock, Percent, ScrollText, Users } from 'lucide-react'
import { RANKS } from '@/domain/constants'
import { ORG_TYPES } from '@/domain/orgs'
import { PERMISSION_MIN_RANK_BY_TYPE } from '@/domain/permissions'
import type { Application, ApplicationStage } from '@/domain/types'
import { useCan, useGuild, useOrg, useOrgType } from '@/store/guild'
import { celebrate, toast } from '@/store/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { SectionTitle } from '@/components/ui/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { KanbanBoard } from './KanbanBoard'
import { ApplicationModal } from './ApplicationModal'
import { CriteriaPanel } from './CriteriaPanel'
import { stageName, type CardActions } from './ApplicationCard'
import { recruitWords } from './words'

export default function RecruitmentPage() {
  const applications = useGuild((s) => s.applications)
  const members = useGuild((s) => s.members)
  const moveApplication = useGuild((s) => s.moveApplication)
  const acceptApplication = useGuild((s) => s.acceptApplication)
  const canReview = useCan('recruit.review')
  const org = useOrg()
  const type = useOrgType()
  const w = recruitWords(type)
  const orgName = org?.name ?? 'tổ chức'
  const capacity = org?.capacity ?? null
  const minRank = PERMISSION_MIN_RANK_BY_TYPE[type]['recruit.review']
  const reviewers = minRank === ORG_TYPES[type].leaderRank ? `Chỉ ${RANKS[minRank].name}` : `Từ ${RANKS[minRank].name} trở lên`
  const [open, setOpen] = useState(false)
  // đơn đang chờ máy chủ trả lời — chặn bấm hai lần
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set())
  const busyRef = useRef(new Set<string>())
  const track = (id: string, on: boolean) => {
    const next = new Set(busyRef.current)
    if (on) next.add(id)
    else next.delete(id)
    busyRef.current = next
    setBusy(next)
  }

  const stats = useMemo(() => {
    const accepted = applications.filter((a) => a.stage === 'chap-nhan').length
    const rejected = applications.filter((a) => a.stage === 'tu-choi').length
    const decided = accepted + rejected
    const dayAgo = Date.now() - 86400000
    const fresh = applications.filter((a) => new Date(a.appliedAt).getTime() > dayAgo).length
    const pending = applications.length - decided
    return { rate: decided ? (accepted / decided) * 100 : 0, fresh, pending, accepted }
  }, [applications])

  const actions = useMemo<CardActions>(
    () => ({
      onMove: async (app: Application, to: ApplicationStage) => {
        if (app.stage === 'chap-nhan') {
          toast({ tone: 'info', title: 'Đơn đã được chấp nhận', desc: `Người này đã là ${w.member} của ${w.org}.` })
          return
        }
        if (busyRef.current.has(app.id)) return
        track(app.id, true)
        // store chuyển thẻ ngay (lạc quan) và tự báo lỗi nếu máy chủ từ chối
        const r = await moveApplication(app.id, to)
        track(app.id, false)
        if (r.ok) toast({ tone: to === 'tu-choi' ? 'info' : 'success', title: `${app.name} → ${stageName(to)}` })
      },
      onAccept: async (app: Application) => {
        if (app.stage === 'chap-nhan' || busyRef.current.has(app.id)) return
        track(app.id, true)
        const r = await acceptApplication(app.id)
        track(app.id, false)
        if (!r.ok) {
          toast({ tone: 'error', title: `Chưa nhận được ${app.name}`, desc: r.error })
          return
        }
        const m = r.data
        if (app.kind === 'claim') {
          celebrate({ han: '认', title: 'Nhận lại danh tính!', subtitle: `Tài khoản đã được gắn với ${m.name}.` })
          toast({ tone: 'success', title: `${m.name} đã có chủ`, desc: `Người gửi đơn đăng nhập lại là vào thẳng ${orgName}.` })
        } else {
          celebrate({ han: '迎', title: `Chào mừng ${w.newcomer}!`, subtitle: `${m.name} chính thức gia nhập ${orgName}.` })
          toast({ tone: 'success', title: `${m.name} đã vào ${w.org}`, desc: 'Bấm “Xem hồ sơ” trên thẻ ở cột Chấp nhận để mở hồ sơ.' })
        }
      },
    }),
    // `track` chỉ dùng ref + setState (ổn định giữa các lần render)
    [moveApplication, acceptApplication, w.member, w.org, w.newcomer, orgName],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chiêu hiền nạp sĩ"
        title="Chiêu Mộ"
        han="募"
        description={`Duyệt đơn xin gia nhập: kéo thả thẻ qua từng vòng — phỏng vấn, thử thách — rồi đón ${w.newcomer} vào ${orgName}.`}
        actions={
          canReview ? (
            <button className="btn btn-gold" onClick={() => setOpen(true)}>
              <ScrollText size={16} /> Thêm đơn thủ công
            </button>
          ) : undefined
        }
      />

      {!canReview && (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-black/10 px-4 py-3 text-[13px] text-ink-2">
          <Eye size={17} className="mt-0.5 shrink-0 text-gold" />
          <p>
            Bạn đang xem bảng duyệt đơn ở chế độ <b className="text-ink">chỉ xem</b>. <b className="text-gold">{reviewers}</b> mới được chuyển vòng, chấp nhận hay từ chối
            đơn. Người mới muốn vào {w.org} chỉ cần đăng nhập — Sảnh Giang Hồ sẽ dẫn họ gửi đơn, hoặc dùng link mời.
          </p>
        </div>
      )}

      {org && !org.isPublic && (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-black/10 px-4 py-3 text-[13px] text-ink-2">
          <Lock size={16} className="mt-0.5 shrink-0 text-muted" />
          <p>
            {orgName} đang <b className="text-ink">tắt nhận đơn công khai</b> — {w.org} không hiện trong danh bạ chiêu mộ ở Sảnh Giang Hồ, người mới vào chủ yếu bằng link mời.{' '}
            {canReview && (
              <Link to="/thiet-lap" className="font-semibold text-gold hover:underline">
                Bật lại ở Thiết Lập
              </Link>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Inbox} label="Tổng số đơn" value={applications.length} hint={`${stats.pending} đơn đang chờ duyệt`} color="#6fa8ff" />
        <StatCard
          index={1}
          icon={Percent}
          label="Tỉ lệ chấp nhận"
          value={stats.rate}
          format={(n) => `${Math.round(n)}`}
          suffix="%"
          hint="trên số đơn đã xử lý"
          color="#5ec7b0"
        />
        <StatCard index={2} icon={Clock} label="Đơn mới 24h" value={stats.fresh} hint="vừa gửi trong một ngày qua" color="#d8b46a" />
        {capacity !== null ? (
          <StatCard index={3} icon={Users} label="Chỗ trống" value={Math.max(0, capacity - members.length)} hint={`${members.length}/${capacity} ${w.member}`} color="#a08cf5" />
        ) : (
          <StatCard index={3} icon={Users} label={w.member} value={members.length} hint={`${orgName} không giới hạn số người`} color="#a08cf5" />
        )}
      </div>

      <section>
        <SectionTitle
          han="审"
          title="Bảng duyệt đơn"
          subtitle={canReview ? 'Kéo thẻ sang cột khác, hoặc dùng nút trên thẻ khi dùng điện thoại' : 'Tiến trình duyệt đơn của ban quản lý'}
        />
        <KanbanBoard applications={applications} members={members} actions={canReview ? actions : undefined} busy={busy} />
      </section>

      <CriteriaPanel members={members} />

      <ApplicationModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
