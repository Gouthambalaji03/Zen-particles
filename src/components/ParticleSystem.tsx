import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ParticleSystemProps } from '../types';
import { generateGeometry } from '../utils/geometryFactory';

const PARTICLE_COUNT = 8000;
const TRAIL_LENGTH = 5;

// Simplex noise function for GLSL
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
  // Calculate trail lag
  float lag = trailIdx * 0.15;
  float effectiveTension = uTension * (1.0 - lag * 0.3);

  // Interpolate between current position and target
  vec3 pos = mix(position, targetPos, effectiveTension);

  // Add noise turbulence
  float noiseScale = 0.3;
  float noiseFreq = 0.5 + randomness * 0.5;
  vec3 noisePos = pos * noiseFreq + uTime * 0.2;
  float noise = snoise(noisePos) * noiseScale * (1.0 - effectiveTension);
  pos += noise;

  // Add breathing effect
  float breathe = sin(uTime * 0.5 + randomness * 6.28) * 0.05;
  pos *= 1.0 + breathe * (1.0 - effectiveTension * 0.5);

  // Add gravitational pull when relaxed
  float gravity = (1.0 - effectiveTension) * 0.3;
  pos.y -= gravity * (1.0 + randomness);

  // Explosion effect
  if (uExplosion > 0.0) {
    vec3 explosionDir = normalize(pos);
    pos += explosionDir * uExplosion * 2.0 * (1.0 + randomness);
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Calculate point size with depth attenuation
  float depth = -mvPosition.z;
  float baseSize = 3.0 + pScale * 2.0;
  gl_PointSize = baseSize * pScale * (300.0 / depth);

  // Trail fade out
  vAlpha = 1.0 - (trailIdx / float(${TRAIL_LENGTH})) * 0.7;
}
`;

const fragmentShader = `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  // Create soft circular particle
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  if (dist > 0.5) {
    discard;
  }

  // Radial gradient: hot center to colored edge
  float radialGradient = 1.0 - smoothstep(0.0, 0.5, dist);

  // Hot white center
  vec3 hotCenter = vec3(1.0);
  vec3 finalColor = mix(uColor, hotCenter, radialGradient * 0.6);

  // Soft edge fade
  float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

const ParticleSystem = ({ shape, color, tension, explosion }: ParticleSystemProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const particlesRef = useRef<THREE.Points>();
  const materialRef = useRef<THREE.ShaderMaterial>();
  const geometryRef = useRef<THREE.BufferGeometry>();
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastTensionRef = useRef<number>(0);
  const explosionTimeRef = useRef<number>(0);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      if (!scene || !camera || !renderer || !materialRef.current) return;

      const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
      materialRef.current.uniforms.uTime.value = elapsedTime;

      // Smooth tension transition
      const targetTension = 1.0 - tension; // Invert: open hand = high visual tension
      lastTensionRef.current += (targetTension - lastTensionRef.current) * 0.1;
      materialRef.current.uniforms.uTension.value = lastTensionRef.current;

      // Decay explosion
      if (explosionTimeRef.current > 0) {
        explosionTimeRef.current *= 0.92;
        materialRef.current.uniforms.uExplosion.value = explosionTimeRef.current;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (renderer) {
        renderer.dispose();
      }
      if (containerRef.current && renderer) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update particles when shape changes
  useEffect(() => {
    if (!sceneRef.current) return;

    // Clean up old particles
    if (particlesRef.current) {
      sceneRef.current.remove(particlesRef.current);
      if (geometryRef.current) {
        geometryRef.current.dispose();
      }
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    }

    // Generate geometry
    const targetPositions = generateGeometry(shape, PARTICLE_COUNT);
    const totalVertices = PARTICLE_COUNT * TRAIL_LENGTH;

    // Create attributes
    const positions = new Float32Array(totalVertices * 3);
    const targetPos = new Float32Array(totalVertices * 3);
    const randomness = new Float32Array(totalVertices);
    const pScale = new Float32Array(totalVertices);
    const trailIdx = new Float32Array(totalVertices);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseIdx = i * 3;

      for (let t = 0; t < TRAIL_LENGTH; t++) {
        const vertexIdx = (i * TRAIL_LENGTH + t) * 3;

        // Copy target positions
        targetPos[vertexIdx] = targetPositions[baseIdx];
        targetPos[vertexIdx + 1] = targetPositions[baseIdx + 1];
        targetPos[vertexIdx + 2] = targetPositions[baseIdx + 2];

        // Random starting positions
        positions[vertexIdx] = (Math.random() - 0.5) * 10;
        positions[vertexIdx + 1] = (Math.random() - 0.5) * 10;
        positions[vertexIdx + 2] = (Math.random() - 0.5) * 10;

        // Attributes
        const flatIdx = i * TRAIL_LENGTH + t;
        randomness[flatIdx] = Math.random();
        pScale[flatIdx] = 0.5 + Math.random() * 1.0;
        trailIdx[flatIdx] = t;
      }
    }

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('targetPos', new THREE.BufferAttribute(targetPos, 3));
    geometry.setAttribute('randomness', new THREE.BufferAttribute(randomness, 1));
    geometry.setAttribute('pScale', new THREE.BufferAttribute(pScale, 1));
    geometry.setAttribute('trailIdx', new THREE.BufferAttribute(trailIdx, 1));
    geometryRef.current = geometry;

    // Create material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uTension: { value: 0 },
        uExplosion: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = material;

    // Create particles
    const particles = new THREE.Points(geometry, material);
    sceneRef.current.add(particles);
    particlesRef.current = particles;
  }, [shape]);

  // Update color
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor.value = new THREE.Color(color);
    }
  }, [color]);

  // Handle explosion trigger
  useEffect(() => {
    if (explosion > 0) {
      explosionTimeRef.current = explosion;
    }
  }, [explosion]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ background: 'linear-gradient(to bottom, #000000, #1a1a1a)' }}
    />
  );
};

export default ParticleSystem;
