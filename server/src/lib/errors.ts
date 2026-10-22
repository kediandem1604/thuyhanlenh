/** Lỗi nghiệp vụ có mã HTTP — message tiếng Việt hiển thị thẳng lên toast. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export const badRequest = (message: string, code = 'bad_request') => new AppError(400, code, message)
export const unauthorized = (message = 'Bạn cần đăng nhập.', code = 'unauthorized') => new AppError(401, code, message)
export const forbidden = (message = 'Chức vụ của bạn chưa đủ quyền làm việc này.', code = 'forbidden') => new AppError(403, code, message)
export const notFound = (message = 'Không tìm thấy dữ liệu.', code = 'not_found') => new AppError(404, code, message)
export const conflict = (message: string, code = 'conflict') => new AppError(409, code, message)

/** Ném lỗi 400 khi kết quả luật nghiệp vụ không đạt */
export function assertRule(check: { ok: true } | { ok: false; error: string }, status = 400): void {
  if (!check.ok) throw new AppError(status, status === 403 ? 'forbidden' : 'rule', check.error)
}
