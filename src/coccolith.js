import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import Alea from 'alea'
import { R_C, LAND_LIFT } from './constants.js'

// ============================================================
//  coccolith — 惑星メッシュ
// ============================================================

const LAND_COLOR   = 0x3d6b30
const LAND_COLOR_N = 0x337367 // y軸+側（北半球）陸地色
const SEA_COLOR    = 0x1a4a52 // 海底色
const R_OCEAN      = 724.5    // 海面球の半径 (m)
const OCEAN_COLOR  = 0x629ec1
const OCEAN_ALPHA  = 0.8

// ノイズ閾値: 正規分布に近い simplex noise で陸地 ~60% になる値
// simplex-noise の出力範囲は [-1, 1]。
// 面積比は閾値を下げると陸地が増える。経験的に -0.08 付近で ~60%。
const LAND_THRESHOLD = -0.08

// { group, terrainMeshes } を返す
// terrainMeshes: レイキャスト対象メッシュ（山などを追加する時はここに push する）
export function createCoccolith() {
  const group = new THREE.Group()
  const terrainMeshes = []

  const noise3D = createNoise3D(Alea('coccolith'))

  // --- 山定義: 1段=35m幅・総半径105m（3段共通） ---
  const HILL_STEP = 35

  // 山A: lat:-13.4° lon:-137.4° / 頂点20・中段6・裾段3
  const hillADir = new THREE.Vector3(
    Math.sin((90 - (-13.4)) * Math.PI / 180) * Math.cos((-137.4 + 180) * Math.PI / 180),
    Math.cos((90 - (-13.4)) * Math.PI / 180),
    Math.sin((90 - (-13.4)) * Math.PI / 180) * Math.sin((-137.4 + 180) * Math.PI / 180),
  )

  // 山B: lat:-10.5° lon:-171.0° / 頂点9・中段6・裾段3
  const hillBDir = new THREE.Vector3(
    Math.sin((90 - (-10.5)) * Math.PI / 180) * Math.cos((-171.0 + 180) * Math.PI / 180),
    Math.cos((90 - (-10.5)) * Math.PI / 180),
    Math.sin((90 - (-10.5)) * Math.PI / 180) * Math.sin((-171.0 + 180) * Math.PI / 180),
  )

  // 山C: lat:-53.0° lon:-44.8° / 4段・頂点20・中断1 20・中断3 10・裾段6
  // 山D: lat:67.9° lon:-123.2° / 3段・頂点12・中断6・裾段2
  // 山E: lat:62.0° lon:-101.4° / 4段・頂点16・中断1 8・中断2 6・裾段2
  const hillCDir = new THREE.Vector3(
    Math.sin((90 - (-53.0)) * Math.PI / 180) * Math.cos((-44.8 + 180) * Math.PI / 180),
    Math.cos((90 - (-53.0)) * Math.PI / 180),
    Math.sin((90 - (-53.0)) * Math.PI / 180) * Math.sin((-44.8 + 180) * Math.PI / 180),
  )
  const hillDDir = new THREE.Vector3(
    Math.sin((90 - 67.9)    * Math.PI / 180) * Math.cos((-123.2 + 180) * Math.PI / 180),
    Math.cos((90 - 67.9)    * Math.PI / 180),
    Math.sin((90 - 67.9)    * Math.PI / 180) * Math.sin((-123.2 + 180) * Math.PI / 180),
  )
  const hillEDir = new THREE.Vector3(
    Math.sin((90 - 62.0)    * Math.PI / 180) * Math.cos((-101.4 + 180) * Math.PI / 180),
    Math.cos((90 - 62.0)    * Math.PI / 180),
    Math.sin((90 - 62.0)    * Math.PI / 180) * Math.sin((-101.4 + 180) * Math.PI / 180),
  )

  // --- 地表メッシュ -------------------------------------------
  const geo = new THREE.SphereGeometry(R_C, 64, 64)
  const pos = geo.attributes.position

  // 頂点ごとにノイズを評価して押し出し & 頂点カラーを設定
  const colors = new Float32Array(pos.count * 3)
  const landRGB  = new THREE.Color(LAND_COLOR)
  const landNRGB = new THREE.Color(LAND_COLOR_N)
  const seaRGB   = new THREE.Color(SEA_COLOR)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const nx = x / R_C, ny = y / R_C, nz = z / R_C

    // オクターブ重ね: 低周波で大陸形状、高周波で細かい起伏
    const n = noise3D(nx * 1.8, ny * 1.8, nz * 1.8) * 0.7
            + noise3D(nx * 4.2, ny * 4.2, nz * 4.2) * 0.2
            + noise3D(nx * 9.0, ny * 9.0, nz * 9.0) * 0.1

    // 赤道面(y=0)から±5m 以内は川として強制的に海扱い
    const isRiver = Math.abs(y) < 5
    // 北極・南極から半径5m（10×10相当）は強制的に陸地
    const dNorth = Math.sqrt(x*x + (y-R_C)*(y-R_C) + z*z)
    const dSouth = Math.sqrt(x*x + (y+R_C)*(y+R_C) + z*z)
    const isPole = dNorth < 5 || dSouth < 5
    const arcDistA = R_C * Math.acos(Math.max(-1, Math.min(1, nx * hillADir.x + ny * hillADir.y + nz * hillADir.z)))
    const liftA    = arcDistA < HILL_STEP     ? 20
                   : arcDistA < HILL_STEP * 2 ? 6
                   : arcDistA < HILL_STEP * 3 ? 3
                   : 0

    const arcDistB = R_C * Math.acos(Math.max(-1, Math.min(1, nx * hillBDir.x + ny * hillBDir.y + nz * hillBDir.z)))
    const liftB    = arcDistB < HILL_STEP     ? 9
                   : arcDistB < HILL_STEP * 2 ? 6
                   : arcDistB < HILL_STEP * 3 ? 3
                   : 0

    const arcDistC = R_C * Math.acos(Math.max(-1, Math.min(1, nx * hillCDir.x + ny * hillCDir.y + nz * hillCDir.z)))
    const liftC    = arcDistC < HILL_STEP     ? 20
                   : arcDistC < HILL_STEP * 2 ? 20
                   : arcDistC < HILL_STEP * 3 ? 10
                   : arcDistC < HILL_STEP * 4 ? 6
                   : 0

    const arcDistD = R_C * Math.acos(Math.max(-1, Math.min(1, nx * hillDDir.x + ny * hillDDir.y + nz * hillDDir.z)))
    const liftD    = arcDistD < HILL_STEP     ? 12
                   : arcDistD < HILL_STEP * 2 ? 6
                   : arcDistD < HILL_STEP * 3 ? 2
                   : 0

    const arcDistE = R_C * Math.acos(Math.max(-1, Math.min(1, nx * hillEDir.x + ny * hillEDir.y + nz * hillEDir.z)))
    const liftE    = arcDistE < HILL_STEP     ? 16
                   : arcDistE < HILL_STEP * 2 ? 8
                   : arcDistE < HILL_STEP * 3 ? 6
                   : arcDistE < HILL_STEP * 4 ? 2
                   : 0

    const hillLift = Math.max(liftA, liftB, liftC, liftD, liftE)

    const isLand = (n >= LAND_THRESHOLD && !isRiver) || isPole || hillLift > 0
    const lift   = isLand ? LAND_LIFT : 0
    const len    = Math.sqrt(x * x + y * y + z * z)
    const scale  = (R_C + lift + hillLift) / len

    pos.setXYZ(i, x * scale, y * scale, z * scale)

    const c = isLand ? (y > 0 ? landNRGB : landRGB) : seaRGB
    colors[i * 3]     = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true })
  const surface = new THREE.Mesh(geo, mat)
  group.add(surface)
  terrainMeshes.push(surface)

  // --- 海面球 -------------------------------------------------
  const oceanGeo = new THREE.SphereGeometry(R_OCEAN, 48, 24)
  const oceanMat = new THREE.MeshLambertMaterial({
    color: OCEAN_COLOR,
    transparent: true,
    opacity: OCEAN_ALPHA,
    side: THREE.DoubleSide,
  })
  group.add(new THREE.Mesh(oceanGeo, oceanMat))

  // --- 緯度経度グリッド ----------------------------------------
  group.add(createLatLonGrid())

  return { group, terrainMeshes }
}

