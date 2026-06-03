/**
 * Generates resources/icon.icns from resources/icon.svg
 * macOS only — requires iconutil (ships with Xcode CLT)
 */
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { execSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const iconset = join(root, 'resources', 'icon.iconset')
const svg = readFileSync(join(root, 'resources', 'icon.svg'), 'utf-8')

const sizes = [16, 32, 64, 128, 256, 512]

mkdirSync(iconset, { recursive: true })

for (const size of sizes) {
  const render = (px) => {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: px }, font: { loadSystemFonts: false } })
    return resvg.render().asPng()
  }

  writeFileSync(join(iconset, `icon_${size}x${size}.png`), render(size))
  writeFileSync(join(iconset, `icon_${size}x${size}@2x.png`), render(size * 2))
}

execSync(`iconutil -c icns "${iconset}" -o "${join(root, 'resources', 'icon.icns')}"`)
rmSync(iconset, { recursive: true })

console.log('resources/icon.icns ready')
