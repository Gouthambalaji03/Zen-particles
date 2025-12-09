import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { ParticleSystemProps } from '../types'
import { generateGeometry } from '../utils/geometryFactory'

const PARTICLE_COUNT = 8000
const TRAIL_LENGTH = 5

const RENDERER_OPTIONS: WebGLContextAttributes = {
  alpha: false,
  antialias: true,
  depth: true,
  stencil: false,
  preserveDrawingBuffer: false,
  powerPreference: 'default',
  failIfMajorPerformanceCaveat: false
}

const createRenderer = () => {
  const canvas = document.createElement('canvas')
  const candidates: Array<() => WebGLRenderingContext | WebGL2RenderingContext | null> = [
    () => canvas.getContext('webgl2', RENDERER_OPTIONS) as WebGL2RenderingContext | null,
    () => canvas.getContext('webgl', RENDERER_OPTIONS) as WebGLRenderingContext | null,
    () => canvas.getContext('experimental-webgl', RENDERER_OPTIONS) as WebGLRenderingContext | null
  ]

  for (const getContext of candidates) {
    const context = getContext()
    if (context) {
      try {
        return new THREE.WebGLRenderer({
          canvas,
          context,
          antialias: true,
          alpha: false
        })
      } catch (err) {
        console.warn('Unable to create renderer with provided context', err)
      }
    }
  }

  return null
}

const supportsWebGL = () => {
  const renderer = createRenderer()
  if (renderer) {
    renderer.dispose()
    return true
  }
  return false
}

type FallbackParticle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  offset: number
}

