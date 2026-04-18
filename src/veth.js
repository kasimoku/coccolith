import * as THREE from 'three'
import { R_V } from './constants.js'

// ============================================================
//  veth — 衛星メッシュ（Claude 担当）
//  静かに変化し続ける星
// ============================================================

export function createVeth() {
  const group = new THREE.Group()

  // 地表球体（わずかな起伏）
  const geo = new THREE.SphereGeometry(R_V, 64, 64)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const len = Math.sqrt(x * x + y * y + z * z)
    const n = Math.sin(x * 0.09) * Math.cos(y * 0.09) * 4 + Math.random() * 2
    const s = (R_V + n) / len
    pos.setXYZ(i, x * s, y * s, z * s)
  }
  geo.computeVertexNormals()

  const mat = new THREE.MeshLambertMaterial({ color: 0xbacdd8 })
  group.add(new THREE.Mesh(geo, mat))

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
