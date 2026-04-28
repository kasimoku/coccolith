import * as THREE from 'three'
import { createCompass, createVethIndicator } from './hud.js'
import { createCoccolith } from './coccolith.js'
import { createVeth } from './veth.js'
import { createCloud1 } from './cloud1.js'
import { R_C, LAND_LIFT, VETH_POS } from './constants.js'
import { createSabchan } from '../../my-3d-parts/parts/sabchan.jsx'

// ============================================================
//  LMF — Layout Master File
//  単位: 1 unit = 1m
// ============================================================

// --- レンダラー ---------------------------------------------
const canvas = document.getElementById('c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
renderer.setSize(window.innerWidth, window.innerHeight)

// --- シーン -------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x00000a)
scene.fog = new THREE.FogExp2(0x000510, 0.00038)

// --- カメラ -------------------------------------------------
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50000)

// --- 光源 ---------------------------------------------------
// 太陽: 真横 (+X方向) 固定
const sun = new THREE.DirectionalLight(0xfff5e0, 3.0)
sun.position.set(20000, 0, 0)
scene.add(sun)
scene.add(new THREE.AmbientLight(0x334455, 1.0))


// --- 天体 ---------------------------------------------------
const { group: coccolith, terrainMeshes } = createCoccolith()
scene.add(coccolith)

const veth = createVeth()
veth.position.copy(VETH_POS)
scene.add(veth)

// --- sabちゃん --------------------------------------------------
// 1 unit = 0.1m スケール系のモデルを coccolith (1 unit = 1m) に合わせる
// 足先 local y = -5.72 → scale 0.2 で -1.144m → 地表に接地
const SAB_SCALE       = 0.2
const SAB_FOOT_OFFSET = 5.72 * SAB_SCALE   // 足先→グループ原点（頭部中心）距離

const sabchan = createSabchan(scene)
sabchan.group.scale.setScalar(SAB_SCALE)

// --- 3人称カメラ定数 -------------------------------------------
const CAM_DIST       = 8     // sabちゃんからの距離 (m)
const CAM_BASE_ANGLE = 0.35  // 水平面からの基本仰角 (rad)

// --- 雲 -------------------------------------------------------
// 惑星中心から (0, CLOUD_H, 0) に配置し、傾いた軸で周回
// rotateOnWorldAxis で子の向きも一緒に回転 → 常に惑星面法線が上を向く
const CLOUD_H = R_C + LAND_LIFT + 15
const cloudOrbitAxis = new THREE.Vector3(0.3, 1, 0.1).normalize()

const cloudGroup = new THREE.Group()
const cloud = createCloud1()
cloud.scale.setScalar(6)
cloud.position.set(0, CLOUD_H, 0)
cloudGroup.add(cloud)
scene.add(cloudGroup)

// --- レイキャスター -----------------------------------------
const raycaster = new THREE.Raycaster()

// 地表追従: 惑星外側から中心方向にレイを飛ばし、
// 最初のヒット点（= 最も外側の地表面）の惑星中心からの距離 +1m にカメラを置く。
// 中心→外向きだと FrontSide マテリアルのバックフェイスカリングに当たるため外→内方向で飛ばす。
function getGroundHeight(dir) {
  const origin = dir.clone().multiplyScalar((R_C + LAND_LIFT) * 1.5)
  raycaster.set(origin, dir.clone().negate())
  const hits = raycaster.intersectObjects(terrainMeshes, false)
  if (hits.length === 0) return R_C + 1
  return hits[0].point.length() + 1
}

// --- プレイヤー状態 -----------------------------------------
// pDir: 足元から頭方向（球面上の法線）
// pFwd: 進行方向
let pDir  = new THREE.Vector3(0, 1, 0)
let pFwd  = new THREE.Vector3(1, 0, 0)
let pitch = 0                          // 視点ピッチ (rad)
const PITCH_MAX = Math.PI * 0.44

// --- 俯瞰モード ---------------------------------------------
let overviewMode = false
const OVERVIEW_DIST = (R_C + LAND_LIFT) * 2.5  // 惑星全体が収まる距離

// 俯瞰カメラの水平回転・垂直回転（ラジアン）
let ovYaw   = 0
let ovPitch = Math.PI * 0.25   // 初期は斜め上から

// --- 入力 ---------------------------------------------------
const keys = {}

