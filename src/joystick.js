// Virtual joystick state — read each frame in main.js
export const vJoy = { lx: 0, ly: 0, rx: 0, ry: 0 }

function makeJoystick(wrapEl, onMove) {
  const handle = wrapEl.querySelector('.joy-handle')
  const maxDist = wrapEl.offsetWidth / 2 - 23   // base radius - handle radius
  let touchId    = null
  let mouseActive = false

  function project(cx, cy) {
    const rect = wrapEl.getBoundingClientRect()
    let dx = cx - (rect.left + rect.width  / 2)
    let dy = cy - (rect.top  + rect.height / 2)
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > maxDist) { const s = maxDist / d; dx *= s; dy *= s }
    handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    onMove(dx / maxDist, dy / maxDist)
  }

  function reset() {
    handle.style.transform = 'translate(-50%, -50%)'
    onMove(0, 0)
  }

  // Touch — track a single touch ID so both sticks work simultaneously
  wrapEl.addEventListener('touchstart', e => {
    e.preventDefault()
    if (touchId !== null) return
    const t = e.changedTouches[0]
    touchId = t.identifier
    project(t.clientX, t.clientY)
  }, { passive: false })

  wrapEl.addEventListener('touchmove', e => {
    e.preventDefault()
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { project(t.clientX, t.clientY); return }
    }
  }, { passive: false })

  const onTouchEnd = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === touchId) { touchId = null; reset(); return }
    }
  }
  wrapEl.addEventListener('touchend',   onTouchEnd)
  wrapEl.addEventListener('touchcancel', onTouchEnd)

  // Mouse (desktop testing)
  wrapEl.addEventListener('mousedown', e => {
    mouseActive = true
    project(e.clientX, e.clientY)
    e.stopPropagation()
  })
  window.addEventListener('mousemove', e => { if (mouseActive) project(e.clientX, e.clientY) })
  window.addEventListener('mouseup',   ()  => { if (mouseActive) { mouseActive = false; reset() } })
}

export function initJoysticks() {
  const jL = document.getElementById('joy-left')
  const jR = document.getElementById('joy-right')
  if (jL) makeJoystick(jL, (x, y) => { vJoy.lx = x; vJoy.ly = y })
  if (jR) makeJoystick(jR, (x, y) => { vJoy.rx = x; vJoy.ry = y })

  // 俯瞰ボタン → Tab KeyboardEvent を dispatch
  const tabBtn = document.getElementById('tab-btn')
  if (tabBtn) {
    const fire = e => {
      e.preventDefault()
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab', bubbles: true }))
    }
    tabBtn.addEventListener('touchend', fire)
    tabBtn.addEventListener('click',    fire)
  }
}
