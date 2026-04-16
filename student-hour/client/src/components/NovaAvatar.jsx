import { useEffect, useRef } from 'react'

export default function NovaAvatar({ state = 'idle' }) {
  const mountRef = useRef(null)
  const stateRef = useRef(state)

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    let THREE, renderer, scene, camera, mixer, clock, frameId, avatar
    let bobOffset = 0

    async function init() {
      THREE = await import('three')
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js').catch(() => ({ GLTFLoader: null }))

      const W = el.clientWidth || 400
      const H = el.clientHeight || 480

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      el.appendChild(renderer.domElement)

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
      camera.position.set(0, 1.4, 2.2)
      camera.lookAt(0, 1.2, 0)

      scene.add(new THREE.AmbientLight(0xfff5e0, 1.2))
      const key = new THREE.DirectionalLight(0xfff0cc, 1.4)
      key.position.set(1, 3, 2); scene.add(key)
      const fill = new THREE.DirectionalLight(0xffe8a0, 0.4)
      fill.position.set(-2, 1, 1); scene.add(fill)

      clock = new THREE.Clock()

      // Try loading Ready Player Me avatar
      if (GLTFLoader) {
        const loader = new GLTFLoader()
        loader.load(
          'https://models.readyplayer.me/6409f2b4bb2aff0001a54e7a.glb',
          gltf => {
            avatar = gltf.scene
            avatar.position.set(0, -0.9, 0)
            scene.add(avatar)
            if (gltf.animations?.length) {
              mixer = new THREE.AnimationMixer(avatar)
              mixer.clipAction(gltf.animations[0]).play()
            }
          },
          undefined,
          () => buildFallback(THREE, scene)
        )
      } else {
        buildFallback(THREE, scene)
      }

      function animate() {
        frameId = requestAnimationFrame(animate)
        const delta = clock.getDelta()
        if (mixer) mixer.update(delta)
        bobOffset += delta
        if (avatar) {
          avatar.position.y = -0.9 + Math.sin(bobOffset * 1.2) * 0.012
          const s = stateRef.current
          if (s === 'thinking') {
            avatar.rotation.y += 0.007
          } else if (s === 'speaking') {
            avatar.rotation.x = Math.sin(bobOffset * 5) * 0.035
          } else {
            avatar.rotation.x *= 0.88
          }
        }
        renderer.render(scene, camera)
      }
      animate()
    }

    function buildFallback(THREE, scene) {
      // Stylised Nova fallback — golden sphere with ring
      const group = new THREE.Group()
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 32), new THREE.MeshStandardMaterial({ color: 0xf5c842 }))
      head.position.set(0, 1.2, 0)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.04, 16, 64), new THREE.MeshStandardMaterial({ color: 0x7a3d14 }))
      ring.position.set(0, 1.2, 0); ring.rotation.x = Math.PI / 2
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.7, 32), new THREE.MeshStandardMaterial({ color: 0x5c2e10 }))
      body.position.set(0, 0.62, 0)
      group.add(head, ring, body)
      scene.add(group)
      avatar = group
    }

    init()

    return () => {
      cancelAnimationFrame(frameId)
      if (renderer) { renderer.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement) }
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 360, aspectRatio: '3/4' }}>
      {/* Glow ring */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{
          width: 260, height: 260, borderRadius: '50%',
          background: state === 'speaking'
            ? 'radial-gradient(circle,rgba(245,200,66,0.2) 0%,transparent 70%)'
            : state === 'thinking'
            ? 'radial-gradient(circle,rgba(139,94,60,0.25) 0%,transparent 70%)'
            : 'radial-gradient(circle,rgba(245,200,66,0.07) 0%,transparent 70%)',
          transition: 'background 1s'
        }} />
      </div>
      <div ref={mountRef} style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }} />
      {/* State pill */}
      <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', borderRadius: 'var(--radius-full)', padding: '5px 13px', display: 'flex', alignItems: 'center', gap: 7 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: state === 'speaking' ? '#22c55e' : state === 'thinking' ? 'var(--yellow-400)' : 'rgba(255,255,255,0.3)', transition: 'background 0.3s', animation: state !== 'idle' ? 'npulse 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {state === 'thinking' ? 'Thinking' : state === 'speaking' ? 'Speaking' : 'Nova'}
        </span>
      </div>
      <style>{`@keyframes npulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
