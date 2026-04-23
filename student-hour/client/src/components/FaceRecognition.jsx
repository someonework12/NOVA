import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Face Recognition using face-api.js (free, runs entirely in browser)
// Recognises registered students and people Nova has been introduced to

export default function FaceRecognition({ onRecognised, onUnknown, active }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | loading | ready | running | error
  const [recognised, setRecognised] = useState(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)
  const modelsLoaded = useRef(false)

  useEffect(() => {
    if (active) startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [active])

  async function loadModels() {
    if (modelsLoaded.current) return true
    setStatus('loading')
    try {
      // Load face-api.js from CDN
      await loadScript('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js')
      const faceapi = window.faceapi
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      modelsLoaded.current = true
      return true
    } catch (e) {
      console.warn('Face-api models failed to load:', e.message)
      setStatus('error')
      return false
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
      const s = document.createElement('script')
      s.src = src; s.onload = resolve; s.onerror = reject
      document.head.appendChild(s)
    })
  }

  async function startCamera() {
    setStatus('loading')
    const ok = await loadModels()
    if (!ok) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('running')
      startDetection()
    } catch (e) {
      setStatus('error')
      console.warn('Camera access denied:', e.message)
    }
  }

  function stopCamera() {
    clearInterval(intervalRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setStatus('idle')
  }

  async function startDetection() {
    if (!window.faceapi) return
    const faceapi = window.faceapi

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.paused || video.ended) return

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 }))
          .withFaceLandmarks(true)
          .withFaceDescriptors()
          .withFaceExpressions()

        if (!detections.length) {
          setRecognised(null)
          return
        }

        // Load known faces from Supabase
        const { data: faceData } = await supabase
          .from('face_profiles')
          .select('name, relationship, descriptor')

        const det = detections[0]
        let matchName = null
        let matchRel = null
        let minDist = 0.5 // threshold — lower = stricter

        if (faceData?.length) {
          for (const fp of faceData) {
            try {
              const stored = new Float32Array(JSON.parse(fp.descriptor))
              const dist = faceapi.euclideanDistance(det.descriptor, stored)
              if (dist < minDist) {
                minDist = dist
                matchName = fp.name
                matchRel = fp.relationship
              }
            } catch (_) {}
          }
        }

        if (matchName) {
          setRecognised({ name: matchName, relationship: matchRel, confidence: Math.round((1 - minDist) * 100) })
          onRecognised?.({ name: matchName, relationship: matchRel })
        } else {
          setRecognised({ name: 'Unknown', relationship: 'stranger', confidence: 0, descriptor: Array.from(det.descriptor) })
          onUnknown?.({ descriptor: Array.from(det.descriptor), expression: Object.entries(det.expressions).sort((a,b)=>b[1]-a[1])[0][0] })
        }
      } catch (_) {}
    }, 2000) // Check every 2 seconds
  }

  if (!active) return null

  return (
    <div style={{ position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
      <video ref={videoRef} style={{ width:'100%', height:'auto', display:'block', transform:'scaleX(-1)' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display:'none' }} />

      {/* Status overlay */}
      <div style={{ position:'absolute', top:8, left:8, background:'rgba(0,0,0,0.7)', borderRadius:99, padding:'3px 10px', fontSize:10, color:'rgba(255,255,255,0.7)', backdropFilter:'blur(8px)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:'sans-serif' }}>
        {status === 'loading' ? '⟳ Loading...' : status === 'error' ? '✗ No camera' : status === 'running' ? '◉ Watching' : '○ Off'}
      </div>

      {/* Recognition result */}
      {recognised && (
        <div style={{ position:'absolute', bottom:8, left:8, right:8, background:'rgba(0,0,0,0.8)', borderRadius:8, padding:'6px 10px', backdropFilter:'blur(8px)', border:`1px solid ${recognised.name==='Unknown'?'rgba(255,255,255,0.1)':'rgba(245,200,66,0.3)'}` }}>
          <div style={{ fontSize:11, fontWeight:600, color: recognised.name==='Unknown'?'rgba(255,255,255,0.5)':'#f5c842', fontFamily:'sans-serif' }}>
            {recognised.name === 'Unknown' ? '? Unrecognised' : `✓ ${recognised.name}`}
          </div>
          {recognised.relationship && recognised.name !== 'Unknown' && (
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontFamily:'sans-serif' }}>{recognised.relationship}</div>
          )}
        </div>
      )}
    </div>
  )
}
