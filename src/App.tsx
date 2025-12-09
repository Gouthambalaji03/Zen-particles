import { useState, useCallback, useRef } from 'react'
import HandTracker from './components/HandTracker'
import ParticleSystem from './components/ParticleSystem'
import Controls from './components/Controls'
import { ShapeType, HandData } from './types'

function App() {
  const [shape, setShape] = useState<ShapeType>('heart')
  const [color, setColor] = useState<string>('#00ffff')
  const [tension, setTension] = useState<number>(0)
  const [explosion, setExplosion] = useState<number>(0)

  const prevTensionRef = useRef<number>(0)
  const clapTimeoutRef = useRef<number>()

  const handleHandData = useCallback((data: HandData) => {
    setTension(data.tension)

    const prevTension = prevTensionRef.current
    const currentTension = data.tension

    if (prevTension < 0.35 && currentTension > 0.8) {
      setExplosion(1)

      clapTimeoutRef.current = window.setTimeout(() => {
        setExplosion(0)
      }, 500)
    }

    prevTensionRef.current = currentTension
  }, [])

  const handleShapeChange = useCallback((newShape: ShapeType) => {
    setShape(newShape)
  }, [])

  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor)
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <ParticleSystem shape={shape} color={color} tension={tension} explosion={explosion} />
      <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-40 text-center">
        <h1 className="text-white text-4xl font-bold tracking-wider mb-2 drop-shadow-2xl">
          ZEN PARTICLES
        </h1>
        <p className="text-white/60 text-sm tracking-wide">
          Open hand to expand
        </p>
      </div>
      <HandTracker onHandData={handleHandData} />
      <Controls
        shape={shape}
        color={color}
        tension={tension}
        onShapeChange={handleShapeChange}
        onColorChange={handleColorChange}
      />
    </div>
  )
}

export default App