const toRgbaString = (hex: string, alpha = 0.85) => {
  const parsed = new THREE.Color(hex)
  const r = Math.round(parsed.r * 255)
  const g = Math.round(parsed.g * 255)
  const b = Math.round(parsed.b * 255)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const simplexNoise3D = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const vertexShader = `
${simplexNoise3D}

attribute vec3 targetPos;
attribute float randomness;
attribute float pScale;
attribute float trailIdx;

uniform float uTime;
uniform float uTension;
uniform float uExplosion;

varying float vAlpha;

void main() {
  float lag = trailIdx * 0.15;
  float effectiveTension = uTension * (1.0 - lag * 0.3);

  vec3 pos = mix(position, targetPos, effectiveTension);

  float noiseScale = 0.3;
  float noiseFreq = 0.5 + randomness * 0.5;
  vec3 noisePos = pos * noiseFreq + uTime * 0.2;
  float noise = snoise(noisePos) * noiseScale * (1.0 - effectiveTension);
  pos += noise;

  float breathe = sin(uTime * 0.5 + randomness * 6.28) * 0.05;
  pos *= 1.0 + breathe * (1.0 - effectiveTension * 0.5);

  float gravity = (1.0 - effectiveTension) * 0.3;
  pos.y -= gravity * (1.0 + randomness);

  if (uExplosion > 0.0) {
    vec3 explosionDir = normalize(pos);
    pos += explosionDir * uExplosion * 2.0 * (1.0 + randomness);
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float depth = -mvPosition.z;
  float baseSize = 3.0 + pScale * 2.0;
  gl_PointSize = baseSize * pScale * (300.0 / depth);

  vAlpha = 1.0 - (trailIdx / float(${TRAIL_LENGTH})) * 0.7;
}
`;

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  if (dist > 0.5) {
    discard;
  }

  float radialGradient = 1.0 - smoothstep(0.0, 0.5, dist);

  vec3 hotCenter = vec3(1.0);
  vec3 finalColor = mix(uColor, hotCenter, radialGradient * 0.6);

  float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

const ParticleSystem = ({ shape, color, tension, explosion }: ParticleSystemProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene>()
  const cameraRef = useRef<THREE.PerspectiveCamera>()
  const rendererRef = useRef<THREE.WebGLRenderer>()
  const particlesRef = useRef<THREE.Points>()
  const materialRef = useRef<THREE.ShaderMaterial>()
  const geometryRef = useRef<THREE.BufferGeometry>()
  const animationFrameRef = useRef<number>()
  const startTimeRef = useRef<number>(Date.now())
  const tensionRef = useRef<number>(tension)
  const colorRef = useRef<string>(color)
  const lastTensionRef = useRef<number>(0)
  const explosionTimeRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null)
  const fallbackAnimationRef = useRef<number>()
  const fallbackParticlesRef = useRef<FallbackParticle[]>([])
  const fallbackExplosionRef = useRef<number>(0)
  const fallbackColorRef = useRef<string>(toRgbaString(color))

  useEffect(() => {
    if (!containerRef.current) return

    if (!supportsWebGL()) {
      setError('WebGL is not available. Enable hardware acceleration or use a compatible browser.')
      return
    }

    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = 5
    cameraRef.current = camera

    const renderer = createRenderer()
    if (!renderer) {
      console.error('Failed to create WebGL renderer: no compatible context available.')
      setError(
        'Unable to create a WebGL context. Enable browser hardware acceleration or use a browser/device with WebGL support.'
      )
      return
    }

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 1)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const handleResize = () => {
      if (!camera || !renderer) return
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('resize', handleResize)

    const animate = () => {
      const sceneCurrent = sceneRef.current
      const cameraCurrent = cameraRef.current
      const rendererCurrent = rendererRef.current
      const materialCurrent = materialRef.current

      animationFrameRef.current = requestAnimationFrame(animate)

      if (!sceneCurrent || !cameraCurrent || !rendererCurrent || !materialCurrent) {
        return
      }

      const elapsedTime = (Date.now() - startTimeRef.current) / 1000
      materialCurrent.uniforms.uTime.value = elapsedTime

      const targetTension = 1 - tensionRef.current
      lastTensionRef.current += (targetTension - lastTensionRef.current) * 0.1
      materialCurrent.uniforms.uTension.value = lastTensionRef.current

      if (explosionTimeRef.current > 0) {
        explosionTimeRef.current *= 0.92
        materialCurrent.uniforms.uExplosion.value = explosionTimeRef.current
      }

      rendererCurrent.render(sceneCurrent, cameraCurrent)
    }

    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (renderer) {
        renderer.dispose()
        renderer.forceContextLoss()
      }
      if (containerRef.current && renderer) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    if (error) return
    if (!sceneRef.current) return

    if (particlesRef.current) {
      sceneRef.current.remove(particlesRef.current)
      if (geometryRef.current) {
        geometryRef.current.dispose()
      }
      if (materialRef.current) {
        materialRef.current.dispose()
      }
    }

    const targetPositions = generateGeometry(shape, PARTICLE_COUNT)
    const totalVertices = PARTICLE_COUNT * TRAIL_LENGTH

    const positions = new Float32Array(totalVertices * 3)
    const targetPos = new Float32Array(totalVertices * 3)
    const randomness = new Float32Array(totalVertices)
    const pScale = new Float32Array(totalVertices)
    const trailIdx = new Float32Array(totalVertices)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseIdx = i * 3

      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const vertexIdx = (i * TRAIL_LENGTH + t) * 3

        targetPos[vertexIdx] = targetPositions[baseIdx]
        targetPos[vertexIdx + 1] = targetPositions[baseIdx + 1]
        targetPos[vertexIdx + 2] = targetPositions[baseIdx + 2]

        positions[vertexIdx] = (Math.random() - 0.5) * 10
        positions[vertexIdx + 1] = (Math.random() - 0.5) * 10
        positions[vertexIdx + 2] = (Math.random() - 0.5) * 10

        const flatIdx = i * TRAIL_LENGTH + t
        randomness[flatIdx] = Math.random()
        pScale[flatIdx] = 0.5 + Math.random() * 1
        trailIdx[flatIdx] = t
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(targetPos, 3))
    geometry.setAttribute('randomness', new THREE.BufferAttribute(randomness, 1))
    geometry.setAttribute('pScale', new THREE.BufferAttribute(pScale, 1))
    geometry.setAttribute('trailIdx', new THREE.BufferAttribute(trailIdx, 1))
    geometryRef.current = geometry

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTension: { value: 0 },
        uExplosion: { value: 0 },
        uColor: { value: new THREE.Color(colorRef.current) }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    materialRef.current = material

    const particles = new THREE.Points(geometry, material)
    sceneRef.current.add(particles)
    particlesRef.current = particles
  }, [shape, error])

  useEffect(() => {
    tensionRef.current = tension
  }, [tension])

  useEffect(() => {
    colorRef.current = color
    fallbackColorRef.current = toRgbaString(color)
    if (error) return
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value = new THREE.Color(color)
    }
  }, [color, error])

  useEffect(() => {
    if (explosion > 0) {
      if (error) {
        fallbackExplosionRef.current = Math.max(fallbackExplosionRef.current, explosion * 20)
      } else {
        explosionTimeRef.current = explosion
        if (materialRef.current) {
          materialRef.current.uniforms.uExplosion.value = explosion
        }
      }
    }
  }, [explosion, error])

  useEffect(() => {
    if (!error) {
      if (fallbackAnimationRef.current) {
        cancelAnimationFrame(fallbackAnimationRef.current)
        fallbackAnimationRef.current = undefined
      }
      return
    }

    const canvas = fallbackCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const createParticles = () => {
      const width = canvas.width
      const height = canvas.height
      const count = 600
      const particles: FallbackParticle[] = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          radius: 1 + Math.random() * 2.5,
          alpha: 0.3 + Math.random() * 0.5,
          offset: Math.random() * Math.PI * 2
        })
      }
      fallbackParticlesRef.current = particles
    }

    createParticles()

    const animateFallback = () => {
      const width = canvas.width
      const height = canvas.height
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(0, 0, width, height)

      const particles = fallbackParticlesRef.current
      const colorString = fallbackColorRef.current
      const baseSpeed = 0.5 + tensionRef.current * 1.6
      const explosionForce = fallbackExplosionRef.current
      fallbackExplosionRef.current *= 0.9
      const time = performance.now() * 0.0005

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += (p.vx + Math.cos(time + p.offset) * 0.25) * baseSpeed
        p.y += (p.vy + Math.sin(time + p.offset) * 0.25) * baseSpeed

        if (explosionForce > 0.03) {
          const angle = Math.atan2(p.y - height / 2, p.x - width / 2)
          p.vx += Math.cos(angle) * explosionForce * 0.015
          p.vy += Math.sin(angle) * explosionForce * 0.015
        }

        if (p.x < -10) p.x = width + 10
        if (p.x > width + 10) p.x = -10
        if (p.y < -10) p.y = height + 10
        if (p.y > height + 10) p.y = -10

        ctx.globalAlpha = p.alpha * (0.7 + tensionRef.current * 0.4)
        ctx.fillStyle = colorString
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * (1 + tensionRef.current * 0.4), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      fallbackAnimationRef.current = requestAnimationFrame(animateFallback)
    }

    animateFallback()

    return () => {
      if (fallbackAnimationRef.current) {
        cancelAnimationFrame(fallbackAnimationRef.current)
        fallbackAnimationRef.current = undefined
      }
      window.removeEventListener('resize', resize)
    }
  }, [error])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'linear-gradient(to bottom, #000000, #1a1a1a)' }}
    >
      {error && (
        <>
          <canvas
            ref={fallbackCanvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ opacity: 0.9 }}
          />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center px-6 text-white/80 pointer-events-none max-w-lg">
            <p className="text-lg font-semibold mb-1">Compatibility Mode</p>
            <p className="text-sm leading-relaxed">{error}</p>
            <p className="text-xs text-white/60 mt-3">
              A 2D particle fallback is active. Enable WebGL or hardware acceleration for the full 3D Zen Particles experience.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default ParticleSystem
