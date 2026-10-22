// "Hỏi đáp": accordion bằng <details> (bàn phím, trình đọc màn hình hỗ trợ sẵn).
import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Reveal, SectionHeader } from '../shared'

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: 'Thủy Hàn Lệnh có miễn phí không?',
    a: 'Có. Đăng nhập bằng Discord là dùng được ngay — lập bang, Kim Lan hay Team đều miễn phí.',
  },
  {
    q: 'Có đọc tin nhắn hay máy chủ Discord của tôi không?',
    a: (
      <>
        Không. Hệ thống chỉ xin quyền <i>identify</i> của Discord — tức là <b className="text-ink">tên và ảnh đại diện</b> để nhận ra bạn. Không đọc tin nhắn, không xem danh sách máy chủ,
        không đăng gì thay bạn.
      </>
    ),
  },
  {
    q: 'Dữ liệu của bang lưu ở đâu?',
    a: 'Trên máy chủ riêng của hệ thống, trong cơ sở dữ liệu PostgreSQL. Dữ liệu chỉ dùng để chạy Thủy Hàn Lệnh — không bán, không chia sẻ cho ai.',
  },
  {
    q: 'Đây có phải sản phẩm của NetEase hay VNG?',
    a: 'Không. Thủy Hàn Lệnh là dự án cộng đồng, do người chơi làm cho người chơi, không liên kết với NetEase hay VNG.',
  },
  {
    q: 'Dùng trên điện thoại được không?',
    a: 'Được. Giao diện tự co giãn cho điện thoại, máy tính bảng và máy tính — mở bằng trình duyệt là dùng, không cần cài thêm gì.',
  },
]

export function Faq() {
  return (
    <section id="hoi-dap" aria-labelledby="lp-faq" className="relative px-4 py-20 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <SectionHeader id="lp-faq" eyebrow="Hỏi đáp" han="问" title="Những điều hay được hỏi" />
        <div className="mt-10 space-y-3">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 0.05}>
              <details className="lp-faq panel group !rounded-2xl" open={i === 0}>
                <summary className="flex cursor-pointer items-center gap-4 rounded-2xl px-5 py-4 text-left">
                  <span className="han grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong text-[15px] text-gold" aria-hidden>
                    问
                  </span>
                  <span className="flex-1 text-[15px] font-semibold text-ink">{f.q}</span>
                  <ChevronDown size={18} className="lp-faq-chevron shrink-0 text-gold transition-transform duration-300" aria-hidden />
                </summary>
                <div className="px-5 pb-5 pl-[4.25rem] text-[14px] leading-relaxed text-ink-2">{f.a}</div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
