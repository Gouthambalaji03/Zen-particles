import { ShapeType } from '../types';

const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
const GOLDEN_ANGLE = Math.PI * 2 * (1 - 1 / PHI);

function randomSpherePoint(): [number, number, number] {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = Math.cbrt(Math.random());

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  return [x, y, z];
}

function generateSphere(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const [x, y, z] = randomSpherePoint();
    positions[i * 3] = x * 2;
    positions[i * 3 + 1] = y * 2;
    positions[i * 3 + 2] = z * 2;
  }

  return positions;
}

function generateHeart(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI;

    // 3D parametric heart equations
    const x = (Math.sin(u) * Math.sin(v)) ** 3;
    const y = (
      0.8 * Math.cos(v) -
      0.3 * Math.cos(2 * v) -
      0.1 * Math.cos(3 * v) -
      0.05 * Math.cos(4 * v)
    );
    const z = Math.cos(u) * Math.sin(v);

    // Add some randomness for volume
    const radius = 0.1 + Math.random() * 0.3;
    const [rx, ry, rz] = randomSpherePoint();

    positions[i * 3] = x * 2 + rx * radius;
    positions[i * 3 + 1] = y * 2 + ry * radius;
    positions[i * 3 + 2] = z * 2 + rz * radius;
  }

  return positions;
}

function generateFlower(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Phyllotaxis pattern (Fibonacci spiral)
    const angle = i * GOLDEN_ANGLE;
    const radius = Math.sqrt(i / count) * 2;

    // Create 3D flower with petals
    const petalHeight = Math.sin(angle * 8) * 0.3;
    const x = Math.cos(angle) * radius;
    const y = petalHeight + (i / count - 0.5) * 0.5;
    const z = Math.sin(angle) * radius;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

function generateSaturn(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const ringCount = Math.floor(count * 0.4);
  const sphereCount = count - ringCount;

  // Central sphere
  for (let i = 0; i < sphereCount; i++) {
    const [x, y, z] = randomSpherePoint();
    positions[i * 3] = x * 1.2;
    positions[i * 3 + 1] = y * 1.2;
    positions[i * 3 + 2] = z * 1.2;
  }

  // Ring disk
  for (let i = sphereCount; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.8 + Math.random() * 0.8;
    const thickness = (Math.random() - 0.5) * 0.1;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = thickness;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  return positions;
}

function generateBuddha(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  const headCount = Math.floor(count * 0.25);
  const bodyCount = Math.floor(count * 0.5);
  const baseCount = count - headCount - bodyCount;

  let idx = 0;

  // Head (sphere)
  for (let i = 0; i < headCount; i++) {
    const [x, y, z] = randomSpherePoint();
    positions[idx * 3] = x * 0.6;
    positions[idx * 3 + 1] = y * 0.6 + 1.5;
    positions[idx * 3 + 2] = z * 0.6;
    idx++;
  }

  // Body (ellipsoid)
  for (let i = 0; i < bodyCount; i++) {
    const [x, y, z] = randomSpherePoint();
    positions[idx * 3] = x * 1.2;
    positions[idx * 3 + 1] = y * 1.5 + 0.3;
    positions[idx * 3 + 2] = z * 1.2;
    idx++;
  }

  // Base (torus/platform)
  for (let i = 0; i < baseCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 0.8;
    const height = -1.2 + (Math.random() - 0.5) * 0.4;

    positions[idx * 3] = Math.cos(angle) * radius;
    positions[idx * 3 + 1] = height;
    positions[idx * 3 + 2] = Math.sin(angle) * radius;
    idx++;
  }

  return positions;
}

function generateFireworks(count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    // Explosion pattern - radial burst
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const radius = Math.pow(Math.random(), 0.3) * 3; // Bias towards outer shell

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

export function generateGeometry(type: ShapeType, count: number): Float32Array {
  switch (type) {
    case 'sphere':
      return generateSphere(count);
    case 'heart':
      return generateHeart(count);
    case 'flower':
      return generateFlower(count);
    case 'saturn':
      return generateSaturn(count);
    case 'buddha':
      return generateBuddha(count);
    case 'fireworks':
      return generateFireworks(count);
    default:
      return generateSphere(count);
  }
}
