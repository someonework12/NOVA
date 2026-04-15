import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const AVATAR_URL = 'https://models.readyplayer.me/6409f2b4bb2aff0001a54e7a.glb'

export default function NovaAvatar({ state = 'idle' }) {
  const mountRef = useRef(null)
  const sceneRef = useRef({})

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = el.clientWidth || 420
    const H = el.clientHeight || 480

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputEncoding = THREE.sRGBEncoding
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
    camera.position.set(0, 1.4, 2.2)
    camera.lookAt(0, 1.2, 0)

    const ambient = new THREE.AmbientLight(0xfff5e0, 1.2)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xfff0cc, 1.4)
    key.position.set(1, 3, 2)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffe8a0, 0.5)
    fill.position.set(-2, 1, 1)
    scene.add(fill)

    let mixer = null
    let clock = new THREE.Clock()
    let avatar = null
    let bobOffset = 0

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js'
    script.onload = () => {
      const loader = new THREE.GLTFLoader()
      loader.load(
        AVATAR_URL,
        (gltf) => {
          avatar = gltf.scene
          avatar.position.set(0, -0.9, 0)
          avatar.scale.set(1, 1, 1)
          scene.add(avatar)

          if (gltf.animations?.length) {
            mixer = new THREE.AnimationMixer(avatar)
            const clip = gltf.animations[0]
            const action = mixer.clipAction(clip)
            action.play()
          }
          sceneRef.current.avatar = avatar
          sceneRef.current.mixer = mixer
        },
        undefined,
        () => {
          const geometry = new THREE.SphereGeometry(0.4, 32, 32)
          const material = new THREE.MeshStandardMaterial({ color: 0xf5c842 })
          const sphere = new THREE.Mesh(geometry, material)
          sphere.position.set(0, 1.2, 0)
          scene.add(sphere)
          sceneRef.current.avatar = sphere
        }
      )
    }
    document.head.appendChild(script)

    let frameId
    function animate() {
      frameId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      if (sceneRef.current.mixer) sceneRef.current.mixer.update(delta)

      if (sceneRef.current.avatar) {
        bobOffset += delta
        const bobY = Math.sin(bobOffset * 1.2) * 0.012
        sceneRef.current.avatar.position.y = -0.9 + bobY

        if (sceneRef.current.state === 'thinking') {
          sceneRef.current.avatar.rotation.y += 0.008
        } else if (sceneRef.current.state === 'speaking') {
          const nod = Math.sin(bobOffset * 4) * 0.04
          sceneRef.current.avatar.rotation.x = nod
        } else {
          sceneRef.current.avatar.rotation.x *= 0.9
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    sceneRef.current = { ...sceneRef.current, renderer, scene, camera }

    return () => {
      cancelAnimationFrame(frameId)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
      script.remove()
    }
  }, [])

  useEffect(() => {
    sceneRef.current.state = state
  }, [state])

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 380, aspectRatio: '3/4' }}>
      {/* Glow ring behind avatar */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
      }}>
        <div style={{
          width: 280, height: 280, borderRadius: '50%',
          background: state === 'speaking'
            ? 'radial-gradient(circle, rgba(245,200,66,0.18) 0%, transparent 70%)'
            : state === 'thinking'
            ? 'radial-gradient(circle, rgba(139,94,60,0.22) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(245,200,66,0.08) 0%, transparent 70%)',
          transition: 'background 0.8s'
        }} />
      </div>

      <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }} />

      {/* State badge */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
        borderRadius: 'var(--radius-full)', padding: '5px 14px',
        display: 'flex', alignItems: 'center', gap: 7
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: state === 'speaking' ? '#22c55e' : state === 'thinking' ? 'var(--yellow-400)' : 'rgba(255,255,255,0.4)',
          transition: 'background 0.3s',
          animation: state !== 'idle' ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {state === 'thinking' ? 'Thinking' : state === 'speaking' ? 'Speaking' : 'Nova'}
        </span>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
