import { PageHeader } from './PageHeader'
import { Panel } from './Panel'
import { EmptyState } from './EmptyState'

/** Trang tạm trong lúc dựng */
export function ComingSoon({ title, han }: { title: string; han: string }) {
  return (
    <div>
      <PageHeader eyebrow="Đang dựng" title={title} han={han} />
      <Panel corners>
        <EmptyState han={han} title="Đang mài kiếm…" desc="Phân hệ này đang được xây dựng." />
      </Panel>
    </div>
  )
}
