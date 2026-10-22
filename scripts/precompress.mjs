// Nén sẵn bản build web (Brotli mức cao nhất + gzip) để máy chủ phục vụ thẳng, không tốn CPU nén lúc chạy.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'

const root = path.resolve('dist')
const EXT = /\.(js|css|html|svg|json|txt|webmanifest)$/
let raw = 0
let br = 0
let n = 0

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name)
    if (statSync(file).isDirectory()) walk(file)
    else if (EXT.test(name)) {
      const buf = readFileSync(file)
      if (buf.length < 1024) continue
      const b = brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } })
      writeFileSync(`${file}.br`, b)
      writeFileSync(`${file}.gz`, gzipSync(buf, { level: 9 }))
      raw += buf.length
      br += b.length
      n++
    }
  }
}

walk(root)
console.log(`precompress: ${n} file, ${(raw / 1024).toFixed(0)} KB → ${(br / 1024).toFixed(0)} KB (brotli)`)
