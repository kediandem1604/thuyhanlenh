import { useMemo } from 'react'
import { create } from 'zustand'
import { api, ApiError, errorMessage, setOrgId } from '@/api/client'
import { CLASSES, RANKS } from '@/domain/constants'
import type { Feature } from '@/domain/orgs'
import { SLICES, type ApiOkBody, type GuildSnapshot, type Me, type Slice } from '@/domain/api'
import type { Permission } from '@/domain/permissions'
import type {
  Announcement,
  Application,
  ApplicationStage,
  Bond,
  BondType,
  ClassId,
  ClearRecord,
  GuildEvent,
  LedgerEntry,
  LootItem,
  Member,
  OrgType,
  RankId,
  RsvpStatus,
  TeamTemplate,
  WarRecord,
} from '@/domain/types'
import { toast } from './ui'

/*
 * STORE DỮ LIỆU BANG (giai đoạn 2 — dữ liệu nằm trên server)
 * - State là bản sao của snapshot server; mọi thay đổi đi qua API rồi ghép slice server trả về.
 * - Action là async, trả `Result` — `{ ok: true, data }` hoặc `{ ok: false, error }` (message tiếng Việt).
 *   Lỗi của action "bấm là xong" (tick nhiệm vụ, điểm danh, tặng hoa…) được store tự toast.
 * - Selector chỉ trả lát cắt có sẵn: useGuild(s => s.members). KHÔNG trả object/array mới trong selector.
 */

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

export interface NewMemberInput {
  name: string
  classId: ClassId
  rank?: RankId
  level?: number
  power?: number
  title?: string
  bio?: string
  gender?: 'nam' | 'nu'
  look?: Member['look']
}

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface GuildActions {
  // vòng đời
  setMe: (me: Me | null) => void
  /** chuyển sang tổ chức khác (cổng vào sẽ tải lại /api/me + dữ liệu) */
  switchOrg: (orgId: string | null) => void
  /** tải lại /api/me + toàn bộ dữ liệu mà không hiện màn chờ (đổi thông tin tổ chức, quyền…) */
  refreshMe: () => Promise<void>
  load: () => Promise<void>
  refresh: (slices: Slice[]) => Promise<void>
  applySnapshot: (snap: Partial<GuildSnapshot>) => void
  clear: () => void
  // Thành viên
  addMember: (input: NewMemberInput) => Promise<Result<Member>>
  updateMember: (id: string, patch: Partial<Pick<Member, 'name' | 'classId' | 'level' | 'power' | 'activity' | 'title' | 'bio' | 'look'>>) => Promise<Result>
  removeMember: (id: string) => Promise<Result>
  setRank: (id: string, rank: RankId) => Promise<Result>
  /** Kim Lan: đổi ghế kết nghĩa (1 = Đại ca — đưa ai lên ghế 1 là nhường vị trí đứng đầu) */
  setSeat: (id: string, seat: number) => Promise<Result>
  // Sư đồ
  createMentorship: (masterId: string, discipleId: string) => Promise<Result>
  toggleMentorTask: (mentorshipId: string, taskId: string) => Promise<Result>
  advanceMentorship: (mentorshipId: string) => Promise<Result>
  graduate: (mentorshipId: string) => Promise<Result>
  dissolveMentorship: (mentorshipId: string) => Promise<Result>
  // Tình duyên
  createBond: (aId: string, bId: string, type: BondType, note: string) => Promise<Result>
  addIntimacy: (bondId: string, amount: number) => Promise<Result>
  removeBond: (bondId: string) => Promise<Result>
  // Phó bản
  recordClear: (input: Omit<ClearRecord, 'id'>) => Promise<Result<{ firstKill: boolean; newRecord: boolean }>>
  // Sự kiện
  addEvent: (input: Omit<GuildEvent, 'id' | 'rsvp'>) => Promise<Result<GuildEvent>>
  removeEvent: (id: string) => Promise<Result>
  setRsvp: (eventId: string, memberId: string, status: RsvpStatus | null) => Promise<Result>
  // Bang chiến
  addWar: (input: Omit<WarRecord, 'id'>) => Promise<Result>
  // Bang khố
  addLedger: (input: Omit<LedgerEntry, 'id' | 'date' | 'category'> & { category?: LedgerEntry['category'] }) => Promise<Result>
  placeBid: (itemId: string, memberId: string, amount: number) => Promise<Result>
  closeAuction: (itemId: string) => Promise<Result>
  addLoot: (input: Omit<LootItem, 'id' | 'bids' | 'status'>) => Promise<Result>
  // Chiêu mộ
  addApplication: (input: Omit<Application, 'id' | 'stage' | 'appliedAt' | 'look'> & { look?: Application['look'] }) => Promise<Result>
  moveApplication: (id: string, stage: ApplicationStage) => Promise<Result>
  acceptApplication: (id: string) => Promise<Result<Member>>
  // Bảng tin
  addAnnouncement: (input: Omit<Announcement, 'id' | 'date' | 'pinned' | 'authorId'>) => Promise<Result>
  togglePin: (id: string) => Promise<Result>
  removeAnnouncement: (id: string) => Promise<Result>
  // Đội hình
  saveTeam: (team: Omit<TeamTemplate, 'id' | 'createdAt'> & { id?: string }) => Promise<Result<TeamTemplate>>
  deleteTeam: (id: string) => Promise<Result>
  // Khác
  resetDemo: () => Promise<Result>
}

