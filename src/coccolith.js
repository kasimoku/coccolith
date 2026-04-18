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
    const isLand = (n >= LAND_THRESHOLD && !isRiver) || isPole
    const lift   = isLand ? LAND_LIFT : 0
    const len    = Math.sqrt(x * x + y * y + z * z)
    const scale  = (R_C + lift) / len

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
  const oceanGeo = new THREE.SphereGeometry(R_OCEAN, 64, 48)
  const oceanMat = new THREE.MeshLambertMaterial({
    color: OCEAN_COLOR,
    transparent: true,
    opacity: OCEAN_ALPHA,
    side: THREE.DoubleSide,
  })
  group.add(new THREE.Mesh(oceanGeo, oceanMat))

  // ここにオブジェクトを追加していく
  // 例: const mountain = makeMountain(); group.add(mountain); terrainMeshes.push(mountain)

  return { group, terrainMeshes }
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