window.addEventListener('keydown', e => {
  if (e.code === 'Tab') {
    overviewMode = !overviewMode

    if (!overviewMode) {
      // 🔴 が指していた地表点（カメラ→原点方向のレイ）を新しい立ち位置にする
      const rayDir = camera.position.clone().negate().normalize()
      raycaster.set(camera.position.clone(), rayDir)
      const hits = raycaster.intersectObjects(terrainMeshes, false)
      if (hits.length > 0) {
        pDir = hits[0].point.clone().normalize()
        // pFwd を新しい pDir に直交する成分に投影して更新
        pFwd.addScaledVector(pDir, -pFwd.dot(pDir))
        if (pFwd.lengthSq() < 1e-6) {
          // pFwd と pDir がほぼ平行な場合は別軸から作り直す
          const alt = Math.abs(pDir.x) < 0.9
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0)
          pFwd = alt.addScaledVector(pDir, -alt.dot(pDir))
        }
        pFwd.normalize()
        pitch = 0
      }
    }
    e.preventDefault()
    return
  }
  keys[e.code] = true
  e.preventDefault()
})
window.addEventListener('keyup', e => { keys[e.code] = false })

// --- HUD ----------------------------------------------------
const { drawCompass }       = createCompass(document.getElementById('compass'))
const { drawVethIndicator } = createVethIndicator(document.getElementById('veth-ind'))
const areaEl   = document.getElementById('area-code')
const latlonEl = document.getElementById('latlon')

// pDir（正規化済み球面法線）からグリッドエリアコードを返す
// 緯度帯 A〜J（南→北）、経度帯 1〜10（西→東）
function getAreaCode(dir) {
  const lat = Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180 / Math.PI
  let theta = Math.atan2(dir.z, dir.x)
  if (theta < 0) theta += Math.PI * 2
  const lon = theta * 180 / Math.PI - 180  // -180〜180
  const latIdx = Math.min(9, Math.floor((lat + 90) / 18))
  const lonIdx = Math.min(9, Math.floor((lon + 180) / 36))
  return String.fromCharCode(0x41 + latIdx) + (lonIdx + 1)
}

// --- リサイズ ------------------------------------------------
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})

// --- メインループ --------------------------------------------
const SPEED     = 20      // 移動速度 (m/s)
const TURN_SPD  = 1.5     // 旋回速度 (rad/s)
const PITCH_SPD = 1.2     // ピッチ速度 (rad/s)
const OV_SPD    = 1.2     // 俯瞰回転速度 (rad/s)
const OV_PITCH_MIN = -Math.PI * 0.49  // 南半球まで回せるよう負値に
const OV_PITCH_MAX =  Math.PI * 0.49
const TARGET_FPS = 30
const FRAME_MS   = 1000 / TARGET_FPS
let prev = performance.now()

