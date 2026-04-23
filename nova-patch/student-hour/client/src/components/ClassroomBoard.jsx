import { useEffect, useRef, useState } from 'react'

// Three.js 3D blackboard that writes Nova's response like chalk on a board
export default function ClassroomBoard({ text, state, onDone }) {
  const mountRef = useRef(null)
  const sceneRef = useRef(null)
  const [displayText, setDisplayText] = useState('')
  const [charIndex, setCharIndex] = useState(0)
  const animRef = useRef(null)

  // Typewriter effect — reveals text character by character
  useEffect(() => {
    if (!text) return
    setDisplayText('')
    setCharIndex(0)
    let i = 0
    const speed = 18 // ms per character

    function tick() {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1))
        i++
        animRef.current = setTimeout(tick, speed)
      } else {
        onDone?.()
      }
    }
    animRef.current = setTimeout(tick, speed)
    return () => clearTimeout(animRef.current)
  }, [text])

  // Three.js 3D board scene
  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    if (typeof window === 'undefined') return

    let THREE, renderer, scene, camera, frameId

    async function init() {
      try {
        THREE = await import('three')
      } catch {
        return // Three.js not available — CSS fallback handles it
      }

      const W = el.clientWidth || 800
      const H = el.clientHeight || 200

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      el.appendChild(renderer.domElement)

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
      camera.position.set(0, 0, 5)

      // Board background — dark green like a real blackboard
      const boardGeo = new THREE.BoxGeometry(10, 3.2, 0.12)
      const boardMat = new THREE.MeshStandardMaterial({ color: 0x1a3a2a })
      const board = new THREE.Mesh(boardGeo, boardMat)
      scene.add(board)

      // Board frame — dark wood
      const frameGeo = new THREE.BoxGeometry(10.4, 3.6, 0.08)
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x3B1F0E })
      const frame = new THREE.Mesh(frameGeo, frameMat)
      frame.position.z = -0.04
      scene.add(frame)

      // Lighting
      scene.add(new THREE.AmbientLight(0xfff5e0, 1.2))
      const spot = new THREE.SpotLight(0xfff0cc, 1.5)
      spot.position.set(0, 6, 4)
      spot.angle = Math.PI / 4
      scene.add(spot)

      // Chalk dust particles
      const particles = new THREE.BufferGeometry()
      const count = 60
      const pos = new Float32Array(count * 3)
      for (let i = 0; i < count * 3; i++) {
        pos[i] = (Math.random() - 0.5) * 10
      }
      particles.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, transparent: true, opacity: 0.3 })
      const points = new THREE.Points(particles, pMat)
      scene.add(points)

      sceneRef.current = { THREE, scene, camera, points }

      let t = 0
      function animate() {
        frameId = requestAnimationFrame(animate)
        t += 0.01
        // Subtle board sway
        board.rotation.y = Math.sin(t * 0.3) * 0.008
        // Drift chalk dust
        points.rotation.z += 0.001
        points.material.opacity = 0.2 + Math.sin(t) * 0.1
        renderer.render(scene, camera)
      }
      animate()
    }

    init()

    return () => {
      cancelAnimationFrame(frameId)
      renderer?.dispose()
      if (el.contains(renderer?.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  if (!text) return null

  return (
    <div style={{
      position: 'relative', width: '100%', background: '#0d2416',
      borderBottom: '2px solid #2a5a3a', flexShrink: 0,
      minHeight: 140, maxHeight: 220
    }}>
      {/* Three.js canvas — decorative board background */}
      <div ref={mountRef} style={{ position: 'absolute', inset: 0, opacity: 0.7 }} />

      {/* Chalk text overlay — the actual content */}
      <div style={{
        position: 'relative', zIndex: 2, padding: '16px 24px',
        height: '100%', display: 'flex', alignItems: 'center'
      }}>
        <div style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: 'clamp(12px, 1.6vw, 15px)',
          color: 'rgba(255,255,240,0.92)',
          lineHeight: 1.6,
          textShadow: '0 0 8px rgba(255,255,200,0.3)',
          letterSpacing: '0.03em',
          maxHeight: 180,
          overflowY: 'auto',
          wordBreak: 'break-word'
        }}>
          {displayText}
          {/* Chalk cursor */}
          {charIndex < (text?.length || 0) && (
            <span style={{
              display: 'inline-block', width: 2, height: '1em',
              background: 'rgba(255,255,200,0.8)', marginLeft: 2,
              animation: 'npulse 0.6s ease-in-out infinite',
              verticalAlign: 'middle'
            }} />
          )}
        </div>
      </div>

      {/* Board label */}
      <div style={{
        position: 'absolute', top: 6, right: 12, zIndex: 3,
        fontSize: 10, color: 'rgba(255,255,255,0.2)',
        textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'sans-serif'
      }}>
        Board
      </div>
    </div>
  )
}
