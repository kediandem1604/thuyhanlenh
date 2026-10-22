import { useEffect, useRef } from 'react'
import type { OrgThemeId } from '@/domain/orgs'
import { useOrgThemeId } from '@/components/fx/useOrgTheme'
import { Cranes } from '@/components/fx/Cranes'

/*
 * Nền thủy mặc: trăng, sương, ba lớp núi và tháp cổ — di chuyển nhẹ theo chuột (parallax).
 * Nằm cố định sau toàn bộ nội dung, không nhận sự kiện chuột.
 * Màu lấy từ token (--moon, --mountain-*) nên mọi giao diện tổ chức tự đổi sắc.
 * Riêng Bạch Gia: núi phủ tuyết, quầng trăng, tuyết xa rơi, hạc trắng bay ngang, viền sương lam.
 */

const MT1 =
  'M0,250 C70,226 110,170 170,186 C220,198 248,128 306,104 C346,88 372,160 424,180 C474,198 516,126 584,118 C636,112 660,184 716,192 C786,202 818,108 896,78 C948,60 980,142 1038,162 C1098,182 1138,124 1198,132 C1266,142 1298,204 1358,196 C1398,190 1420,178 1440,172 L1440,420 L0,420 Z'
const MT2 =
  'M0,300 C60,288 96,232 150,236 C204,240 222,300 280,290 C340,280 360,200 420,178 C470,160 496,236 548,254 C600,272 650,226 700,236 C760,248 780,300 840,292 C900,284 930,214 990,196 C1044,180 1070,232 1110,226 C1150,220 1170,160 1210,150 C1260,138 1290,226 1340,246 C1380,262 1410,262 1440,256 L1440,420 L0,420 Z'
const MT3 =
  'M0,350 C80,330 120,300 190,312 C250,322 280,370 350,362 C420,354 440,300 510,296 C580,292 600,346 680,352 C760,358 790,316 860,308 C930,300 960,350 1030,356 C1100,362 1130,316 1200,310 C1270,304 1310,346 1380,344 C1410,343 1430,338 1440,336 L1440,420 L0,420 Z'

/* khe đá lộ ra dưới lớp tuyết trên các đỉnh cao (Bạch Gia) — 6 nét đầu thuộc dãy xa, nét cuối thuộc dãy giữa */
const ROCK_STREAKS = [
  'M898,82 C893,100 884,116 872,130',
  'M904,86 C908,104 914,118 926,132',
  'M889,94 C880,104 868,112 856,118',
  'M308,108 C303,122 296,134 286,144',
  'M314,110 C319,124 326,134 336,142',
  'M586,121 C582,134 575,144 566,152',
  // đỉnh giữa của dãy núi thứ hai
  'M421,181 C424,192 430,200 440,206',
]