function animate() {
  requestAnimationFrame(animate)
  const now = performance.now()
  if (now - prev < FRAME_MS) return
  const dt  = Math.min((now - prev) / 1000, 0.05)
  prev = now

  // veth 自転
  veth.rotation.y += 0.003

  // 雲: 地表上を周回（veth 自転と同速）
  cloudGroup.rotateOnWorldAxis(cloudOrbitAxis, 0.003)

  if (overviewMode) {
    // --- 俯瞰モード: A/D/Q/E で水平回転、↑↓ で仰俯角 ---
    if (keys['KeyA'] || keys['KeyQ']) ovYaw += OV_SPD * dt
    if (keys['KeyD'] || keys['KeyE']) ovYaw -= OV_SPD * dt
    if (keys['ArrowUp'])  ovPitch  = Math.min(OV_PITCH_MAX, ovPitch + OV_SPD * dt)
    if (keys['ArrowDown'])ovPitch  = Math.max(OV_PITCH_MIN, ovPitch - OV_SPD * dt)

    const cx = OVERVIEW_DIST * Math.cos(ovPitch) * Math.sin(ovYaw)
    const cy = OVERVIEW_DIST * Math.sin(ovPitch)
    const cz = OVERVIEW_DIST * Math.cos(ovPitch) * Math.cos(ovYaw)
    camera.position.set(cx, cy, cz)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)

    // カメラ→惑星中心レイの地表ヒット点に sabちゃんを配置
    const ovRayDir = new THREE.Vector3(-cx, -cy, -cz).normalize()
    raycaster.set(new THREE.Vector3(cx, cy, cz), ovRayDir)
    const ovHits = raycaster.intersectObjects(terrainMeshes, false)
    if (ovHits.length > 0) {
      const hp = ovHits[0].point
      const hn = hp.clone().normalize()
      let sf = pFwd.clone()
      sf.addScaledVector(hn, -sf.dot(hn))
      if (sf.lengthSq() < 1e-6) {
        sf = new THREE.Vector3(1, 0, 0)
        sf.addScaledVector(hn, -sf.dot(hn))
      }
      sf.normalize()
      const sr = new THREE.Vector3().crossVectors(hn, sf)
      sabchan.group.setRotationFromMatrix(new THREE.Matrix4().makeBasis(sr, hn, sf))
      sabchan.group.position.copy(hn.multiplyScalar(hp.length() + SAB_FOOT_OFFSET))
    }
  } else {
    // --- 通常モード: sabちゃん追従3人称 ---
    const da = (SPEED / R_C) * dt

    if (keys['KeyQ']) { pFwd.applyAxisAngle(pDir,  TURN_SPD * dt); pFwd.normalize() }
    if (keys['KeyE']) { pFwd.applyAxisAngle(pDir, -TURN_SPD * dt); pFwd.normalize() }

    const axisWS = new THREE.Vector3().crossVectors(pDir, pFwd)
    if (keys['KeyW']) { pDir.applyAxisAngle(axisWS,  da); pDir.normalize() }
    if (keys['KeyS']) { pDir.applyAxisAngle(axisWS, -da); pDir.normalize() }
    if (keys['KeyD']) { pDir.applyAxisAngle(pFwd,  da);   pDir.normalize() }
    if (keys['KeyA']) { pDir.applyAxisAngle(pFwd, -da);   pDir.normalize() }

    pFwd.addScaledVector(pDir, -pFwd.dot(pDir))
    pFwd.normalize()

    // ↑↓ でカメラ仰角を操作
    if (keys['ArrowUp'])   pitch = Math.min( PITCH_MAX, pitch + PITCH_SPD * dt)
    if (keys['ArrowDown']) pitch = Math.max(-PITCH_MAX, pitch - PITCH_SPD * dt)

    // --- sabちゃん配置 ---
    // local Y → pDir (惑星法線=上)、local Z → pFwd (進行方向=前)
    const sabRight = new THREE.Vector3().crossVectors(pDir, pFwd)
    const rotM = new THREE.Matrix4().makeBasis(sabRight, pDir, pFwd)
    sabchan.group.setRotationFromMatrix(rotM)

    const groundH = getGroundHeight(pDir)
    const sabPos  = pDir.clone().multiplyScalar(groundH + SAB_FOOT_OFFSET)
    sabchan.group.position.copy(sabPos)

    // 頭の揺れアニメ
    const t = now / 1000
    sabchan.head.rotation.z   = Math.sin(t * 0.51) * 0.046
    sabchan.inhead.rotation.z = Math.sin(t * 0.51) * 0.046

    // --- 3人称カメラ ---
    // pitch を仰角オフセットとして使用（上限・下限クランプ）
    const camAngle = Math.max(0.05, Math.min(Math.PI * 0.45, CAM_BASE_ANGLE + pitch))
    const camOffset = pFwd.clone().multiplyScalar(-CAM_DIST * Math.cos(camAngle))
      .addScaledVector(pDir, CAM_DIST * Math.sin(camAngle))
    camera.position.copy(sabPos.clone().add(camOffset))
    camera.up.copy(pDir)
    // 胴体あたり（頭部中心から足方向へ少し）を注視
    const lookTarget = sabPos.clone().addScaledVector(pDir, -SAB_FOOT_OFFSET * 0.4)
    camera.lookAt(lookTarget)
  }

  // --- HUD ---
  const hudCamPos = overviewMode
    ? camera.position.clone()
    : pDir.clone().multiplyScalar(R_C + 1)
  drawCompass(pDir, pFwd)
  drawVethIndicator(hudCamPos, pDir, pFwd, VETH_POS)
  if (overviewMode) {
    areaEl.textContent   = ''
    latlonEl.textContent = ''
  } else {
    const lat = Math.asin(Math.max(-1, Math.min(1, pDir.y))) * 180 / Math.PI
    let theta = Math.atan2(pDir.z, pDir.x)
    if (theta < 0) theta += Math.PI * 2
    const lon = theta * 180 / Math.PI - 180
    areaEl.textContent   = getAreaCode(pDir)
    latlonEl.textContent = `  |  lat: ${lat.toFixed(1)}°  lon: ${lon.toFixed(1)}°`
  }

  renderer.render(scene, camera)
}

animate()