export interface GuildState extends GuildSnapshot, GuildActions {
  status: LoadStatus
  error: string | null
  me: Me | null
  /** id môn hạ của người đang đăng nhập ('' khi chưa có) */
  currentUserId: string
  /** tăng mỗi khi cần cổng vào kiểm tra lại phiên (đổi tổ chức, vào tổ chức mới…) */
  reloadKey: number
}

const EMPTY: GuildSnapshot = {
  members: [],
  mentorships: [],
  bonds: [],
  progress: {},
  clears: [],
  events: [],
  wars: [],
  ledger: [],
  loot: [],
  applications: [],
  announcements: [],
  activities: [],
  teams: [],
}

type Ok<T> = ApiOkBody<T>

export const useGuild = create<GuildState>()((set, get) => {
  /**
   * Chạy một lời gọi API ghi dữ liệu:
   * - `optimistic`: cập nhật giao diện ngay, lỗi thì hoàn tác
   * - `notify`: tự toast lỗi (cho thao tác không có nơi hiển thị lỗi riêng)
   */
  async function mutate<T>(
    call: () => Promise<Ok<T>>,
    opts: { optimistic?: (s: GuildState) => Partial<GuildSnapshot>; notify?: boolean } = {},
  ): Promise<Result<T>> {
    let rollback: Partial<GuildSnapshot> | null = null
    if (opts.optimistic) {
      const next = opts.optimistic(get())
      rollback = Object.fromEntries(Object.keys(next).map((k) => [k, get()[k as Slice]])) as Partial<GuildSnapshot>
      set(next)
    }
    try {
      const body = await call()
      if (body?.snapshot) get().applySnapshot(body.snapshot)
      return { ok: true, data: body?.result as T }
    } catch (e) {
      if (rollback) set(rollback)
      const error = errorMessage(e)
      if (opts.notify) toast({ tone: 'error', title: 'Không thực hiện được', desc: error })
      if (e instanceof ApiError && e.status === 401) get().setMe(null)
      return { ok: false, error }
    }
  }

  const findMember = (id?: string) => get().members.find((m) => m.id === id)

  return {
    ...EMPTY,
    status: 'idle',
    error: null,
    me: null,
    currentUserId: '',
    reloadKey: 0,

    /* ---------------- Vòng đời ---------------- */
    setMe: (me) => set({ me, currentUserId: me?.member?.id ?? '' }),
    switchOrg: (orgId) => {
      setOrgId(orgId)
      set((st) => ({ ...EMPTY, status: 'idle', reloadKey: st.reloadKey + 1 }))
    },
    refreshMe: async () => {
      try {
        const me = await api.get<Me>('/api/me')
        get().setMe(me)
        if (me.member) await get().refresh([...SLICES])
        else set((st) => ({ reloadKey: st.reloadKey + 1 }))
      } catch {
        /* lần sau thử lại */
      }
    },
    load: async () => {
      set({ status: 'loading', error: null })
      try {
        const snap = await api.get<GuildSnapshot>('/api/snapshot')
        set({ ...EMPTY, ...snap, status: 'ready' })
      } catch (e) {
        set({ status: 'error', error: errorMessage(e) })
      }
    },
    refresh: async (slices) => {
      if (!slices.length) return
      try {
        const snap = await api.get<Partial<GuildSnapshot>>(`/api/snapshot?slices=${slices.join(',')}`)
        get().applySnapshot(snap)
      } catch {
        /* lần sau sẽ tải lại */
      }
    },
    applySnapshot: (snap) => {
      const patch: Partial<GuildState> = {}
      for (const k of SLICES) if (snap[k] !== undefined) (patch as Record<string, unknown>)[k] = snap[k]
      // giữ "me" khớp dữ liệu mới nhất (đổi chức vụ, tạo hình…)
      const me = get().me
      if (snap.members && me?.member) {
        const fresh = snap.members.find((m) => m.id === me.member!.id)
        if (fresh) patch.me = { ...me, member: fresh }
        // chức vụ của mình vừa đổi (truyền ngôi, nhường ghế Đại ca…) → nạp lại quyền từ /api/me
        if (fresh && fresh.rank !== me.member.rank) queueMicrotask(() => void get().refreshMe())
      }
      set(patch)
    },
    clear: () => set({ ...EMPTY, status: 'idle', error: null, me: null, currentUserId: '' }),

    /* ---------------- Thành viên ---------------- */
    addMember: async (input) => {
      const r = await mutate<{ id: string }>(() => api.post('/api/members', input, { idempotent: true }))
      if (!r.ok) return r
      const m = findMember(r.data.id)
      return m ? { ok: true, data: m } : { ok: false, error: 'Đã thêm nhưng chưa tải được dữ liệu mới.' }
    },
    updateMember: (id, patch) => mutate(() => api.patch(`/api/members/${id}`, patch)),
    removeMember: (id) => mutate(() => api.del(`/api/members/${id}`)),
    setRank: (id, rank) => mutate(() => api.put(`/api/members/${id}/rank`, { rank })),
    setSeat: (id, seat) => mutate(() => api.put(`/api/members/${id}/seat`, { seat })),

    /* ---------------- Sư đồ ---------------- */
    createMentorship: (masterId, discipleId) => mutate(() => api.post('/api/mentorships', { masterId, discipleId }, { idempotent: true })),
    toggleMentorTask: (mentorshipId, taskId) => {
      const ms = get().mentorships.find((m) => m.id === mentorshipId)
      const task = ms?.tasks.find((t) => t.id === taskId)
      const done = !task?.done
      return mutate(() => api.patch(`/api/mentorships/${mentorshipId}/tasks/${taskId}`, { done }), {
        notify: true,
        optimistic: (s) => ({
          mentorships: s.mentorships.map((m) =>
            m.id === mentorshipId ? { ...m, bond: m.bond + (done ? 120 : -120), tasks: m.tasks.map((t) => (t.id === taskId ? { ...t, done } : t)) } : m,
          ),
        }),
      })
    },
    advanceMentorship: (id) => mutate(() => api.post(`/api/mentorships/${id}/advance`)),
    graduate: (id) => mutate(() => api.post(`/api/mentorships/${id}/graduate`)),
    dissolveMentorship: (id) => mutate(() => api.del(`/api/mentorships/${id}`), { notify: true }),

    /* ---------------- Tình duyên ---------------- */
    createBond: (aId, bId, type, note) => mutate(() => api.post('/api/bonds', { aId, bId, type, note }, { idempotent: true })),
    addIntimacy: (bondId, amount) =>
      mutate(() => api.post(`/api/bonds/${bondId}/intimacy`, { amount }), {
        notify: true,
        optimistic: (s) => ({ bonds: s.bonds.map((b): Bond => (b.id === bondId ? { ...b, intimacy: b.intimacy + amount } : b)) }),
      }),
    removeBond: (bondId) => mutate(() => api.del(`/api/bonds/${bondId}`), { notify: true }),

    /* ---------------- Phó bản ---------------- */
    recordClear: (input) => mutate(() => api.post('/api/clears', input, { idempotent: true })),

    /* ---------------- Sự kiện ---------------- */
    addEvent: async (input) => {
      const r = await mutate<{ id: string }>(() => api.post('/api/events', input, { idempotent: true }))
      if (!r.ok) return r
      const ev = get().events.find((e) => e.id === r.data.id)
      return ev ? { ok: true, data: ev } : { ok: false, error: 'Đã tạo nhưng chưa tải được sự kiện.' }
    },
    removeEvent: (id) => mutate(() => api.del(`/api/events/${id}`), { notify: true }),
    setRsvp: (eventId, memberId, status) =>
      mutate(() => api.put(`/api/events/${eventId}/rsvp`, { status, memberId }), {
        notify: true,
        optimistic: (s) => ({
          events: s.events.map((e) => {
            if (e.id !== eventId) return e
            const rsvp = { ...e.rsvp }
            if (status) rsvp[memberId] = status
            else delete rsvp[memberId]
            return { ...e, rsvp }
          }),
        }),
      }),

    /* ---------------- Bang chiến ---------------- */
    addWar: (input) => mutate(() => api.post('/api/wars', input, { idempotent: true })),

    /* ---------------- Bang khố ---------------- */
    addLedger: (input) => mutate(() => api.post('/api/ledger/adjustments', { memberId: input.memberId, delta: input.delta, reason: input.reason }, { idempotent: true })),
    placeBid: (itemId, memberId, amount) => mutate(() => api.post(`/api/loot/${itemId}/bids`, { amount, memberId }, { idempotent: true })),
    closeAuction: (itemId) => mutate(() => api.post(`/api/loot/${itemId}/close`)),
    addLoot: (input) => mutate(() => api.post('/api/loot', input, { idempotent: true })),

    /* ---------------- Chiêu mộ ---------------- */
    addApplication: (input) => mutate(() => api.post('/api/applications', input, { idempotent: true })),
    moveApplication: (id, stage) =>
      mutate(() => api.patch(`/api/applications/${id}/stage`, { stage }), {
        notify: true,
        optimistic: (s) => ({ applications: s.applications.map((a) => (a.id === id ? { ...a, stage } : a)) }),
      }),
    acceptApplication: async (id) => {
      const r = await mutate<{ memberId: string }>(() => api.post(`/api/applications/${id}/accept`))
      if (!r.ok) return r
      const m = findMember(r.data.memberId)
      return m ? { ok: true, data: m } : { ok: false, error: 'Đã chấp nhận nhưng chưa tải được hồ sơ mới.' }
    },

    /* ---------------- Bảng tin ---------------- */
    addAnnouncement: (input) => mutate(() => api.post('/api/announcements', input, { idempotent: true })),
    togglePin: (id) =>
      mutate(() => api.patch(`/api/announcements/${id}/pin`), {
        notify: true,
        optimistic: (s) => ({ announcements: s.announcements.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)) }),
      }),
    removeAnnouncement: (id) => mutate(() => api.del(`/api/announcements/${id}`), { notify: true }),

    /* ---------------- Đội hình ---------------- */
    saveTeam: async (team) => {
      const r = await mutate<{ id: string }>(() => api.post('/api/teams', team, { idempotent: !team.id }))
      if (!r.ok) return r
      const t = get().teams.find((x) => x.id === r.data.id)
      return t ? { ok: true, data: t } : { ok: false, error: 'Đã lưu nhưng chưa tải được đội hình.' }
    },
    deleteTeam: (id) => mutate(() => api.del(`/api/teams/${id}`), { notify: true }),

    /* ---------------- Khác ---------------- */
    resetDemo: () => mutate(() => api.post('/api/dev/reset')),
  }
})