export function InkScape({ theme }: { theme?: OrgThemeId } = {}) {
  const ref = useRef<HTMLDivElement>(null)
  const themeId = useOrgThemeId(theme)
  const snowy = themeId === 'bach-gia'

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    // chỉ chạy vòng rAF khi còn đang trượt tới vị trí chuột — đứng yên thì ngủ (đỡ CPU)
    const loop = () => {
      cx += (tx - cx) * 0.05
      cy += (ty - cy) * 0.05
      el.style.setProperty('--px', cx.toFixed(4))
      el.style.setProperty('--py', cy.toFixed(4))
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.0015 ? requestAnimationFrame(loop) : 0
    }
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2
      ty = (e.clientY / window.innerHeight - 0.5) * 2
      if (!raf) raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const layer = (depth: number) => ({
    transform: `translate3d(calc(var(--px, 0) * ${-depth}px), calc(var(--py, 0) * ${-depth * 0.4}px), 0)`,
  })

  return (
    <div ref={ref} className="app-backdrop" aria-hidden>
      {/* trăng */}
      <div className="ink-moon absolute right-[5%] top-[5%]" style={layer(6)}>
        <div className="relative h-24 w-24 sm:h-32 sm:w-32">
          {snowy && <div className="fx-moon-halo" />}
          <div
            className="h-full w-full rounded-full"
            style={{
              background: 'radial-gradient(circle at 40% 38%, color-mix(in oklab, var(--moon) 100%, white 10%), var(--moon) 55%, color-mix(in oklab, var(--moon) 80%, black 20%))',
              boxShadow: '0 0 80px 20px color-mix(in oklab, var(--moon) 25%, transparent), 0 0 200px 60px color-mix(in oklab, var(--moon) 10%, transparent)',
              opacity: snowy ? 0.8 : 0.85,
            }}
          />
        </div>
      </div>

      {/* sương */}
      {/* khung lớn hơn 120px so với trước vì quầng gradient tự mờ dần ra mép (thay cho blur 60px) */}
      <div className="mist" style={{ width: 740, height: 340, left: 'calc(-6% - 60px)', top: 'calc(38% - 60px)', '--mist': 'color-mix(in oklab, var(--text) 9%, transparent)' } as React.CSSProperties} />
      <div
        className="mist"
        style={
          {
            width: 880,
            height: 360,
            right: 'calc(-10% - 60px)',
            top: 'calc(58% - 60px)',
            '--mist': `color-mix(in oklab, ${snowy ? 'var(--backdrop-b)' : 'var(--jade)'} 9%, transparent)`,
            animationDelay: '-9s',
          } as React.CSSProperties
        }
      />
      <div className="mist" style={{ width: 640, height: 300, left: 'calc(30% - 60px)', top: 'calc(18% - 60px)', '--mist': 'color-mix(in oklab, var(--gold) 6%, transparent)', animationDelay: '-15s' } as React.CSSProperties} />

      {/* tuyết xa rơi sau dãy núi */}
      {snowy && <div className="fx-snow-haze" />}

      {snowy ? (
        /* hạc trắng bay ngang trời */
        <Cranes style={layer(10)} />
      ) : (
        /* chim bay xa */
        <svg className="absolute left-[18%] top-[16%] w-40 opacity-40" viewBox="0 0 160 60" style={layer(10)}>
          <g fill="none" stroke="var(--text-2)" strokeWidth="1.4" strokeLinecap="round">
            <path d="M10,30 q6,-6 12,0 q6,-6 12,0" />
            <path d="M50,18 q4,-4 8,0 q4,-4 8,0" />
            <path d="M80,36 q5,-5 10,0 q5,-5 10,0" />
          </g>
        </svg>
      )}

      {/* núi */}
      <svg className="absolute inset-x-0 bottom-0 h-[62vh] w-[110%] -translate-x-[5%]" viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="mt1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--mountain-1)" stopOpacity="0.75" />
            <stop offset="1" stopColor="var(--mountain-1)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mt2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--mountain-2)" stopOpacity="0.95" />
            <stop offset="0.8" stopColor="var(--mountain-2)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="mt3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--mountain-3)" stopOpacity="1" />
            <stop offset="1" stopColor="var(--bg)" stopOpacity="1" />
          </linearGradient>
          {snowy && (
            <>
              {/* tuyết phủ theo độ cao (đường tuyết): đỉnh càng cao càng trắng */}
              <linearGradient id="snow1" gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="230">
                <stop offset="0" stopColor="var(--snow-cap)" stopOpacity="0.62" />
                <stop offset="0.3" stopColor="var(--snow-cap)" stopOpacity="0.3" />
                <stop offset="0.62" stopColor="var(--snow-cap)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ridge1" gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="220">
                <stop offset="0" stopColor="var(--snow-cap)" stopOpacity="0.95" />
                <stop offset="0.7" stopColor="var(--snow-cap)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="snow2" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="300">
                <stop offset="0" stopColor="var(--snow-cap)" stopOpacity="0.5" />
                <stop offset="0.35" stopColor="var(--snow-cap)" stopOpacity="0.16" />
                <stop offset="0.62" stopColor="var(--snow-cap)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ridge2" gradientUnits="userSpaceOnUse" x1="0" y1="140" x2="0" y2="290">
                <stop offset="0" stopColor="var(--snow-cap)" stopOpacity="0.85" />
                <stop offset="0.75" stopColor="var(--snow-cap)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ridge3" gradientUnits="userSpaceOnUse" x1="0" y1="290" x2="0" y2="370">
                <stop offset="0" stopColor="var(--snow-cap)" stopOpacity="0.35" />
                <stop offset="1" stopColor="var(--snow-cap)" stopOpacity="0" />
              </linearGradient>
            </>
          )}
        </defs>
        <g style={layer(8)}>
          <path fill="url(#mt1)" d={MT1} />
          {snowy && (
            <>
              <path fill="url(#snow1)" d={MT1} />
              <g fill="none" stroke="var(--mountain-1)" strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
                {ROCK_STREAKS.slice(0, 6).map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>
              <path fill="none" stroke="url(#ridge1)" strokeWidth="1.4" d={MT1} />
            </>
          )}
        </g>
        <g style={layer(16)}>
          <path fill="url(#mt2)" d={MT2} />
          {snowy && (
            <>
              <path fill="url(#snow2)" d={MT2} />
              <path fill="none" stroke="url(#ridge2)" strokeWidth="1.3" d={MT2} />
            </>
          )}
          {/* tháp cổ */}
          <g transform="translate(1196 112)" fill="var(--mountain-2)">
            <rect x="8" y="22" width="12" height="18" />
            <path d="M-2,24 L28,24 L22,18 L4,18 Z" />
            <rect x="9" y="8" width="10" height="11" />
            <path d="M0,10 L28,10 L21,4 L7,4 Z" />
            <path d="M14,-8 L14,4" stroke="var(--mountain-2)" strokeWidth="2" />
            {snowy && (
              /* tuyết đọng trên mái */
              <g fill="var(--snow-cap)" opacity="0.85">
                <path d="M3.4,18.6 Q13,15.6 22.6,18.6 L24,20 Q13,18.4 2,20 Z" />
                <path d="M6.4,4.6 Q14,1.8 21.6,4.6 L23,6 Q14,4.6 5,6 Z" />
              </g>
            )}
          </g>
          {snowy && (
            <g fill="none" stroke="var(--mountain-2)" strokeWidth="2" strokeLinecap="round" opacity="0.55">
              <path d={ROCK_STREAKS[6]} />
            </g>
          )}
        </g>
        <g style={layer(28)}>
          <path fill="url(#mt3)" d={MT3} />
          {snowy && <path fill="none" stroke="url(#ridge3)" strokeWidth="1.2" d={MT3} />}
        </g>
      </svg>

      {/* viền sương lam (Bạch Gia) */}
      {snowy && <div className="fx-vignette" />}
    </div>
  )
}
