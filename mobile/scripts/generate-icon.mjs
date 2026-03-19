/**
 * Generates app icon PNGs for all Android mipmap densities.
 * Replaces existing ic_launcher.webp / ic_launcher_round.webp
 * Run: node scripts/generate-icon.mjs
 */
import { PNG } from '../node_modules/pngjs/lib/png.js'
import { createWriteStream, mkdirSync, rmSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const RES  = path.join(ROOT, 'android/app/src/main/res')

const SIZES = {
  'mipmap-mdpi':    48,
  'mipmap-hdpi':    72,
  'mipmap-xhdpi':   96,
  'mipmap-xxhdpi':  144,
  'mipmap-xxxhdpi': 192,
}

const BG = { r: 0x0e, g: 0xa5, b: 0xea } // #0ea5e9 sky-500
const FG = { r: 0xff, g: 0xff, b: 0xff }

// ── raster helpers ────────────────────────────────────────────────────────────
function makePNG(size) {
  const png = new PNG({ width: size, height: size, filterType: -1 })
  png.data.fill(0)

  function setPixel(x, y, c, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4
    png.data[i]     = c.r
    png.data[i + 1] = c.g
    png.data[i + 2] = c.b
    png.data[i + 3] = a
  }

  function fillRect(x0, y0, x1, y1, c) {
    for (let y = Math.max(0, y0); y <= Math.min(size - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(size - 1, x1); x++)
        setPixel(x, y, c)
  }

  function fillCircle(cx, cy, r, c) {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
          setPixel(x, y, c)
  }

  function fillRoundRect(x0, y0, x1, y1, r, c) {
    const rr = Math.min(r, Math.floor((x1 - x0) / 2), Math.floor((y1 - y0) / 2))
    fillRect(x0 + rr, y0, x1 - rr, y1, c)
    fillRect(x0, y0 + rr, x1, y1 - rr, c)
    fillCircle(x0 + rr, y0 + rr, rr, c)
    fillCircle(x1 - rr, y0 + rr, rr, c)
    fillCircle(x0 + rr, y1 - rr, rr, c)
    fillCircle(x1 - rr, y1 - rr, rr, c)
  }

  const S = size
  // Background: blue rounded rect
  const PAD = Math.round(S * 0.04)
  const RAD = Math.round(S * 0.19)
  fillRoundRect(PAD, PAD, S - PAD - 1, S - PAD - 1, RAD, BG)

  // Bus shape (scaled from 24×24 viewBox)
  const busW = Math.round(S * 0.68)
  const OX = Math.round((S - busW) / 2)
  const OY = Math.round((S - busW) / 2 + S * 0.02)
  const sc = busW / 24

  // Body
  fillRoundRect(
    Math.round(OX + 3 * sc), Math.round(OY + 5 * sc),
    Math.round(OX + 21 * sc), Math.round(OY + 17 * sc),
    Math.max(1, Math.round(1.5 * sc)), FG,
  )

  // Windows area (cut out with BG)
  fillRect(
    Math.round(OX + 3.5 * sc), Math.round(OY + 10.2 * sc),
    Math.round(OX + 20.5 * sc), Math.round(OY + 11 * sc),
    BG,
  )
  fillRoundRect(
    Math.round(OX + 4.2 * sc), Math.round(OY + 5.8 * sc),
    Math.round(OX + 10.5 * sc), Math.round(OY + 9.5 * sc),
    Math.max(1, Math.round(sc * 0.7)), BG,
  )
  fillRoundRect(
    Math.round(OX + 13.5 * sc), Math.round(OY + 5.8 * sc),
    Math.round(OX + 19.8 * sc), Math.round(OY + 9.5 * sc),
    Math.max(1, Math.round(sc * 0.7)), BG,
  )

  // Left wheel
  fillCircle(
    Math.round(OX + 7.5 * sc), Math.round(OY + 18.8 * sc),
    Math.max(1, Math.round(1.7 * sc)), FG,
  )
  fillCircle(
    Math.round(OX + 7.5 * sc), Math.round(OY + 18.8 * sc),
    Math.max(1, Math.round(0.7 * sc)), BG,
  )

  // Right wheel
  fillCircle(
    Math.round(OX + 16.5 * sc), Math.round(OY + 18.8 * sc),
    Math.max(1, Math.round(1.7 * sc)), FG,
  )
  fillCircle(
    Math.round(OX + 16.5 * sc), Math.round(OY + 18.8 * sc),
    Math.max(1, Math.round(0.7 * sc)), BG,
  )

  return png
}

// ── write one PNG ─────────────────────────────────────────────────────────────
function writePNG(png, outPath) {
  return new Promise((resolve, reject) => {
    png.pack().pipe(createWriteStream(outPath))
      .on('finish', resolve)
      .on('error', reject)
  })
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Source icon (1024×1024)
  const assetsDir = path.join(ROOT, 'assets')
  mkdirSync(assetsDir, { recursive: true })
  await writePNG(makePNG(1024), path.join(assetsDir, 'app-icon.png'))
  console.log('✓ assets/app-icon.png  (1024×1024)')

  // Mipmap sizes
  for (const [folder, size] of Object.entries(SIZES)) {
    const dir = path.join(RES, folder)
    if (!existsSync(dir)) { mkdirSync(dir, { recursive: true }) }

    // Remove old webp files
    for (const name of ['ic_launcher.webp', 'ic_launcher_round.webp']) {
      const f = path.join(dir, name)
      if (existsSync(f)) rmSync(f)
    }

    await writePNG(makePNG(size), path.join(dir, 'ic_launcher.png'))
    await writePNG(makePNG(size), path.join(dir, 'ic_launcher_round.png'))
    console.log(`✓ ${folder}/ic_launcher.png  (${size}×${size})`)
  }

  console.log('\nDone! All icons generated.')
}

main().catch((e) => { console.error(e); process.exit(1) })
