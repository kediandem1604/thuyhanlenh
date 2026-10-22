import { readFileSync } from 'node:fs'
import { generateSeed, type SeedData } from '@/data/seed'
import { loadConfig } from '../config'
import { openDatabase } from './client'
import { importSeedData } from './importer'

/*
 * Lệnh quản trị CSDL:
 *   npm run db:migrate            áp dụng migration
 *   npm run db:seed               xóa dữ liệu bang và nạp lại bang demo (giữ liên kết tài khoản)
 *   npm run db:import -- file.json  nạp file "Xuất JSON" từ bản demo / trang Thiết Lập
 */
const [command, file] = process.argv.slice(2)
const config = loadConfig()
const database = await openDatabase(config)

try {
  await database.migrate()
  if (command === 'migrate') {
    console.log('✔ Đã áp dụng migration.')
  } else if (command === 'seed') {
    const sum = await importSeedData(database.db, config.guildId, generateSeed(), { reset: true })
    console.log(`✔ Đã nạp bang demo: ${sum.members} môn hạ, ${sum.clears} lượt clear, ${sum.ledger} bút toán.`)
  } else if (command === 'import') {
    if (!file) throw new Error('Thiếu đường dẫn file: npm run db:import -- duong-dan.json')
    const data = JSON.parse(readFileSync(file, 'utf8')) as SeedData
    if (!Array.isArray(data.members) || !Array.isArray(data.ledger)) throw new Error('File không đúng định dạng xuất của Thủy Hàn Lệnh.')
    const sum = await importSeedData(database.db, config.guildId, data, { reset: true })
    console.log(`✔ Đã nhập: ${sum.members} môn hạ, ${sum.clears} lượt clear, ${sum.ledger} bút toán.`)
  } else {
    console.log('Lệnh: migrate | seed | import <file.json>')
  }
} finally {
  await database.close()
}
