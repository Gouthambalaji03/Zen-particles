import { ShapeType } from '../types'

const PHI = (1 + Math.sqrt(5)) / 2
const GOLDEN_ANGLE = Math.PI * 2 * (1 - 1 / PHI)

const randomSpherePoint = () => {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const r = Math.cbrt(Math.random())
  const x = r * Math.sin(phi) * Math.cos(theta)
  const y = r * Math.sin(phi) * Math.sin(theta)
  const z = r * Math.cos(phi)
  return [x, y, z] as const
}

const generateSphere = (count: number) => {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const [x, y, z] = randomSpherePoint()
    positions[i * 3] = x * 2
    positions[i * 3 + 1] = y * 2
    positions[i * 3 + 2] = z * 2
  }
  return positions
}

const generateHeart = (count: number) => {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2
    const v = Math.random() * Math.PI
    const x = Math.pow(Math.sin(u) * Math.sin(v), 3)
    const y = 0.8 * Math.cos(v) - 0.3 * Math.cos(2 * v) - 0.1 * Math.cos(3 * v) - 0.05 * Math.cos(4 * v)
    const z = Math.cos(u) * Math.sin(v)
    const radius = 0.1 + Math.random() * 0.3
    const [rx, ry, rz] = randomSpherePoint()
    positions[i * 3] = x * 2 + rx * radius
    positions[i * 3 + 1] = y * 2 + ry * radius
    positions[i * 3 + 2] = z * 2 + rz * radius
  }
  return positions
}

const generateFlower = (count: number) => {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const angle = i * GOLDEN_ANGLE
    const radius = Math.sqrt(i / count) * 2
    const petalHeight = Math.sin(angle * 8) * 0.3
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = petalHeight + (i / count - 0.5) * 0.5
    positions[i * 3 + 2] = Math.sin(angle) * radius
  }
  return positions
}

const generateSaturn = (count: number) => {
  const positions = new Float32Array(count * 3)
  const ringCount = Math.floor(count * 0.4)
  const sphereCount = count - ringCount
  for (let i = 0; i < sphereCount; i++) {
    const [x, y, z] = randomSpherePoint()
    positions[i * 3] = x * 1.2
    positions[i * 3 + 1] = y * 1.2
    positions[i * 3 + 2] = z * 1.2
  }
  for (let i = sphereCount; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1.8 + Math.random() * 0.8
    const thickness = (Math.random() - 0.5) * 0.1
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = thickness
    positions[i * 3 + 2] = Math.sin(angle) * radius
  }
  return positions
}

const generateBuddha = (count: number) => {
  const positions = new Float32Array(count * 3)
  const headCount = Math.floor(count * 0.25)
  const bodyCount = Math.floor(count * 0.5)
  const baseCount = count - headCount - bodyCount
  let idx = 0
  for (let i = 0; i < headCount; i++) {
    const [x, y, z] = randomSpherePoint()
    positions[idx * 3] = x * 0.6
    positions[idx * 3 + 1] = y * 0.6 + 1.5
    positions[idx * 3 + 2] = z * 0.6
    idx++
  }
  for (let i = 0; i < bodyCount; i++) {
    const [x, y, z] = randomSpherePoint()
    positions[idx * 3] = x * 1.2
    positions[idx * 3 + 1] = y * 1.5 + 0.3
    positions[idx * 3 + 2] = z * 1.2
    idx++
  }
  for (let i = 0; i < baseCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 0.5 + Math.random() * 0.8
    const height = -1.2 + (Math.random() - 0.5) * 0.4
    positions[idx * 3] = Math.cos(angle) * radius
    positions[idx * 3 + 1] = height
    positions[idx * 3 + 2] = Math.sin(angle) * radius
    idx++
  }
  return positions
}

const generateFireworks = (count: number) => {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const radius = Math.pow(Math.random(), 0.3) * 3
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }
  return positions
}

export const generateGeometry = (type: ShapeType, count: number) => {
  switch (type) {
    case 'sphere':
      return generateSphere(count)
    case 'heart':
      return generateHeart(count)
    case 'flower':
      return generateFlower(count)
    case 'saturn':
      return generateSaturn(count)
    case 'buddha':
      return generateBuddha(count)
    case 'fireworks':
      return generateFireworks(count)
    default:
      return generateSphere(count)
  }
}
