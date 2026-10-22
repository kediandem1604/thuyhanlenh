// Ảnh xem trước khi chia sẻ link (Open Graph, 1200×630) → public/og.png
// Chạy: node scripts/og-image.mjs   (cần Edge hoặc Chrome để chụp, giống scripts/discord-icons.mjs)
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const W = 1200
const H = 630
const OUT = path.resolve('public/og.png')
const SRC = path.resolve('branding/og')
mkdirSync(SRC, { recursive: true })

const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((b) => existsSync(b))
if (!browser) throw new Error('Không thấy Edge/Chrome để chụp ảnh.')

function stars(n, seed) {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  let out = ''
  for (let i = 0; i < n; i++)
    out += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * 360).toFixed(1)}" r="${(0.8 + rnd() * 1.6).toFixed(2)}" fill="#f3e6c4" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`
  return out
}

// ba ấn tượng trưng cho ba loại tổ chức
const emblem = (id, cx, cy, r, han, label, from, to, ink) => `
  <g transform="translate(${cx} ${cy})">
    <circle r="${r + 10}" fill="none" stroke="${from}" stroke-width="2" opacity="0.55"/>
    <circle r="${r}" fill="url(#em-${id})"/>
    <defs><radialGradient id="em-${id}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient></defs>
    <text y="${r * 0.36}" text-anchor="middle" font-family="Ma Shan Zheng" font-size="${r * 1.12}" fill="${ink}">${han}</text>
    <text y="${r + 40}" text-anchor="middle" font-family="Be Vietnam Pro" font-weight="600" font-size="22" fill="#e8dcc0" letter-spacing="1">${label}</text>
  </g>`

const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="sky" cx="72%" cy="30%" r="90%"><stop offset="0" stop-color="#22304f"/><stop offset="0.5" stop-color="#0d1427"/><stop offset="1" stop-color="#05070e"/></radialGradient>
  <radialGradient id="moon" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff8e4"/><stop offset="0.6" stop-color="#f1deb0"/><stop offset="1" stop-color="#cfae6c"/></radialGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#f6e2ac" stop-opacity="0.38"/><stop offset="1" stop-color="#f6e2ac" stop-opacity="0"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbebbd"/><stop offset="0.45" stop-color="#ddb96c"/><stop offset="1" stop-color="#9c7432"/></linearGradient>
  <radialGradient id="seal" cx="30%" cy="25%" r="85%"><stop offset="0" stop-color="#f0806a"/><stop offset="0.7" stop-color="#b92f22"/><stop offset="1" stop-color="#8f1f16"/></radialGradient>
  <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2644"/><stop offset="0.5" stop-color="#111a31"/></linearGradient>
  <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111a31"/><stop offset="0.7" stop-color="#080c18"/></linearGradient>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000" flood-opacity="0.55"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars(80, 7)}
<circle cx="930" cy="170" r="300" fill="url(#glow)"/>
<circle cx="930" cy="170" r="118" fill="url(#moon)"/>
<path d="M0,470 C80,446 140,400 220,392 C290,386 330,436 400,430 C470,424 500,372 580,362 C660,352 690,410 770,416 C850,422 900,380 980,372 C1060,364 1120,404 1200,398 V630 H0 Z" fill="url(#m1)"/>
<path d="M0,470 C80,446 140,400 220,392 C290,386 330,436 400,430 C470,424 500,372 580,362 C660,352 690,410 770,416 C850,422 900,380 980,372 C1060,364 1120,404 1200,398" fill="none" stroke="#d8b46a" stroke-width="2" opacity="0.45"/>
<path d="M0,548 C120,510 220,500 340,522 C460,500 560,512 680,530 C800,506 940,512 1200,500 V630 H0 Z" fill="url(#m2)"/>

<!-- khối chữ bên trái -->
<g transform="translate(84 110)">
  <text font-family="Be Vietnam Pro" font-weight="600" font-size="22" letter-spacing="6" fill="#d8b46a">NGHỊCH THỦY HÀN</text>
  <g filter="url(#shadow)" transform="translate(0 40)">
    <rect width="108" height="108" rx="20" fill="url(#seal)"/>
    <rect x="9" y="9" width="90" height="90" rx="13" fill="none" stroke="#fff1e6" stroke-width="4" opacity="0.85"/>
    <text x="54" y="82" text-anchor="middle" font-family="Ma Shan Zheng" font-size="76" fill="#fff1e6">令</text>
  </g>
  <text x="132" y="128" font-family="Cormorant Garamond" font-weight="700" font-size="92" fill="url(#gold)">Thủy Hàn Lệnh</text>
  <text y="210" font-family="Be Vietnam Pro" font-weight="500" font-size="30" fill="#efe6d2">Bang hội · Kim Lan · Team — gọn trong một lệnh bài</text>
  <text y="256" font-family="Be Vietnam Pro" font-size="23" fill="#b9b3a6">Phó bản · Bày trận · Lịch điểm danh · Sư đồ · Bang khố</text>
</g>

<!-- ba con đường -->
${emblem('bang', 160, 492, 46, '帮', 'Bang Hội', '#f6e2ac', '#9c7432', '#2a1d08')}
${emblem('kimlan', 320, 492, 46, '兰', 'Kim Lan', '#ffffff', '#8fa6c4', '#16223a')}
${emblem('team', 480, 492, 46, '队', 'Team', '#a8ecda', '#2f8a76', '#062a22')}

<text x="${W - 60}" y="${H - 34}" text-anchor="end" font-family="Be Vietnam Pro" font-size="20" fill="#8b95aa">Đăng nhập bằng Discord · hoặc vào xem thử</text>
</svg>`

const html = path.join(SRC, 'og.html')
writeFileSync(path.join(SRC, 'og.svg'), svg)
writeFileSync(
  html,
  `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Cormorant+Garamond:wght@700&family=Ma+Shan+Zheng&display=block" rel="stylesheet">
<style>html,body{margin:0;background:#05070e;overflow:hidden}svg{display:block;width:100vw;height:100vh}</style>
</head><body>${svg}</body></html>`,
)
execFileSync(
  browser,
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`, '--virtual-time-budget=15000', `--screenshot=${OUT}`, pathToFileURL(html).href],
  { stdio: 'ignore', timeout: 90_000 },
)
console.log('✓', path.relative(process.cwd(), OUT))
