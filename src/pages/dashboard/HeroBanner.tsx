import { useMemo } from 'react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { CalendarDays, Crown, Swords, Users } from 'lucide-react'
import { Chibi } from '@/components/chibi/Chibi'
import { CLASSES } from '@/domain/constants'
import { ORG_TYPES, themeOf } from '@/domain/orgs'
import { rankLabel, useCan, useCurrentUser, useFeature, useGuild, useOrg } from '@/store/guild'
import type { Member } from '@/domain/types'
import { useMediaQuery } from '@/lib/useMediaQuery'

export function greeting() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'Chào buổi sáng'
  if (h >= 11 && h < 14) return 'Chào buổi trưa'
  if (h >= 14 && h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function Pedestal({ m, size, delay, label }: { m: Member; size: number; delay: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 16 }}
      className="relative flex flex-col items-center"
    >
      <Link to={`/thanh-vien/${m.id}`} className="group relative block" aria-label={m.name}>
        <Chibi look={m.look} classId={m.classId} size={size} className="drop-shadow-[0_18px_24px_rgba(0,0,0,.45)] transition-transform duration-300 group-hover:-translate-y-1.5" />
      </Link>
      {/* đài mây */}
      <div className="-mt-6 h-5 w-[78%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--gold)_35%,transparent),transparent_70%)]" />
      <div className="mt-1 text-center">
        <div className="text-[12.5px] font-bold text-ink">{m.name}</div>
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-gold">{label}</div>
      </div>
    </motion.div>
  )
}

/** Đầu trang tổng quan của Bang Hội */
export function HeroBanner() {
  const me = useCurrentUser()
  const org = useOrg()
  const members = useGuild((s) => s.members)
  const wars = useGuild((s) => s.wars)
  const hasLich = useFeature('lich')
  const hasDungeon = useFeature('pho-ban')
  const hasWar = useFeature('bang-chien')
  const canRecord = useCan('clear.record')
  const wide = useMediaQuery('(min-width: 640px)')
  const type = ORG_TYPES[org?.type ?? 'guild']

  const { deputy, champion, online, streak } = useMemo(() => {
    const deputy = members.find((m) => m.rank === 'pho-bang-chu' && m.id !== me?.id)
    const champion = [...members].filter((m) => m.rank !== type.leaderRank && m.id !== deputy?.id && m.id !== me?.id).sort((a, b) => b.power - a.power)[0]
    const online = members.filter((m) => m.status === 'online' || m.status === 'in-raid').length
    let streak = 0
    for (const w of wars) {
      if (w.result === 'win') streak++
      else break
    }
    return { deputy, champion, online, streak }
  }, [members, wars, me?.id, type.leaderRank])

  return (
    <section className="panel corners relative overflow-hidden p-0">
      {/* nền banner */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(800px_380px_at_78%_40%,color-mix(in_oklab,var(--gold)_16%,transparent),transparent_70%)]" />
        <div className="absolute -right-10 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full border border-gold/15" />
        <div className="absolute right-[6%] top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full border border-dashed border-gold/15 animate-spin-slow" />
        <span className="han absolute bottom-[-40px] right-[30%] select-none text-[260px] leading-none text-gold opacity-[0.05]">{themeOf(org?.theme).han}</span>
        <svg className="absolute bottom-0 left-0 w-full opacity-60" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,90 C150,60 260,110 420,84 C560,62 640,104 800,88 C950,72 1050,100 1200,80 L1200,120 L0,120 Z" fill="color-mix(in oklab, var(--bg) 70%, transparent)" />
        </svg>
      </div>

      <div className="relative grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:gap-2">
        <div className="flex flex-col justify-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="eyebrow flex items-center gap-2">
            <span className="h-px w-6 bg-gold/60" />
            {greeting()}, {me?.name ?? 'đại hiệp'}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="title-display text-gold-grad mt-3 text-[46px] sm:text-[60px]"
          >
            {org?.name ?? type.name}
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-1 flex items-center gap-3">
            {org?.han && <span className="han text-[30px] text-cinnabar">{org.han}</span>}
            <span className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-gold/60 to-transparent" />
          </motion.div>
          {org?.motto && <p className="mt-3 max-w-md text-[14.5px] italic text-ink-2">“{org.motto}”</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            {!!org?.level && (
              <span className="chip text-gold">
                <Crown size={12} /> Bang cấp {org.level}
              </span>
            )}
            <span className="chip">
              <Users size={12} /> {members.length}
              {org?.capacity ? `/${org.capacity}` : ''} {type.memberWord}
            </span>
            <span className="chip" style={{ color: 'var(--jade)' }}>
              <span className="relative h-1.5 w-1.5 rounded-full bg-jade pulse-online" /> {online} đang trực tuyến
            </span>
            {hasWar && streak > 1 && (
              <span className="chip" style={{ color: 'var(--cinnabar)' }}>
                <Swords size={12} /> Chuỗi {streak} trận thắng
              </span>
            )}
          </div>

          {(hasLich || hasDungeon) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {hasLich && (
                <Link to="/lich" className="btn btn-gold">
                  <CalendarDays size={16} /> Lịch tuần này
                </Link>
              )}
              {hasDungeon && (
                <Link to={canRecord ? '/pho-ban?action=record' : '/pho-ban'} className="btn">
                  <Swords size={16} /> {canRecord ? 'Ghi nhận phó bản' : 'Tiến độ phó bản'}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="relative flex min-w-0 items-end justify-center gap-0 pt-4 sm:gap-4">
          {deputy && <Pedestal m={deputy} size={wide ? 132 : 92} delay={0.2} label={rankLabel(deputy)} />}
          {me && (
            <div className="relative -mb-1">
              <div className="absolute left-1/2 top-2 -translate-x-1/2 text-gold">
                <Crown size={wide ? 22 : 16} className="drop-shadow-[0_0_10px_var(--gold)]" />
              </div>
              <Pedestal m={me} size={wide ? 178 : 124} delay={0.1} label={rankLabel(me)} />
            </div>
          )}
          {champion && <Pedestal m={champion} size={wide ? 132 : 92} delay={0.3} label={wide ? `Chiến lực #1 · ${CLASSES[champion.classId].name}` : 'Chiến lực #1'} />}
        </div>
      </div>
    </section>
  )
}
