import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const sizes = [16, 32, 48, 64, 128, 256, 512]
const svg = readFileSync(join(root, 'resources', 'icon.svg'), 'utf-8')

mkdirSync(join(root, 'resources', 'png'), { recursive: true })

for (const size of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false }
  })
  const png = resvg.render().asPng()
  writeFileSync(join(root, 'resources', 'png', `${size}.png`), png)
  console.log(`  ${size}x${size}  ✓`)
}

// 512px as the main icon.png for electron
writeFileSync(join(root, 'resources', 'icon.png'), readFileSync(join(root, 'resources', 'png', '512.png')))
console.log('\nresources/icon.png ready')

// basic ICO: just the 256px PNG wrapped in ICO container (good enough for Windows)
const png256 = readFileSync(join(root, 'resources', 'png', '256.png'))
const ico = buildIco([png256])
writeFileSync(join(root, 'resources', 'icon.ico'), ico)
console.log('resources/icon.ico ready')

function buildIco(pngs) {
  const count = pngs.length
  const headerSize = 6
  const dirEntrySize = 16
  const dataOffset = headerSize + dirEntrySize * count

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)   // reserved
  header.writeUInt16LE(1, 2)   // type: ICO
  header.writeUInt16LE(count, 4)

  let offset = dataOffset
  const dirEntries = []
  for (const png of pngs) {
    const entry = Buffer.alloc(16)
    entry[0] = 0       // width  0 = 256
    entry[1] = 0       // height 0 = 256
    entry[2] = 0       // color count
    entry[3] = 0       // reserved
    entry.writeUInt16LE(1, 4)  // planes
    entry.writeUInt16LE(32, 6) // bit count
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    dirEntries.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...dirEntries, ...pngs])
}
