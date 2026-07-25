/**
 * Deterministic avatar generated from the user's id.
 *
 * Deliberately NOT a file upload. Letting strangers upload arbitrary
 * images to a public site used by teenagers means someone has to
 * review those images, forever, including at 2am. That someone would
 * be you. This gives everyone a distinct visual identity with no
 * storage bill, no upload endpoint to attack, and nothing to moderate.
 */

const PALETTES = [
  ['#FF6B1A', '#26301F'],
  ['#97C25C', '#171D13'],
  ['#4A9FD9', '#12140D'],
  ['#D9483B', '#1E2519'],
  ['#C77DD9', '#171D13'],
  ['#E9E5D8', '#26301F'],
  ['#E0B23C', '#12140D'],
  ['#4AC1A8', '#1E2519'],
]

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export default function Avatar({
  seed,
  style = 0,
  size = 40,
}: {
  seed: string
  style?: number
  size?: number
}) {
  const [fg, bg] = PALETTES[style % PALETTES.length]
  const h = hash(seed)

  // 5x5 grid, mirrored down the middle so it reads as a face/emblem
  const cells: boolean[] = []
  for (let i = 0; i < 15; i++) cells.push(((h >> i) & 1) === 1)

  const rects = []
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if (cells[y * 3 + x]) {
        rects.push([x, y])
        if (x < 2) rects.push([4 - x, y])
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Player avatar"
      style={{ flexShrink: 0 }}
    >
      <rect width="5" height="5" fill={bg} />
      {rects.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" fill={fg} />
      ))}
    </svg>
  )
}
