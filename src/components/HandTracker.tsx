import { useEffect, useRef, useState } from 'react'
import { HandLandmarker, FilesetResolver, HandLandmarkerResult } from '@mediapipe/tasks-vision'
import { HandTrackerProps } from '../types'
import { VideoOff, RefreshCw } from 'lucide-react'

const tips = [4, 8, 12, 16, 20] as const

const CAMERA_UNAVAILABLE =
  'Camera access is unavailable. Ensure a webcam is connected, then allow permissions.'

const GPU_FALLBACK_NOTICE =
  'Hardware acceleration appears to be disabled. Falling back to CPU hand tracking, which may be slower.'

const getDistance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

const calculateTension = (result: HandLandmarkerResult) => {
  if (!result.landmarks || result.landmarks.length === 0) return 0
  const points = result.landmarks[0]
  const wrist = points[0]
  const palmSize = getDistance(points[9], wrist)
  const total = tips.reduce((acc, index) => acc + getDistance(points[index], wrist), 0)
  const average = total / tips.length
  const normalized = 1 - Math.max(0, Math.min(1, (average - palmSize * 0.5) / (palmSize * 1.5)))
  return normalized
}

const HandTracker = ({ onHandData }: HandTrackerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const animationFrameRef = useRef<number>()
  const lastTensionRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)

  const stopStream = () => {
    const current = streamRef.current
    if (current) {
      current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(CAMERA_UNAVAILABLE)
      return
    }

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {
            setError('Unable to start video playback. Refresh and allow camera access.')
          })
        }
      }
    } catch (err) {
      console.error('Camera access error:', err)
      if ((err as DOMException).name === 'NotAllowedError') {
        setError('Camera permission denied. Allow access and click retry.')
      } else if ((err as DOMException).name === 'NotFoundError') {
        setError('No webcam detected. Connect a camera and retry.')
      } else {
        setError(CAMERA_UNAVAILABLE)
      }
    }
  }

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const resolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
        )

        let landmarker: HandLandmarker | null = null
        try {
          landmarker = await HandLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'GPU'
            },
            numHands: 1,
            runningMode: 'VIDEO',
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          })
        } catch (gpuError) {
          console.warn('GPU hand tracking failed, falling back to CPU.', gpuError)
          setInfoMessage(GPU_FALLBACK_NOTICE)
          landmarker = await HandLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
              delegate: 'CPU'
            },
            numHands: 1,
            runningMode: 'VIDEO',
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
          })
        }

        setHandLandmarker(landmarker)
        await startCamera()
      } catch (err) {
        console.error('Hand landmarker initialization failed:', err)
        setError('Failed to initialize hand tracking. Refresh the page or try another browser.')
      } finally {
        setIsLoading(false)
      }
    }

    initialize()

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      stopStream()
    }
  }, [])

  useEffect(() => {
    const detect = async () => {
      if (!videoRef.current || !handLandmarker || videoRef.current.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect)
        return
      }

      const timestamp = performance.now()
      const result = handLandmarker.detectForVideo(videoRef.current, timestamp)

      if (result.landmarks && result.landmarks.length > 0) {
        const tension = calculateTension(result)
        lastTensionRef.current = tension
        onHandData({ tension, isDetected: true })
      } else {
        onHandData({ tension: lastTensionRef.current, isDetected: false })
      }

      animationFrameRef.current = requestAnimationFrame(detect)
    }

    if (handLandmarker) {
      detect()
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [handLandmarker, onHandData])

  const handleRetry = () => {
    setError(null)
    stopStream()
    startCamera()
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative w-40 h-30 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 bg-black/50 backdrop-blur-sm">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-white text-xs">Initializing...</div>
          </div>
        )}

        {(error || infoMessage) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-2">
            <VideoOff className="w-6 h-6 text-red-400 mb-2" />
            <div className="text-white text-xs text-center mb-2">
              {error ?? infoMessage}
            </div>
            {error && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white text-xs transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
          </div>
        )}

        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />

        <div className="absolute bottom-1 left-1 right-1">
          <div className="text-[10px] text-white/80 text-center font-mono bg-black/50 px-1 py-0.5 rounded">
            Hand Tracking
          </div>
        </div>
      </div>
    </div>
  )
}

export default HandTracker
