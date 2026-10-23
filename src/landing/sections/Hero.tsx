// Đầu trang: thương hiệu + câu khẩu hiệu + bộ ba chibi + hai nút kêu gọi + gợi ý cuộn.
import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, Crown } from 'lucide-react'
import { Chibi } from '@/components/chibi/Chibi'
import { DUNGEONS } from '@/domain/constants'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { cn } from '@/lib/utils'
import { CtaGroup, type CtaProps } from '../shared'
import { HERO_TRIO } from '../mocks/sample'

const EASE = [0.22, 1, 0.36, 1] as const
const RING_TEXT = '江湖令 · 帮会 · 金兰 · 队伍 · 同心 · '
/** boss đầu của Hủy Nặc Thành — khớp với khung minh họa phó bản bên dưới */
const FIRST_KILL = (DUNGEONS.find((d) => d.id === 'huy-nac-thanh') ?? DUNGEONS[0]).bosses[0].name

const PATH_CHIPS = [
  { theme: 'kinh-hong', han: '帮', name: 'Bang Hội' },
  { theme: 'bach-gia', han: '兰', name: 'Kim Lan' },
  { theme: 'thanh-ngoc', han: '队', name: 'Team' },
] as const

function FloatCard({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.7 + delay, duration: 0.6, ease: EASE }}
      className={cn('absolute z-[3]', className)}
    >
      <div className="lp-float panel flex items-center gap-2.5 !rounded-2xl px-3 py-2 text-left" style={{ animationDelay: `${-delay * 3}s` } as CSSProperties}>
        {children}
      </div>
    </motion.div>
  )
}

function Stage() {
  const wide = useMediaQuery('(min-width: 1024px)')
  const sm = useMediaQuery('(min-width: 640px)')
  const k = wide ? 1 : sm ? 0.85 : 0.62
  return (
    <div className="relative mx-auto grid w-full max-w-[560px] place-items-center pt-8 sm:pb-16 sm:pt-14" aria-hidden>
      {/* trăng mực + vòng chữ xoay */}
      <div className="absolute left-1/2 top-[46%] aspect-square w-[88%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="absolute inset-[9%] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, color-mix(in oklab, var(--gold) 26%, transparent), color-mix(in oklab, var(--gold) 8%, transparent) 55%, transparent 72%)',
          }}
        />
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
          <circle cx={50} cy={50} r={48} fill="none" stroke="var(--gold)" strokeOpacity={0.22} strokeWidth={0.25} strokeDasharray="0.5 1.4" />
          <circle cx={50} cy={50} r={39} fill="none" stroke="var(--gold)" strokeOpacity={0.18} strokeWidth={0.25} />
        </svg>
        <div className="animate-spin-slow absolute inset-[3%]">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <defs>
              <path id="lp-hero-orbit" d="M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
            </defs>
            <text className="han" fontSize={4.6} fill="var(--gold)" fillOpacity={0.42}>
              <textPath href="#lp-hero-orbit" textLength={280} lengthAdjust="spacing">
                {RING_TEXT.repeat(3)}
              </textPath>
            </text>
          </svg>
        </div>
        <span className="han absolute inset-0 grid place-items-center text-[length:min(62vw,300px)] leading-none text-gold opacity-[0.06]">令</span>
      </div>

      {/* bộ ba */}
      <div className="relative z-[2] flex items-end justify-center pt-4">
        {HERO_TRIO.map((h, i) => {
          const center = i === 1
          return (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + [0.12, 0, 0.24][i], type: 'spring', damping: 15, stiffness: 120 }}
              className={cn('relative', !center && '-mx-3 sm:-mx-4', center && 'z-[1]')}
            >
              <Chibi look={h.look} classId={h.classId} size={(center ? 210 : 158) * k} flip={i === 2} title={h.name} />
            </motion.div>
          )
        })}
      </div>
      {/* bệ mây mực */}
      <div
        className="relative z-[1] -mt-8 h-10 w-[78%] rounded-[50%]"
        style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--bg) 85%, transparent), transparent)' }}
      />

      {sm && (
        <>
          {/* hai thẻ hai bên chỉ đủ chỗ khi màn rộng (≥1024px); màn vừa chỉ giữ thẻ giữa dưới */}
          {wide && (
            <FloatCard className="left-0 top-0 lg:-left-6">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--gold)_18%,transparent)]">
              <Crown size={15} className="text-gold" />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">First kill · Ác Mộng</span>
              <span className="block text-[12.5px] font-semibold text-ink">{FIRST_KILL}</span>
            </span>
            </FloatCard>
          )}
          {wide && (
            <FloatCard className="right-0 top-12 lg:-right-6" delay={0.25}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--jade)_18%,transparent)]">
              <CalendarDays size={15} className="text-jade" />
            </span>
            <span className="leading-tight">
              <span className="block text-[12.5px] font-semibold text-ink">Bang chiến · 20:30</span>
              <span className="block text-[11.5px] text-muted">22/30 đã điểm danh</span>
            </span>
            </FloatCard>
          )}
          <FloatCard className="bottom-0 left-1/2 -translate-x-1/2" delay={0.5}>
            <span className="seal h-8 w-8 text-[13px]">二姐</span>
            <span className="leading-tight">
              <span className="block text-[12.5px] font-semibold text-ink">Nhị tỷ</span>
              <span className="block text-[11.5px] text-muted">Kim Lan · ghế 2</span>
            </span>
          </FloatCard>
        </>
      )}
    </div>
  )
}

