// Khối kêu gọi cuối trang + chân trang (tuyên bố cộng đồng, lối vào đăng nhập thử ở máy dev).
import { FlaskConical } from 'lucide-react'
import { CtaGroup, Reveal, type CtaProps } from '../shared'

export function FinalCta(cta: CtaProps) {
  return (
    <section aria-labelledby="lp-final" className="relative px-4 pb-16 pt-10 sm:pb-24 lg:px-8">
      <Reveal className="mx-auto max-w-4xl">
        <div className="panel corners relative overflow-hidden px-5 py-12 text-center sm:px-10 sm:py-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(520px 260px at 50% 0%, color-mix(in oklab, var(--gold) 20%, transparent), transparent 70%), radial-gradient(420px 220px at 50% 110%, color-mix(in oklab, var(--jade) 10%, transparent), transparent 70%)',
            }}
          />
          <span className="han pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[260px] leading-none text-gold opacity-[0.05]" aria-hidden>
            令
          </span>
          <span className="seal relative mx-auto h-16 w-16 rounded-[18px] text-[38px]" aria-hidden>
            令
          </span>
          <h2 id="lp-final" className="title-display text-gold-grad relative mt-5 text-balance text-[34px] sm:text-[46px]">
            Lệnh bài đã sẵn, chỉ chờ bạn nhận
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-[15px] text-ink-2">
            Đăng nhập để lập tổ chức của riêng mình — hoặc dạo một vòng bản xem thử trước, chẳng mất gì.
          </p>
          <div className="relative mt-8">
            <CtaGroup {...cta} align="center" hintId={false} />
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function SiteFooter({ onDevLogin }: { onDevLogin?: () => void }) {
  return (
    <footer className="relative border-t border-line bg-[color-mix(in_oklab,var(--bg)_70%,transparent)] px-4 py-8 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 text-center md:flex-row md:items-start md:justify-between md:text-left">
        <div className="flex items-center gap-2.5">
          <span className="seal h-8 w-8 text-[17px]" aria-hidden>
            令
          </span>
          <span className="title-display text-[19px] text-ink">Thủy Hàn Lệnh</span>
        </div>
        <div className="max-w-xl text-[12.5px] leading-relaxed text-muted">
          <p>Dự án cộng đồng, không liên kết với NetEase hay VNG. Tên phó bản, nhân vật trong bản xem thử là hư cấu.</p>
          {onDevLogin && (
            <button type="button" onClick={onDevLogin} className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted underline decoration-dotted underline-offset-4 transition hover:text-gold">
              <FlaskConical size={13} aria-hidden /> Đăng nhập thử (máy dev)
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
