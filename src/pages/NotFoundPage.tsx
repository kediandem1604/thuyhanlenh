import { Link } from 'react-router'
import { Chibi } from '@/components/chibi/Chibi'
import { lookFromSeed } from '@/data/seed'
import { useOrgWords } from '@/pages/dashboard/orgWords'

const LOST = lookFromSeed('lost-wanderer', 'cuu-linh', 'nu')

export default function NotFoundPage() {
  const w = useOrgWords()
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div className="flex flex-col items-center">
        <Chibi look={{ ...LOST, expression: 'shy', mood: 'cute' }} classId="cuu-linh" size={180} />
        <h1 className="title-display text-gold-grad mt-4 text-[40px]">Lạc đường rồi…</h1>
        <p className="mt-2 max-w-sm text-muted">Trang này không có trong bản đồ Biện Kinh. Có lẽ bị sương mù che mất.</p>
        <Link to="/" className="btn btn-gold mt-6">
          Về {w.home}
        </Link>
      </div>
    </div>
  )
}
