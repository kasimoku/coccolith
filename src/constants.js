import * as THREE from 'three'

// ============================================================
//  定数 — 全モジュール共有
//  単位: 1 unit = 1m
// ============================================================

export const R_C        = 720     // coccolith 半径 (m)
export const R_V        = 300     // veth 半径 (m)
export const ORBIT      = 3240    // veth 軌道半径・惑星中心から (m)
export const LAND_LIFT  = 7       // 陸地の押し出し量 (m)  → 陸地頂点半径 R_C+7 = 727m

// veth の位置（北から30°傾いた方向）
export const VETH_POS = new THREE.Vector3(
  ORBIT * Math.sin(Math.PI / 6),
  ORBIT * Math.cos(Math.PI / 6),
  0
)