export function Hero(cta: CtaProps) {
  return (
    <section aria-labelledby="lp-title" className="relative flex min-h-[100svh] flex-col">
      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 content-center items-center gap-x-10 gap-y-5 px-4 pb-24 pt-20 sm:gap-y-6 sm:pt-28 lg:grid-cols-[1.05fr_1fr] lg:gap-y-8 lg:px-8 lg:pb-20">
        {/* thương hiệu + khẩu hiệu */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-halo text-center lg:self-end lg:text-left"
        >
          <div className="eyebrow flex items-center justify-center gap-2 lg:justify-start">
            <span className="hidden h-px w-6 bg-gold/60 sm:block" />
            Cho người chơi Nghịch Thủy Hàn
          </div>
          <div className="mt-4 flex items-center justify-center gap-3 sm:gap-4 lg:justify-start">
            <span className="seal h-12 w-12 shrink-0 rounded-[14px] text-[28px] sm:h-16 sm:w-16 sm:rounded-[18px] sm:text-[38px]" aria-hidden>
              令
            </span>
            <h1 id="lp-title" className="title-display text-gold-grad whitespace-nowrap text-[42px] sm:text-[60px] lg:text-[64px]">
              Thủy Hàn Lệnh
            </h1>
          </div>
          <p className="title-display mx-auto mt-3 max-w-[19ch] text-balance text-[29px] leading-[1.15] text-ink sm:mt-4 sm:max-w-none sm:text-[38px] lg:mx-0">
            Giang hồ của bạn, gọn trong <span className="text-gold-grad italic">một lệnh bài</span>.
          </p>
        </motion.div>

        {/* sân khấu chibi — giữa khối chữ trên màn hẹp, cột phải trên màn rộng */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
        >
          <Stage />
        </motion.div>

        {/* mô tả + nút */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          className="flex flex-col items-center gap-5 text-center lg:items-start lg:self-start lg:text-left"
        >
          <p className="text-halo max-w-[34rem] text-[15.5px] leading-relaxed text-ink-2 sm:text-[16.5px]">
            Một nơi để vận hành <b className="text-ink">Bang hội</b>, <b className="text-ink">Kim Lan</b> <span className="han text-gold">金兰</span> và{' '}
            <b className="text-ink">Team</b>: tiến độ phó bản, bày trận, lịch điểm danh, sư đồ… gọn trên một trang, mở bằng điện thoại cũng mượt.
          </p>
          <ul className="hidden flex-wrap justify-center gap-2 sm:flex lg:justify-start" aria-label="Ba kiểu tổ chức">
            {PATH_CHIPS.map((c) => (
              <li key={c.theme} data-org-theme={c.theme}>
                <span className="chip h-7 gap-1.5 border-[var(--line-strong)] px-3 text-[12.5px] text-gold">
                  <span className="han text-[15px]" aria-hidden>
                    {c.han}
                  </span>
                  {c.name}
                </span>
              </li>
            ))}
          </ul>
          <div className="w-full max-w-md lg:max-w-none">
            <CtaGroup {...cta} />
          </div>
        </motion.div>
      </div>

      {/* gợi ý cuộn */}
      <a
        href="#con-duong"
        className="group absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted transition hover:text-gold sm:flex"
      >
        <span className="relative h-8 w-5 rounded-full border border-line-strong">
          <span className="lp-cue-dot absolute left-1/2 top-1.5 h-1.5 w-1 -translate-x-1/2 rounded-full bg-gold" />
        </span>
        Khám phá
      </a>
    </section>
  )
}
