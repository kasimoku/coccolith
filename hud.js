import * as THREE from 'three'

// ============================================================
//  HUD — コンパス & vethインジケーター
// ============================================================

const AXES = [
  { dir: new THREE.Vector3(1, 0, 0), color: '#ff5555', label: 'X' },
  { dir: new THREE.Vector3(0, 1, 0), color: '#55dd77', label: 'Y' },
  { dir: new THREE.Vector3(0, 0, 1), color: '#5599ff', label: 'Z' },
]

export function createCompass(canvas) {
  const ctx = canvas.getContext('2d')
  const cx = 44, cy = 44, len = 30

  function drawCompass(pDir, pFwd) {
    ctx.clearRect(0, 0, 88, 88)

    ctx.beginPath()
    ctx.arc(cx, cy, 40, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 0.5
    ctx.stroke()

    const right = new THREE.Vector3().crossVectors(pFwd, pDir).normalize()

    const projected = AXES.map(a => ({
      ...a,
      px: a.dir.dot(right),
      py: a.dir.dot(pDir),
      pz: a.dir.dot(pFwd),
    })).sort((a, b) => a.pz - b.pz)

    projected.forEach(a => {
      const ex = cx + a.px * len
      const ey = cy - a.py * len
      ctx.globalAlpha = a.pz < 0 ? 0.35 : 1.0
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey)
      ctx.strokeStyle = a.color; ctx.lineWidth = 1.5; ctx.stroke()
      const angle = Math.atan2(ey - cy, ex - cx)
      ctx.beginPath()
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex - 6 * Math.cos(angle - 0.4), ey - 6 * Math.sin(angle - 0.4))
      ctx.lineTo(ex - 6 * Math.cos(angle + 0.4), ey - 6 * Math.sin(angle + 0.4))
      ctx.closePath(); ctx.fillStyle = a.color; ctx.fill()
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = a.color
      ctx.fillText(a.label, ex + 4 * Math.cos(angle) - 3, ey + 4 * Math.sin(angle) + 4)
    })
    ctx.globalAlpha = 1
  }

  return { drawCompass }
}

export function createVethIndicator(canvas) {
  const ctx = canvas.getContext('2d')

  function drawVethIndicator(camPos, pDir, pFwd, vethPos) {
    const ww = window.innerWidth, wh = window.innerHeight
    const toVeth    = vethPos.clone().sub(camPos).normalize()
    const right     = new THREE.Vector3().crossVectors(pFwd, pDir).normalize()
    const screenX   = toVeth.dot(right)
    const screenY   = toVeth.dot(pDir)
    const inFront   = toVeth.dot(pFwd)
    const orbitR    = Math.min(ww, wh) * 0.42
    const centerX   = ww / 2, centerY = wh / 2
    const margin    = 30

    let ax = inFront > 0
      ? centerX + screenX * orbitR
      : centerX - screenX * orbitR
    let ay = inFront > 0
      ? centerY - screenY * orbitR
      : centerY + screenY * orbitR

    ax = Math.max(margin, Math.min(ww - margin, ax))
    ay = Math.max(margin, Math.min(wh - margin, ay))

    canvas.style.left = (ax - 14) + 'px'
    canvas.style.top  = (ay - 14) + 'px'

    const arrowAngle = Math.atan2(-screenY, screenX) + (inFront > 0 ? 0 : Math.PI)
    const bright = inFront > 0

    ctx.clearRect(0, 0, 28, 28)
    ctx.beginPath(); ctx.arc(14, 14, 12, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(186,205,216,0.18)'; ctx.fill()
    ctx.strokeStyle = bright ? 'rgba(186,205,216,0.85)' : 'rgba(186,205,216,0.35)'
    ctx.lineWidth = 1; ctx.stroke()

    ctx.save(); ctx.translate(14, 14); ctx.rotate(arrowAngle)
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(2, -4); ctx.lineTo(2, 4)
    ctx.closePath()
    ctx.fillStyle = bright ? 'rgba(186,205,216,1)' : 'rgba(186,205,216,0.35)'; ctx.fill()
    ctx.restore()

    ctx.font = 'bold 7px monospace'
    ctx.fillStyle = bright ? 'rgba(186,205,216,0.9)' : 'rgba(186,205,216,0.3)'
    ctx.textAlign = 'center'
    ctx.fillText('V', 14, 17)
  }

  return { drawVethIndicator }
}
