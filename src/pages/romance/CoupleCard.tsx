import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarHeart, Flower2, HeartCrack } from 'lucide-react'
import { BOND_TYPES, CLASSES } from '@/domain/constants'
import type { Bond, Member } from '@/domain/types'
import { useCan, useGuild } from '@/store/guild'
import { toast } from '@/store/ui'
import { createRng, daysBetween, fmt, fmtDate } from '@/lib/utils'
import { ProgressBar } from '@/components/ui/Progress'
import { Countdown } from '@/components/ui/Countdown'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CoupleStage } from './CoupleStage'
import { intimacyTier, nextAnniversary } from './romance'

const GIFT = 99

/** Chùm tim bay lên khi tặng hoa */
function HeartBurst({ seed }: { seed: number }) {
  const rng = createRng(seed)
  const parts = Array.from({ length: 10 }, (_, i) => ({
    i,
    x: rng.float(-90, 90),
    y: rng.float(-150, -60),
    r: rng.float(-40, 40),
    s: rng.float(0.7, 1.3),
    flower: i % 3 === 0,
  }))
  return (
    <div className="pointer-events-none absolute left-1/2 top-[55%] z-[3]" aria-hidden>
      {parts.map((p) => (
        <motion.span
          key={p.i}
          className="absolute -ml-2 -mt-2 block"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.2, rotate: 0 }}
          animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: p.s, rotate: p.r }}
          transition={{ duration: 1.3, ease: 'easeOut' }}
        >
          {p.flower ? (
            <Flower2 size={16} className="text-sakura" />
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.1 1.8-1.9 3.3-3.1 5.4-3.1 3.6 0 5.8 3.7 4.2 7.3C19.5 16.4 12 21 12 21z" fill="#ff7d9a" />
            </svg>
          )}
        </motion.span>
      ))}
    </div>
  )
}

