import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, Crown, RefreshCw, ShieldCheck, UserMinus } from 'lucide-react'
import { api, errorMessage } from '@/api/client'
import type { AdminOrgRow } from '@/domain/api'
import { ORG_TYPES } from '@/domain/orgs'
import { Panel, SectionTitle } from '@/components/ui/Panel'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { useGuild } from '@/store/guild'
import { celebrate, toast } from '@/store/ui'
import { OrgBadge } from './OrgDirectory'

/**
 * Quản trị hệ thống — chỉ chủ hệ thống thấy (người giữ ghế đứng đầu bang chính).
 * Xem mọi tổ chức và vào một tổ chức với vai trò người đứng đầu, kể cả tổ chức mình chưa ở
 * (vd Kim Lan mẫu mà Đại tỷ là nhân vật chưa có chủ, không ai mời được).
 */
export function AdminPanel() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AdminOrgRow[] | null>(null)
  const [picked, setPicked] = useState<AdminOrgRow | null>(null)

  const load = useCallback(() => {
    api
      .get<{ orgs: AdminOrgRow[] }>('/api/admin/orgs')
      .then((r) => setRows(r.orgs))
      .catch((e) => {
        setRows([])
        toast({ tone: 'error', title: 'Không tải được danh sách tổ chức', desc: errorMessage(e) })
      })
  }, [])
  useEffect(load, [load])

  const open = (orgId: string) => {
    navigate('/')
    useGuild.getState().switchOrg(orgId)
  }

  return (
    <Panel corners>
      <SectionTitle
        han="管"
        title="Quản trị hệ thống"
        subtitle="Chỉ chủ hệ thống thấy — vào bất kỳ tổ chức nào với vai trò người đứng đầu"
        right={
          <button className="btn btn-ghost btn-icon btn-sm" onClick={load} aria-label="Tải lại">
            <RefreshCw size={15} />
          </button>
        }
      />
      <div className="grid gap-2">
        {rows === null && <p className="py-6 text-center text-[13px] text-muted">Đang tải…</p>}
        {rows?.map((r) => {
          const info = ORG_TYPES[r.org.type]
          return (
            <div key={r.org.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <OrgBadge org={r.org} />
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-14 text-[11.5px]">
                  {r.leader ? (
                    <span className="text-muted">
                      Đứng đầu: <b className="text-ink-2">{r.leader.name}</b>
                      {!r.leader.claimed && <span className="ml-1 text-cinnabar">· chưa có chủ</span>}
                    </span>
                  ) : (
                    <span className="text-cinnabar">Chưa có người đứng đầu</span>
                  )}
                  {r.isFull && <span className="chip !h-5 text-muted">Đủ người</span>}
                </div>
              </div>
              {r.isLeader ? (
                <button className="btn btn-sm" onClick={() => open(r.org.id)}>
                  <Crown size={14} className="text-gold" /> Bạn đứng đầu · Mở <ArrowRight size={13} />
                </button>
              ) : (
                <button className="btn btn-sm btn-gold" onClick={() => setPicked(r)}>
                  <ShieldCheck size={14} /> {r.isMember ? `Lên đứng đầu ${info.name}` : `Vào làm ${r.org.type === 'kimlan' ? 'Đại ca' : 'người đứng đầu'}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {picked && <LeadDialog row={picked} onClose={() => setPicked(null)} onDone={(orgId) => open(orgId)} />}
    </Panel>
  )
}

function LeadDialog({ row, onClose, onDone }: { row: AdminOrgRow; onClose: () => void; onDone: (orgId: string) => void }) {
  const needReplace = !row.isMember && row.isFull
  const [replace, setReplace] = useState<string | null>(row.replaceable[0]?.memberId ?? null)
  const [busy, setBusy] = useState(false)
  const info = ORG_TYPES[row.org.type]
  const kimlan = row.org.type === 'kimlan'

  const submit = async () => {
    setBusy(true)
    try {
      await api.post(`/api/admin/orgs/${row.org.id}/lead`, needReplace ? { replaceMemberId: replace } : {})
      celebrate({ han: row.org.han, title: `${info.name} ${row.org.name}`, subtitle: kimlan ? 'Bạn đã ngồi ghế Đại ca — huynh đệ lùi một ghế.' : 'Bạn đã là người đứng đầu.' })
      onClose()
      onDone(row.org.id)
    } catch (e) {
      toast({ tone: 'error', title: 'Chưa vào được', desc: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      han={row.org.han}
      title={row.isMember ? `Lên đứng đầu ${row.org.name}` : `Vào ${row.org.name}`}
      subtitle={kimlan ? 'Bạn ngồi ghế 1 (Đại ca), mọi người lùi một ghế' : 'Người đứng đầu hiện tại lui xuống chức phó'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Hủy
          </button>
          <button className="btn btn-gold" disabled={busy || (needReplace && !replace)} onClick={() => void submit()}>
            <ShieldCheck size={15} /> {busy ? 'Đang vào…' : 'Xác nhận'}
          </button>
        </>
      }
    >
      {needReplace ? (
        <div>
          <p className="mb-3 text-[13px] text-ink-2">
            {kimlan ? 'Kim Lan tối đa 12 người' : `${row.org.name} đã đủ người`} — chọn một nhân vật <b className="text-ink">chưa có chủ</b> nhường chỗ cho bạn. Nhân vật đó vẫn ở các tổ chức khác (nếu có).
          </p>
          {row.replaceable.length === 0 ? (
            <p className="rounded-xl border border-cinnabar/40 bg-cinnabar/10 p-3 text-[13px] text-ink-2">Mọi thành viên đều đã có chủ tài khoản — không thể nhường chỗ.</p>
          ) : (
            <div className="grid max-h-[320px] gap-1.5 overflow-y-auto pr-1">
              {row.replaceable.map((m) => (
                <label
                  key={m.memberId}
                  className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition', replace === m.memberId ? 'border-gold bg-gold/10' : 'border-line hover:border-line-strong')}
                >
                  <input type="radio" name="replace" className="accent-[var(--gold)]" checked={replace === m.memberId} onChange={() => setReplace(m.memberId)} />
                  <UserMinus size={14} className="text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{m.name}</span>
                    <span className="block text-[11.5px] text-muted">
                      {m.title}
                      {m.seat ? ` · ghế ${m.seat}` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-ink-2">
          {row.isMember ? 'Bạn đã là thành viên — xác nhận để lên đứng đầu.' : `Nhân vật của bạn sẽ vào ${info.name} ${row.org.name} và đứng đầu ngay.`}
        </p>
      )}
    </Modal>
  )
}
