// "Tính năng nổi bật": các hàng xen trái / phải — chữ một bên, khung minh họa dựng từ thành phần giao diện thật một bên.
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Bullets, Reveal, SectionHeader } from '../shared'
import { CalendarMock } from '../mocks/CalendarMock'
import { DungeonMock } from '../mocks/DungeonMock'
import { KimLanMock } from '../mocks/KimLanMock'
import { MentorMock } from '../mocks/MentorMock'
import { StudioMock } from '../mocks/StudioMock'

interface Row {
  key: string
  han: string
  eyebrow: string
  title: ReactNode
  copy: ReactNode
  bullets: ReactNode[]
  mock: ReactNode
  caption: string
  /** giao diện tổ chức áp lên phần chữ (để đồng bộ với khung minh họa) */
  theme?: 'bach-gia'
}

const ROWS: Row[] = [
  {
    key: 'pho-ban',
    han: '征',
    eyebrow: 'Phó bản · Bày trận',
    title: 'Biết ngay tuần này còn boss nào, ai đứng ô nào',
    copy: 'Đánh dấu boss đã hạ theo từng độ khó, khắc ghi first kill của cả nhà và đếm ngược tới mốc reset tuần. Xếp đội hình bằng kéo thả — thiếu tank hay thiếu trị liệu là thấy ngay.',
    bullets: ['Tiến độ theo Thường · Anh Hùng · Ác Mộng', 'First kill và kỷ lục tốc độ được lưu lại', 'Lưu đội hình thành trận phổ, tuần sau dùng lại'],
    mock: <DungeonMock />,
    caption: 'Minh họa: tiến độ ba boss của một phó bản và một đội 5 người đang bày, còn trống một ô sát thương.',
  },
  {
    key: 'lich',
    han: '历',
    eyebrow: 'Lịch & điểm danh',
    title: 'Hẹn giờ một lần, cả bang cùng biết',
    copy: 'Lên lịch phó bản, bang chiến, yến tiệc theo tuần. Mỗi người tự điểm danh Đi · Có thể · Vắng, người dẫn đội nhìn con số là biết đã đủ người hay chưa.',
    bullets: ['Lịch tuần rõ ràng, xem tốt trên điện thoại', 'Điểm danh một chạm, có giới hạn số chỗ', 'Cập nhật trực tiếp, không cần tải lại trang'],
    mock: <CalendarMock />,
    caption: 'Minh họa: lịch bảy ngày tới, bấm vào một ngày để xem sự kiện và thử điểm danh.',
  },
  {
    key: 'su-do',
    han: '师',
    eyebrow: 'Sư đồ',
    title: 'Dẫn dắt tân thủ từ bái sư tới xuất sư',
    copy: 'Ghép cặp sư phụ – đồ đệ, đi qua năm chặng với nhiệm vụ cụ thể từng chặng. Ngày đồ đệ xuất sư, cả hai được ghi công vào bang.',
    bullets: ['5 chặng: Bái Sư → Nhập Môn → Luyện Công → Thực Chiến → Xuất Sư', 'Nhiệm vụ từng chặng, sư phụ và đồ đệ cùng đánh dấu', 'Cây truyền thừa: nhìn lại ai đã dạy ai'],
    mock: <MentorMock />,
    caption: 'Minh họa: một cặp sư đồ đang ở chặng Luyện Công, hai nhiệm vụ của chặng có thể bấm đánh dấu.',
  },
  {
    key: 'kim-lan',
    han: '兰',
    eyebrow: 'Kim Lan 金兰',
    title: 'Kim Lan Phổ — mười hai ghế, một lời thề',
    copy: 'Thứ bậc kết nghĩa xếp theo ghế: Đại ca, Nhị tỷ, Tam ca… tới Tiểu muội — danh xưng tự đổi theo giới tính nhân vật. Đại ca xếp lại ghế, hay nhường ghế khi cần.',
    bullets: ['Tối đa 12 người như trong game', 'Danh xưng tự tính theo ghế và giới tính', 'Mỗi nhà một bộ giao diện — đây là Bạch Gia'],
    mock: <KimLanMock />,
    caption: 'Minh họa: vòng Kim Lan 12 ghế trong giao diện Bạch Gia.',
    theme: 'bach-gia',
  },
  {
    key: 'chibi',
    han: '画',
    eyebrow: 'Xưởng chibi',
    title: 'Một chibi của riêng bạn, đi khắp giang hồ',
    copy: 'Chọn lưu phái, kiểu tóc, màu mắt, biểu cảm và khí chất. Chibi của bạn hiện ở mọi nơi: danh sách, bày trận, Kim Lan Phổ. Thử bấm “Đổi dáng” trong khung minh họa xem.',
    bullets: ['7 lưu phái, mỗi phái một trang phục và binh khí', 'Tóc, mắt, da, biểu cảm, phụ kiện, khí chất', 'Tải ảnh PNG làm ảnh đại diện'],
    mock: <StudioMock />,
    caption: 'Minh họa tương tác: chọn lưu phái, giới tính và bấm Đổi dáng để tạo ngoại hình mới.',
  },
]

function FeatureRow({ row, index }: { row: Row; index: number }) {
  const flip = index % 2 === 1
  const text = (
    <div className={cn('text-halo', row.theme && 'text-ink')} data-org-theme={row.theme}>
      <div className="eyebrow flex items-center gap-2.5">
        <span className="seal h-7 w-7 text-[15px] tracking-normal" aria-hidden>
          {row.han}
        </span>
        {row.eyebrow}
      </div>
      <h3 className="title-display mt-4 text-balance text-[30px] text-ink sm:text-[38px]">{row.title}</h3>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">{row.copy}</p>
      <Bullets items={row.bullets} className="mt-5" />
    </div>
  )
  return (
    <article className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <Reveal className={cn(flip && 'lg:order-2')}>{text}</Reveal>
      <Reveal delay={0.12} className={cn('min-w-0', flip && 'lg:order-1')}>
        <figure className="m-0">
          {row.mock}
          <figcaption className="sr-only">{row.caption}</figcaption>
        </figure>
      </Reveal>
    </article>
  )
}

export function Features() {
  return (
    <section id="tinh-nang" aria-labelledby="lp-features" className="relative px-4 py-20 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          id="lp-features"
          eyebrow="Tính năng nổi bật"
          han="功"
          title="Việc của bang, gọn như một trang sổ"
          sub="Các khung dưới đây dựng từ chính thành phần giao diện của app, với dữ liệu mẫu — vài chỗ bấm thử được."
        />
        <div className="mt-16 space-y-24 sm:mt-20 sm:space-y-32">
          {ROWS.map((r, i) => (
            <FeatureRow key={r.key} row={r} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