// 緯度10分割・経度10分割のグリッドを LineSegments で生成
// 座標系: theta = (lon + 180) * PI/180, phi = (90 - lat) * PI/180
const GRID_R   = 727.5  // グリッド球半径 (m)
const GRID_SEGS = 96    // 1本の円を近似するセグメント数

function createLatLonGrid() {
  const verts = []

  // 緯度線: -72, -54, -36, -18, 0, 18, 36, 54, 72（極は点なので除外）
  for (let lat = -72; lat <= 72; lat += 18) {
    const phi = (90 - lat) * Math.PI / 180
    const ry  = GRID_R * Math.cos(phi)  // 輪の y 座標
    const rr  = GRID_R * Math.sin(phi)  // 輪の半径
    for (let i = 0; i < GRID_SEGS; i++) {
      const t0 = (i / GRID_SEGS) * Math.PI * 2
      const t1 = ((i + 1) / GRID_SEGS) * Math.PI * 2
      verts.push(rr * Math.cos(t0), ry, rr * Math.sin(t0))
      verts.push(rr * Math.cos(t1), ry, rr * Math.sin(t1))
    }
  }

  // 経度線: 10本（-180 から 36° 刻み）
  for (let lon = -180; lon < 180; lon += 36) {
    const theta = (lon + 180) * Math.PI / 180
    const cosT  = Math.cos(theta), sinT = Math.sin(theta)
    for (let i = 0; i < GRID_SEGS; i++) {
      const lat0 = -90 + (i / GRID_SEGS) * 180
      const lat1 = -90 + ((i + 1) / GRID_SEGS) * 180
      const phi0 = (90 - lat0) * Math.PI / 180
      const phi1 = (90 - lat1) * Math.PI / 180
      verts.push(
        GRID_R * Math.sin(phi0) * cosT, GRID_R * Math.cos(phi0), GRID_R * Math.sin(phi0) * sinT,
        GRID_R * Math.sin(phi1) * cosT, GRID_R * Math.cos(phi1), GRID_R * Math.sin(phi1) * sinT,
      )
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.4,
  })
  return new THREE.LineSegments(geo, mat)
}

// 球面上の指定緯度経度にオブジェクトを配置するユーティリティ
// lat, lon: 度数法 (-90~90, -180~180)
export function placeOnSurface(group, object, lat, lon, radius = R_C) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  const x = radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  object.position.set(x, y, z)

  // 球面法線方向に立たせる
  const normal = new THREE.Vector3(x, y, z).normalize()
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)

  group.add(object)
}
