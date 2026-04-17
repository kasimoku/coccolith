import * as THREE from 'three'
import { R_C } from './main.js'

// ============================================================
//  coccolith — 惑星メッシュ
//  ここにmy-3d-partsのオブジェクトを配置していく
// ============================================================

export function createCoccolith() {
  const group = new THREE.Group()

  // 地表球体（起伏なし）
  const geo = new THREE.SphereGeometry(R_C, 128, 96)
  const mat = new THREE.MeshLambertMaterial({ color: 0x3d6b30 })
  group.add(new THREE.Mesh(geo, mat))

  // ここにオブジェクトを追加していく
  // 例: placeOnSurface(group, tree, lat, lon)

  return group
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
