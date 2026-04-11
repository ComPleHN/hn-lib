"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

type Body = {
  mesh: THREE.Mesh
  vel: THREE.Vector3
}

export function PuzzleBoxGame() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f1219)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.set(6.5, 5.2, 8)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const sizeFromEl = () => {
      const r = el.getBoundingClientRect()
      const w = Math.max(280, r.width)
      const h = Math.min(420, Math.round(w * 0.58))
      return { w, h }
    }

    const { w: iw, h: ih } = sizeFromEl()
    camera.aspect = iw / ih
    camera.updateProjectionMatrix()
    renderer.setSize(iw, ih)
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.target.set(0, 1.1, 0)

    scene.add(new THREE.AmbientLight(0x7a8fb8, 0.45))
    const dir = new THREE.DirectionalLight(0xffffff, 1.15)
    dir.position.set(5, 11, 7)
    scene.add(dir)

    const colors = [0x56f0a0, 0x6eb8ff, 0xff8ad8, 0xffd56a, 0xc9a0ff, 0x7cf5ff]
    const bodies: Body[] = []

    for (let i = 0; i < 6; i++) {
      const geo = new THREE.BoxGeometry(1, 1, 1)
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.38,
        metalness: 0.12,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set((i % 3) * 1.15 - 1.15, 2.4 + i * 0.65, ((i * 7) % 5) * 0.35 - 0.7)
      scene.add(mesh)
      bodies.push({ mesh, vel: new THREE.Vector3(0, 0, 0) })
    }

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x2a3142,
      roughness: 0.92,
      metalness: 0.05,
    })
    const room = new THREE.Group()
    const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.25, 8), wallMat)
    floor.position.y = -0.125
    room.add(floor)
    const wT = 0.22
    const wallH = 4
    const wall1 = new THREE.Mesh(new THREE.BoxGeometry(wT, wallH, 8), wallMat)
    wall1.position.set(-5, wallH / 2, 0)
    room.add(wall1)
    const wall2 = new THREE.Mesh(new THREE.BoxGeometry(wT, wallH, 8), wallMat)
    wall2.position.set(5, wallH / 2, 0)
    room.add(wall2)
    const wall3 = new THREE.Mesh(new THREE.BoxGeometry(10, wallH, wT), wallMat)
    wall3.position.set(0, wallH / 2, -4)
    room.add(wall3)
    const wall4 = new THREE.Mesh(new THREE.BoxGeometry(10, wallH, wT), wallMat)
    wall4.position.set(0, wallH / 2, 4)
    room.add(wall4)
    scene.add(room)

    const gravity = -24
    const half = 0.5
    const bx: [number, number] = [-4.35, 4.35]
    const bz: [number, number] = [-3.35, 3.35]

    let raf = 0
    const tick = () => {
      const dt = 1 / 60
      for (const b of bodies) {
        b.vel.y += gravity * dt
        b.mesh.position.addScaledVector(b.vel, dt)
        const p = b.mesh.position

        if (p.y - half < 0.125) {
          p.y = 0.125 + half
          b.vel.y *= -0.32
          b.vel.x *= 0.9
          b.vel.z *= 0.9
        }

        if (p.x - half < bx[0]) {
          p.x = bx[0] + half
          b.vel.x *= -0.48
        } else if (p.x + half > bx[1]) {
          p.x = bx[1] - half
          b.vel.x *= -0.48
        }

        if (p.z - half < bz[0]) {
          p.z = bz[0] + half
          b.vel.z *= -0.48
        } else if (p.z + half > bz[1]) {
          p.z = bz[1] - half
          b.vel.z *= -0.48
        }

        b.mesh.rotation.x += b.vel.z * 0.018
        b.mesh.rotation.y += b.vel.x * 0.018
      }

      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onResize = () => {
      const { w, h } = sizeFromEl()
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement)
      }
      const materials = new Set<THREE.Material>()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const m = obj.material
          if (Array.isArray(m)) m.forEach((x) => materials.add(x))
          else materials.add(m)
        }
      })
      materials.forEach((m) => m.dispose())
      scene.clear()
    }
  }, [])

  return (
    <div className="space-y-3">
      <div
        ref={mountRef}
        className="w-full min-h-[200px] rounded-lg border border-border bg-card overflow-hidden"
      />
      <p className="text-sm text-muted-foreground text-center">
        拖动旋转视角：彩色方块受简易重力与边界反弹影响。可作为 Three.js 与轻量物理原型的起点。
      </p>
    </div>
  )
}
