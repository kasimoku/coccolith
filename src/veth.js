import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import Alea from 'alea'
import { R_V } from './constants.js'

// ============================================================
//  veth — 衛星メッシュ（Claude 担当）
//  静かに変化し続ける星
//
//  データ予算: coccolith 総頂点数の半分以内（上限 ~4,549頂点）
//  現在の使用: 地表 1,369 + 大気 425 = 1,794頂点
// ============================================================

// 地表カラー
const ICE_COLOR  = new THREE.Color(0xdce8f0)  // 極冠: 白青
const DUST_COLOR = new THREE.Color(0x9badb8)  // 中緯度: 青灰
const ROCK_COLOR = new THREE.Color(0x6e8088)  // 赤道帯: 暗岩

export function createVeth() {
  const group = new THREE.Group()
  const noise3D = createNoise3D(Alea('veth'))

  // --- 地表 (36×36 = 1,369頂点) ----------------------------
  const geo = new THREE.SphereGeometry(R_V, 36, 36)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const len = Math.sqrt(x*x + y*y + z*z)
    const nx = x/len, ny = y/len, nz = z/len

    const n = noise3D(nx * 2.5, ny * 2.5, nz * 2.5) * 0.6
            + noise3D(nx * 6.0, ny * 6.0, nz * 6.0) * 0.3
            + noise3D(nx * 13.0, ny * 13.0, nz * 13.0) * 0.1

    pos.setXYZ(i, x * (R_V + n * 4) / len, y * (R_V + n * 4) / len, z * (R_V + n * 4) / len)

    // 緯度（|ny|）が高いほど極冠色、低いほど岩色
    const absLat   = Math.abs(ny)
    const iceBlend  = Math.pow(Math.max(0, (absLat - 0.62) / 0.38), 1.4)
    const rockBlend = Math.max(0, (0.28 - absLat) / 0.28) * (n * 0.5 + 0.5) * 0.6

    const c = new THREE.Color().copy(DUST_COLOR)
      .lerp(ICE_COLOR,  iceBlend)
      .lerp(ROCK_COLOR, rockBlend)

    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })))

  // --- 大気層 (24×16 = 425頂点) ----------------------------
  const atmGeo = new THREE.SphereGeometry(R_V * 1.04, 24, 16)
  const atmMat = new THREE.MeshLambertMaterial({
    color: 0xb8d4e8, transparent: true, opacity: 0.12, side: THREE.FrontSide,
  })
  group.add(new THREE.Mesh(atmGeo, atmMat))

  return group
}

// veth 球面上にオブジェクトを配置するユーティリティ
export function placeOnVeth(group, object, lat, lon) {
  const phi   = (90 - lat)  * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)

  const x = R_V * Math.sin(phi) * Math.cos(theta)
  const y = R_V * Math.cos(phi)
  const z = R_V * Math.sin(phi) * Math.sin(theta)

  object.position.set(x, y, z)

  const normal = new THREE.Vector3(x, y, z).normalize()
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)

  group.add(object)
}
