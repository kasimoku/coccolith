import * as THREE from 'three'
import { createCompass, createVethIndicator } from './hud.js'
import { createCoccolith } from './coccolith.js'
import { createVeth } from './veth.js'

// ============================================================
//  LMF — Layout Master File
//  単位: 1 unit = 1m
// ============================================================

// --- 定数 ---------------------------------------------------
export const R_C   = 720          // coccolith 半径 (m)
export const R_V   = 300          // veth 半径 (m)
export const ORBIT = 3240         // veth 軌道半径・惑星中心から (m)

// veth の位置（北から30°傾いた方向）
export const VETH_POS = new THREE.Vector3(
  ORBIT * Math.sin(Math.PI / 6),
  ORBIT * Math.cos(Math.PI / 6),
  0
)

// --- レンダラー ---------------------------------------------
const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)

// --- シーン -------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x00000a)
scene.fog = new THREE.FogExp2(0x000510, 0.00038)

// --- カメラ -------------------------------------------------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50000)

// --- 光源 ---------------------------------------------------
// 太陽: 真横 (+X方向) 固定
const sun = new THREE.DirectionalLight(0xfff5e0, 1.8)
sun.position.set(20000, 0, 0)
scene.add(sun)
scene.add(new THREE.AmbientLight(0x08122a, 0.6))

// --- 星 -----------------------------------------------------
;(function () {
  const verts = []
  for (let i = 0; i < 3000; i++) {
    const phi = Math.acos(2 * Math.random() - 1)
    const th  = Math.random() * Math.PI * 2
    const r   = 30000
    verts.push(r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 9 })))
})()

// --- 天体 ---------------------------------------------------
const coccolith = createCoccolith()
scene.add(coccolith)

const veth = createVeth()
veth.position.copy(VETH_POS)
scene.add(veth)

// --- プレイヤー状態 -----------------------------------------
// pDir: 足元から頭方向（球面上の法線）
// pFwd: 進行方向
let pDir  = new THREE.Vector3(0, 1, 0)
let pFwd  = new THREE.Vector3(1, 0, 0)
let pitch = 0                          // 視点ピッチ (rad)
const PITCH_MAX = Math.PI * 0.44

// --- 入力 ---------------------------------------------------
const keys = {}
window.addEventListener('keydown', e => { keys[e.code] = true;  e.preventDefault() })
window.addEventListener('keyup',   e => { keys[e.code] = false })

// --- HUD ----------------------------------------------------
const { drawCompass }       = createCompass(document.getElementById('compass'))
const { drawVethIndicator } = createVethIndicator(document.getElementById('veth-ind'))

// --- リサイズ ------------------------------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})

// --- メインループ --------------------------------------------
const SPEED    = 20       // 移動速度 (m/s)
const TURN_SPD = 1.5      // 旋回速度 (rad/s)
const PITCH_SPD = 1.2     // ピッチ速度 (rad/s)
let prev = performance.now()

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  const dt  = Math.min((now - prev) / 1000, 0.05)
  prev = now

  // veth 自転
  veth.rotation.y += 0.003

  // --- 移動 ---
  const da = (SPEED / R_C) * dt

  if (keys['KeyQ']) { pFwd.applyAxisAngle(pDir,  TURN_SPD * dt); pFwd.normalize() }
  if (keys['KeyE']) { pFwd.applyAxisAngle(pDir, -TURN_SPD * dt); pFwd.normalize() }

  const axisWS = new THREE.Vector3().crossVectors(pDir, pFwd)
  if (keys['KeyW']) { pDir.applyAxisAngle(axisWS,  da); pDir.normalize() }
  if (keys['KeyS']) { pDir.applyAxisAngle(axisWS, -da); pDir.normalize() }
  if (keys['KeyD']) { pDir.applyAxisAngle(pFwd, -da);   pDir.normalize() }
  if (keys['KeyA']) { pDir.applyAxisAngle(pFwd,  da);   pDir.normalize() }

  pFwd.addScaledVector(pDir, -pFwd.dot(pDir))
  pFwd.normalize()

  // ピッチ
  if (keys['ArrowUp'])   pitch = Math.min( PITCH_MAX, pitch + PITCH_SPD * dt)
  if (keys['ArrowDown']) pitch = Math.max(-PITCH_MAX, pitch - PITCH_SPD * dt)

  // --- カメラ ---
  const camPos = pDir.clone().multiplyScalar(R_C + 1)
  camera.position.copy(camPos)
  camera.up.copy(pDir)

  const pitchedFwd = pFwd.clone()
    .multiplyScalar(Math.cos(pitch))
    .addScaledVector(pDir, Math.sin(pitch))
  camera.lookAt(camPos.clone().addScaledVector(pitchedFwd, 10))

  // --- HUD ---
  drawCompass(pDir, pFwd)
  drawVethIndicator(camPos, pDir, pFwd, VETH_POS)

  renderer.render(scene, camera)
}

animate()
