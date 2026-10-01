import * as THREE from 'three'
import { floorVert, floorFrag, fullVert, trailFrag, postFrag } from './shaders.js'

const FOV = 53.4
const TRAIL_RES = 256

// Renderer, camera, floor + reflection, cursor trail sim and the final lens pass.
export class Engine {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 1)
    this.renderer.autoClear = true
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000)

    // shared sheet uniforms, referenced by every card material
    this.sheetU = {
      u_half: { value: new THREE.Vector2(1, 1) },
      u_V: { value: 0 },
      u_C: { value: 1 },
      u_lean: { value: -0.12 },
    }

    this.#initFloor()
    this.#initTrail()
    this.#initPost()
    this.resize()
  }

  #initFloor() {
    this.reflectRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType })
    this.mirrorCam = this.camera.clone()
    this.mirrorCam.matrixAutoUpdate = false
    this.mirrorCam.matrixWorldAutoUpdate = false
    this.mirrorCam.layers.set(1)
    this.floorU = {
      u_refl: { value: this.reflectRT.texture },
      u_texMat: { value: new THREE.Matrix4() },
      u_cell: { value: 100 },
      u_depth: { value: 1000 },
      u_alpha: { value: 0 },
    }
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        vertexShader: floorVert,
        fragmentShader: floorFrag,
        uniforms: this.floorU,
        transparent: true,
        depthWrite: false,
      }),
    )
    this.floor.rotation.x = -Math.PI / 2
    this.floor.renderOrder = -1
    this.scene.add(this.floor)
  }

  #initTrail() {
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false }
    this.trailA = new THREE.WebGLRenderTarget(TRAIL_RES, TRAIL_RES, opts)
    this.trailB = this.trailA.clone()
    this.trailU = {
      u_prev: { value: null },
      u_texel: { value: new THREE.Vector2() },
      u_pos: { value: new THREE.Vector2(0.5, 0.5) },
      u_amp: { value: 0 },
      u_rad: { value: 0.04 },
      u_decay: { value: 1 },
      u_diff: { value: 0 },
      u_aspect: { value: 1 },
    }
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.trailScene = new THREE.Scene()
    this.trailScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: fullVert, fragmentShader: trailFrag, uniforms: this.trailU, depthTest: false })),
    )
    this.trailOn = false
  }

  #initPost() {
    this.postRT = new THREE.WebGLRenderTarget(4, 4, { samples: 4, type: THREE.HalfFloatType })
    this.postU = {
      u_scene: { value: this.postRT.texture },
      u_trail: { value: this.trailA.texture },
      u_trailTexel: { value: new THREE.Vector2() },
      u_res: { value: new THREE.Vector2() },
      u_ballWarp: { value: 0 },
      u_ballShade: { value: 0 },
      u_ballA: { value: 0 },
      u_holeC: { value: new THREE.Vector2(0.5, 0.5) },
      u_holeR: { value: 0.2 },
      u_holeP: { value: 0 },
      u_holeSq: { value: 0 },
      u_holeT: { value: 0 },
      u_time: { value: 0 },
    }
    this.postScene = new THREE.Scene()
    this.postScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: fullVert, fragmentShader: postFrag, uniforms: this.postU, depthTest: false })),
    )
  }

  resize() {
    const ww = window.innerWidth
    const wh = window.innerHeight
    this.ww = ww
    this.wh = wh
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(ww, wh, false)

    // 1 world unit = 1 css px on the z = 0 plane
    this.camera.aspect = ww / wh
    this.camZ = wh / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))
    this.camera.position.set(0, 0, this.camZ)
    this.camera.near = 1
    this.camera.far = this.camZ * 6
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    this.sheetU.u_half.value.set(ww / 2, wh / 2)

    const bw = Math.round(ww * dpr)
    const bh = Math.round(wh * dpr)
    this.postRT.setSize(bw, bh)
    this.reflectRT.setSize(Math.max(4, Math.round(bw * 0.15)), Math.max(4, Math.round(bh * 0.15)))
    const th = Math.round((TRAIL_RES * wh) / ww)
    this.trailA.setSize(TRAIL_RES, th)
    this.trailB.setSize(TRAIL_RES, th)
    this.trailU.u_texel.value.set(1 / TRAIL_RES, 1 / th)
    this.trailU.u_aspect.value = ww / wh
    this.postU.u_trailTexel.value.set(1 / TRAIL_RES, 1 / th)
    this.postU.u_res.value.set(ww, wh)
  }

  // floor sits a little under the strip; cell and fade scale with the viewport
  layoutFloor(cardH) {
    const H = this.wh / 2
    const y = -cardH / 2 - 0.06 * H
    this.floorY = y
    this.floor.position.set(0, y, 0)
    this.floor.scale.set(this.ww * 6, this.camZ * 3, 1)
    this.floorU.u_cell.value = 0.22 * H
    this.floorU.u_depth.value = this.camZ
  }

  #renderReflection() {
    const f = this.floorY
    const m = new THREE.Matrix4().makeTranslation(0, f, 0).multiply(new THREE.Matrix4().makeScale(1, -1, 1)).multiply(new THREE.Matrix4().makeTranslation(0, -f, 0))
    this.mirrorCam.projectionMatrix.copy(this.camera.projectionMatrix)
    this.mirrorCam.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse)
    this.mirrorCam.matrixWorld.copy(m).multiply(this.camera.matrixWorld)
    this.mirrorCam.matrixWorldInverse.copy(this.mirrorCam.matrixWorld).invert()
    const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    this.floorU.u_texMat.value.copy(bias).multiply(this.camera.projectionMatrix).multiply(this.mirrorCam.matrixWorldInverse)
    this.floor.visible = false
    this.renderer.setRenderTarget(this.reflectRT)
    this.renderer.render(this.scene, this.mirrorCam)
    this.floor.visible = true
  }

  // cursor trail step; returns whether the ball is visible
  stepTrail(dt, pos, amp) {
    if (!this.trailOn) return
    this.trailU.u_prev.value = this.trailA.texture
    this.trailU.u_pos.value.copy(pos)
    this.trailU.u_amp.value = amp
    this.trailU.u_decay.value = Math.exp(-4 * dt)
    this.trailU.u_diff.value = 1 - Math.exp(-40 * dt)
    this.renderer.setRenderTarget(this.trailB)
    this.renderer.render(this.trailScene, this.quadCam)
    ;[this.trailA, this.trailB] = [this.trailB, this.trailA]
    this.postU.u_trail.value = this.trailA.texture
  }

  render(time) {
    this.postU.u_time.value = time
    if (this.floorU.u_alpha.value > 0) this.#renderReflection()
    const lens = this.postU.u_holeP.value > 0 || this.postU.u_ballA.value > 0
    if (lens) {
      this.renderer.setRenderTarget(this.postRT)
      this.renderer.render(this.scene, this.camera)
      this.renderer.setRenderTarget(null)
      this.renderer.render(this.postScene, this.quadCam)
    } else {
      this.renderer.setRenderTarget(null)
      this.renderer.render(this.scene, this.camera)
    }
  }

  // world point -> css px (top-left origin) and perspective scale
  project(x, y, z, out = {}) {
    const v = this._v || (this._v = new THREE.Vector3())
    v.set(x, y, z).project(this.camera)
    out.x = (v.x * 0.5 + 0.5) * this.ww
    out.y = (-v.y * 0.5 + 0.5) * this.wh
    out.s = this.camZ / (this.camZ - z)
    return out
  }
}
