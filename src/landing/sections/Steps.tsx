// "Bắt đầu trong 3 bước": Discord → nhân vật → tổ chức / link mời.
import { Link2, UserRound } from 'lucide-react'
import { DiscordMark } from '@/auth/AuthScreens'
import { SEAT_HAN } from '@/domain/orgs'
import { Reveal, SectionHeader } from '../shared'

const STEPS = [
  {
    icon: <DiscordMark size={18} />,
    title: 'Đăng nhập bằng Discord',
    desc: 'Một chạm là xong, không phải nhớ thêm mật khẩu. Hệ thống chỉ nhận tên và ảnh đại diện của bạn.',
  },
  {
    icon: <UserRound size={18} aria-hidden />,
    title: 'Tạo nhân vật',
    desc: 'Tên trong game, lưu phái và chibi của bạn — dùng chung cho mọi tổ chức bạn tham gia.',
  },
  {
    icon: <Link2 size={18} aria-hidden />,
    title: 'Lập tổ chức hoặc bấm link mời',
    desc: 'Lập Bang hội, Kim Lan hay Team chỉ trong vài giây, hoặc mở link mời mà bang chủ, đại ca gửi cho bạn.',
  },
]

export function Steps() {
  return (
    <section id="bat-dau" aria-labelledby="lp-steps" className="relative px-4 py-20 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader id="lp-steps" eyebrow="Bắt đầu" han="始" title="Vào giang hồ trong 3 bước" />
        <ol className="relative mt-12 grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {/* sợi chỉ nối các bước (màn rộng) */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-[16%] right-[16%] top-[46px] hidden h-px md:block"
            style={{ background: 'linear-gradient(90deg, transparent, var(--line-strong) 12%, var(--line-strong) 88%, transparent)' }}
          />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Reveal delay={i * 0.12} className="h-full">
                <div className="panel corners relative flex h-full items-start gap-4 p-5 text-left md:flex-col md:items-center md:pb-6 md:text-center">
                  <span className="seal relative h-12 w-12 shrink-0 text-[26px] md:h-[52px] md:w-[52px] md:text-[28px]" aria-hidden>
                    {SEAT_HAN[i + 1]}
                  </span>
                  <div className="min-w-0 md:flex md:flex-col md:items-center">
                    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold md:mt-0">
                      {s.icon} Bước {i + 1}
                    </span>
                    <h3 className="title-display mt-1 text-[22px] text-ink md:mt-1.5 md:text-[24px]">{s.title}</h3>
                    <p className="mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-ink-2 md:mt-2">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