export function CoupleCard({ bond, a, b, index, featured }: { bond: Bond; a: Member; b: Member; index: number; featured?: boolean }) {
  const addIntimacy = useGuild((s) => s.addIntimacy)
  const removeBond = useGuild((s) => s.removeBond)
  const currentUserId = useGuild((s) => s.currentUserId)
  const canManage = useCan('bond.manage')
  const [hover, setHover] = useState(false)
  const [bursts, setBursts] = useState<number[]>([])
  const [confirm, setConfirm] = useState(false)

  // chỉ người trong cuộc (hoặc Trưởng Lão trở lên) mới tặng hoa / giải trừ
  const involved = currentUserId === a.id || currentUserId === b.id
  const canAct = involved || canManage

  const t = BOND_TYPES[bond.type]
  const tier = intimacyTier(bond.intimacy)
  const days = Math.max(1, daysBetween(bond.since))
  const anniv = nextAnniversary(bond.since)

  const gift = async () => {
    // hoa bay ngay (store cập nhật lạc quan); lỗi thì store tự hoàn tác và báo
    const before = tier.cur.name
    const id = Date.now() + Math.random()
    setBursts((x) => [...x, id])
    setTimeout(() => setBursts((x) => x.filter((v) => v !== id)), 1400)
    const r = await addIntimacy(bond.id, GIFT)
    if (!r.ok) return
    const after = intimacyTier(bond.intimacy + GIFT)
    if (after.cur.name !== before) toast({ tone: 'gold', title: `Thăng cấp: ${after.cur.name}!`, desc: `${a.name} & ${b.name} càng thêm gắn bó.` })
    else toast({ tone: 'success', title: `+${GIFT} thân mật`, desc: `Một bó hoa gửi trao ${a.name} & ${b.name}.` })
  }

  const onRemove = async () => {
    const r = await removeBond(bond.id)
    if (r.ok) toast({ tone: 'info', title: 'Đã giải trừ', desc: `Duyên ${t.name.toLowerCase()} giữa ${a.name} và ${b.name} đã tan như sương sớm.` })
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="panel panel-hover corners relative flex flex-col overflow-hidden p-0"
      style={{ borderColor: `color-mix(in oklab, ${t.color} 30%, var(--line))` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(420px 220px at 50% 38%, color-mix(in oklab, ${t.color} 18%, transparent), transparent 72%)` }}
      />
      {featured && (
        <span className="absolute left-1/2 top-0 z-[2] -translate-x-1/2 whitespace-nowrap rounded-b-xl bg-[linear-gradient(90deg,#ff7d9a,#f2a7bf)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#3a0f1c] shadow-[0_6px_18px_-6px_rgba(255,125,154,.8)]">
          Đệ nhất tình duyên
        </span>
      )}

      {/* đầu thẻ */}
      <div className={`relative flex items-center justify-between gap-3 px-5 ${featured ? 'pt-8 sm:pt-4' : 'pt-4'}`}>
        <span className="flex items-center gap-2">
          <span
            className="seal h-8 w-8 text-[17px]"
            style={{ background: `radial-gradient(circle at 30% 25%, ${t.color}, color-mix(in oklab, ${t.color} 60%, #000) 80%)` }}
          >
            {t.han}
          </span>
          <span className="text-[12.5px] font-bold uppercase tracking-[0.16em]" style={{ color: t.color }}>
            {t.name}
          </span>
        </span>
        <span className="chip shrink-0" title={`Từ ${fmtDate(bond.since)}`}>
          {days} ngày bên nhau
        </span>
      </div>

      {/* sân khấu */}
      <div className="relative px-3 pt-2">
        <CoupleStage a={a} b={b} type={bond.type} size={featured ? 124 : 112} animated={featured || hover} />
        <AnimatePresence>
          {bursts.map((id) => (
            <HeartBurst key={id} seed={Math.floor(id)} />
          ))}
        </AnimatePresence>
      </div>

      <div className="relative grid grid-cols-2 gap-2 px-5 text-center">
        {[a, b].map((m) => (
          <Link key={m.id} to={`/thanh-vien/${m.id}`} className="group min-w-0">
            <div className="truncate text-[14px] font-bold text-ink group-hover:text-gold">{m.name}</div>
            <div className="truncate text-[11px] text-muted">{CLASSES[m.classId].name}</div>
          </Link>
        ))}
      </div>

      <div className="relative mt-3 flex flex-1 flex-col gap-3 border-t border-line px-5 pb-5 pt-4">
        {bond.note && <p className="text-center text-[13px] italic leading-relaxed text-ink-2">“{bond.note}”</p>}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12px]">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink-2">
              <span className="han text-[15px] text-sakura">{tier.cur.han}</span> Thân mật · <span className="text-sakura">{tier.cur.name}</span>
            </span>
            <span className="tabular-nums text-muted">
              {fmt(bond.intimacy)}
              {tier.next ? ` / ${fmt(tier.next.min)}` : ' · tối thượng'}
            </span>
          </div>
          <ProgressBar value={tier.pct * 100} color="#ff7d9a" height={6} />
          {tier.next && <div className="mt-1 text-[11px] text-muted">Còn {fmt(tier.next.min - bond.intimacy)} để đạt {tier.next.name}</div>}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-line bg-black/10 px-3 py-2 text-[12px]">
          <CalendarHeart size={15} className="shrink-0 text-sakura" />
          <span className="text-muted">Kỷ niệm {anniv.years} năm sau</span>
          <span className="ml-auto font-semibold text-ink">
            <Countdown to={anniv.date} compact />
          </span>
        </div>

        <div className="mt-auto flex items-center gap-2">
          <button
            className="btn btn-sm flex-1"
            style={{ borderColor: 'color-mix(in oklab, var(--sakura) 45%, transparent)' }}
            onClick={() => void gift()}
            disabled={!canAct}
            title={canAct ? undefined : `Chỉ ${a.name} hoặc ${b.name} mới tặng hoa được`}
          >
            <Flower2 size={15} className="text-sakura" /> Tặng hoa <span className="text-muted">+{GIFT}</span>
          </button>
          {canAct && (
            <button className="btn btn-ghost btn-sm text-muted hover:text-cinnabar" onClick={() => setConfirm(true)}>
              <HeartCrack size={14} /> Giải trừ
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Giải trừ duyên phận?"
        han="断"
        confirmLabel="Giải trừ"
        onConfirm={() => void onRemove()}
      >
        Mối duyên <b className="text-ink">{t.name}</b> giữa <b className="text-ink">{a.name}</b> và <b className="text-ink">{b.name}</b> cùng {fmt(bond.intimacy)} điểm thân mật sẽ mất đi. Không thể hoàn tác.
      </ConfirmDialog>
    </motion.article>
  )
}
