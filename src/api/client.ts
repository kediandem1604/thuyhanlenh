import { CLIENT_HEADER, CSRF_HEADER, CSRF_VALUE, IDEMPOTENCY_HEADER, ORG_HEADER, type ApiErrorBody } from '@/domain/api'

/** Lỗi từ API — `message` đã là tiếng Việt, hiện thẳng lên toast. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

function makeId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  }
}

/** Mỗi tab một id — server bỏ qua tab này khi phát "invalidate" cho thay đổi do chính nó gây ra. */
export const CLIENT_ID = makeId()

/* ---------------- Tổ chức đang chọn (gửi qua header x-org-id) ---------------- */

const ORG_KEY = 'thuy-han-lenh:org'
let currentOrgId: string | null = (() => {
  try {
    return localStorage.getItem(ORG_KEY)
  } catch {
    return null
  }
})()

export function getOrgId() {
  return currentOrgId
}

export function setOrgId(id: string | null) {
  currentOrgId = id
  try {
    if (id) localStorage.setItem(ORG_KEY, id)
    else localStorage.removeItem(ORG_KEY)
  } catch {
    /* trình duyệt chặn lưu trữ — vẫn dùng được trong phiên */
  }
}

interface RequestOptions {
  /** gửi kèm Idempotency-Key (route tạo bản ghi) */
  idempotent?: boolean
  signal?: AbortSignal
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { [CLIENT_HEADER]: CLIENT_ID, Accept: 'application/json' }
  if (currentOrgId) headers[ORG_HEADER] = currentOrgId
  if (method !== 'GET') headers[CSRF_HEADER] = CSRF_VALUE
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.idempotent) headers[IDEMPOTENCY_HEADER] = makeId()
  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: opts.signal,
    })
  } catch {
    throw new ApiError(0, 'network', 'Không kết nối được máy chủ. Kiểm tra mạng hoặc máy chủ API.')
  }
  const text = await res.text()
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = undefined
    }
  }
  if (!res.ok) {
    const err = (data as ApiErrorBody | undefined)?.error
    throw new ApiError(res.status, err?.code ?? `http_${res.status}`, err?.message ?? `Máy chủ trả lỗi ${res.status}.`)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body: unknown = {}, opts?: RequestOptions) => request<T>('POST', path, body, opts),
  patch: <T>(path: string, body: unknown = {}, opts?: RequestOptions) => request<T>('PATCH', path, body, opts),
  put: <T>(path: string, body: unknown = {}, opts?: RequestOptions) => request<T>('PUT', path, body, opts),
  del: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, undefined, opts),
}

export function errorMessage(e: unknown) {
  return e instanceof ApiError ? e.message : 'Có lỗi xảy ra, thử lại sau.'
}
