import * as THREE from 'three'

// ============================================================
//  cloud1 — ローポリ白球群の雲
//  my-3d-parts/parts/cloud1.jsx より Three.js 単体版として移植
// ============================================================

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export function createCloud1() {
  const group = new THREE.Group()
  const rand = mulberry32(7)

  const whiteMat = new THREE.MeshPhongMaterial({
    color: 0xffffff, flatShading: true, shininess: 60,
    transparent: true, opacity: 0.8
  })

  for (let i = 0; i < 6; i++) {
    const r = 1.2 + rand() * 0.8
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), whiteMat)
    ball.position.set((rand() * 2 - 1) * 1.5, rand() * 7.0 - 1.0, (rand() * 2 - 1) * 1.5)
    ball.rotation.y = rand() * Math.PI * 2
    ball.castShadow = true
    group.add(ball)
  }

  for (let i = 0; i < 3; i++) {
    const r = 2.2 + rand() * 0.4
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), whiteMat)
    ball.position.set((rand() * 2 - 1) * 1.0, (rand() * 2 - 1) * 1.0 + 1.0, (rand() * 2 - 1) * 1.0)
    ball.rotation.y = rand() * Math.PI * 2
    ball.castShadow = true
    group.add(ball)
  }

  for (let i = 0; i < 6; i++) {
    const r = 0.6 + rand() * 0.4
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), whiteMat)
    ball.position.set((rand() * 2 - 1) * 2.0, rand() * 5.0 + 2.0, (rand() * 2 - 1) * 2.0)
    ball.rotation.y = rand() * Math.PI * 2
    ball.castShadow = true
    group.add(ball)
  }

  for (let i = 0; i < 8; i++) {
    const r = 0.6 + rand() * 0.6
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), whiteMat)
    ball.position.set((rand() * 2 - 1) * 4.0, 0, (rand() * 2 - 1) * 4.0)
    ball.rotation.y = rand() * Math.PI * 2
    ball.castShadow = true
    group.add(ball)
  }

  const fixedBall = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1), whiteMat)
  fixedBall.position.set(0, 6.5, -1)
  fixedBall.castShadow = true
  group.add(fixedBall)

  return group
}
