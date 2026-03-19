/**
 * Generates app-icon.png (1024×1024) — blue rounded square + white bus
 * Run: node scripts/generate-icon.mjs
 */
import { PNG } from '../node_modules/pngjs/lib/png.js'
import { createWriteStream } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SIZE = 1024
const png = new PNG({ width: SIZE, height: SIZE, filterType: -1 })

// ── helpers ──────────────────────────────────────────────────────────────────
const BG  = { r: 0x0e, g: 0xa5, b: 0xea } // #0ea5e9  sky-500
const FG  = { r: 0xff, g: 0xff, b: 0xff } // white

function idx(x, y) { return (y * SIZE + x) * 4 }

function setPixel(x, y, c, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = idx(x, y)
  png.data[i]     = c.r
  png.data[i + 1] = c.g
  png.data[i + 2] = c.b
  png.data[i + 3] = a
}

// filled circle / anti-alias not needed — just paint pixels
function fillRect(x0, y0, x1, y1, c) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      setPixel(x, y, c)
}

function fillCircle(cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r)
        setPixel(x, y, c)
}

function fillRoundRect(x0, y0, x1, y1, r, c) {
  fillRect(x0 + r, y0, x1 - r, y1, c)
  fillRect(x0, y0 + r, x1, y1 - r, c)
  fillCircle(x0 + r, y0 + r, r, c)
  fillCircle(x1 - r, y0 + r, r, c)
  fillCircle(x0 + r, y1 - r, r, c)
  fillCircle(x1 - r, y1 - r, r, c)
}

// ── 1. fill background transparent ───────────────────────────────────────────
png.data.fill(0)

// ── 2. blue rounded-rect background (radius ≈ 22%) ───────────────────────────
const PAD  = 40          // safe-zone inset for adaptive icon
const RAD  = 200         // corner radius
fillRoundRect(PAD, PAD, SIZE - PAD, SIZE - PAD, RAD, BG)

// ── 3. white bus (Material Design bus icon, scaled to ~55% of canvas) ─────────
// Bus bounding box: 256×256 centred on 512,512; source viewBox 0 0 24 24
const BUS_SIZE = 560   // px
const OX = (SIZE - BUS_SIZE) / 2   // offset x
const OY = (SIZE - BUS_SIZE) / 2   // offset y
const S  = BUS_SIZE / 24           // scale factor

function busPixel(bx, by) {
  // bx, by in [0..24] viewBox coords
  const px = Math.round(OX + bx * S)
  const py = Math.round(OY + by * S)
  setPixel(px, py, FG)
}

// Rasterise Material "directions_bus" path:
// M4,16c0,.88.39,1.67,1,2.22V20c0,.55.45,1,1,1h1c.55,0,1-.45,1-1v-1h8v1
// c0,.55.45,1,1,1h1c.55,0,1-.45,1-1v-1.78c.61-.55,1-1.34,1-2.22V6
// c0-3.5-3.58-4-8-4s-8,.5-8,4v10zm3.5,1c-.83,0-1.5-.67-1.5-1.5S6.67,14,
// 7.5,14s1.5,.67,1.5,1.5S8.33,17,7.5,17zm9,0c-.83,0-1.5-.67-1.5-1.5
// s.67-1.5,1.5-1.5 1.5,.67,1.5,1.5-.67,1.5-1.5,1.5zm1.5-6H6V6h12v5z

// Simplified filled shapes that approximate the bus icon:
function fillBusShape() {
  const s = S

  // Body: filled rounded rect from (3,5) to (21,17)
  fillRoundRect(
    Math.round(OX + 3 * s), Math.round(OY + 5 * s),
    Math.round(OX + 21 * s), Math.round(OY + 17 * s),
    Math.round(1.5 * s), FG,
  )

  // Horizontal divider (windows bottom): filled strip at y=10..11
  fillRect(
    Math.round(OX + 3 * s), Math.round(OY + 10 * s),
    Math.round(OX + 21 * s), Math.round(OY + 11 * s),
    BG,
  )

  // Left window: BG rect inside body at (4,6)-(10,9)
  fillRoundRect(
    Math.round(OX + 4 * s), Math.round(OY + 6 * s),
    Math.round(OX + 10 * s), Math.round(OY + 9 * s),
    Math.round(s * 0.8), BG,
  )

  // Right window
  fillRoundRect(
    Math.round(OX + 14 * s), Math.round(OY + 6 * s),
    Math.round(OX + 20 * s), Math.round(OY + 9 * s),
    Math.round(s * 0.8), BG,
  )

  // Door divider (centre vertical)
  fillRect(
    Math.round(OX + 11.5 * s), Math.round(OY + 11 * s),
    Math.round(OX + 12.5 * s), Math.round(OY + 17 * s),
    BG,
  )

  // Lower bumper / front
  fillRect(
    Math.round(OX + 3 * s), Math.round(OY + 17 * s),
    Math.round(OX + 21 * s), Math.round(OY + 19 * s),
    FG,
  )

  // Left wheel
  fillCircle(
    Math.round(OX + 7.5 * s), Math.round(OY + 19.5 * s),
    Math.round(1.8 * s), FG,
  )
  fillCircle(
    Math.round(OX + 7.5 * s), Math.round(OY + 19.5 * s),
    Math.round(0.8 * s), BG,
  )

  // Right wheel
  fillCircle(
    Math.round(OX + 16.5 * s), Math.round(OY + 19.5 * s),
    Math.round(1.8 * s), FG,
  )
  fillCircle(
    Math.round(OX + 16.5 * s), Math.round(OY + 19.5 * s),
    Math.round(0.8 * s), BG,
  )
}

fillBusShape()

// ── 4. write PNG ─────────────────────────────────────────────────────────────
const outPath = path.join(__dirname, '..', 'assets', 'app-icon.png')
png.pack().pipe(createWriteStream(outPath))
  .on('finish', () => console.log(`✓ Icon written → ${outPath}`))
  .on('error', (e) => { console.error(e); process.exit(1) })