/* ---------------- Hook tiện ích ---------------- */

export function useMemberMap() {
  const members = useGuild((s) => s.members)
  return useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])) as Record<string, Member>, [members])
}

export function useMember(id: string | undefined | null) {
  return useGuild((s) => (id ? s.members.find((m) => m.id === id) : undefined))
}

export function useCurrentUser() {
  const id = useGuild((s) => s.currentUserId)
  return useMember(id)
}

/** Người đang đăng nhập có quyền này không (server vẫn kiểm tra lại). */
export function useCan(perm: Permission) {
  return useGuild((s) => !!s.me?.permissions.includes(perm))
}

/** Tổ chức đang xem */
export function useOrg() {
  return useGuild((s) => s.me?.org ?? null)
}

/** Loại tổ chức đang xem ('guild' khi chưa rõ) */
export function useOrgType(): OrgType {
  return useGuild((s) => s.me?.org?.type ?? 'guild')
}

/** Tổ chức đang xem có bật chức năng này không */
export function useFeature(f: Feature) {
  return useGuild((s) => !!s.me?.org?.features.includes(f))
}

/** Danh xưng hiển thị: Kim Lan dùng thứ bậc (Nhị tỷ…), loại khác dùng tên chức vụ */
export function rankLabel(m: Pick<Member, 'rank' | 'honorific'>) {
  return m.honorific ?? RANKS[m.rank].name
}

export function roleOf(m: Pick<Member, 'classId'>) {
  return CLASSES[m.classId].role
}

export function bondsOf(bonds: Bond[], memberId: string) {
  return bonds.filter((b) => b.aId === memberId || b.bId === memberId)
}
