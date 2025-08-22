
// src/components/Planet.tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshDistortMaterial, Edges } from '@react-three/drei'

type Variant =
  | 'wobble'     // 形がゆらぐ（有機的）
  | 'grid'       // 近未来グリッド（簡易シェーダ）
  | 'metal'      // 金属（環境反射あり）
  | 'wire'       // ワイヤーフレーム
  | 'toon'       // トゥーン調
  | 'lowpoly'    // ローポリ形状
  | 'basic'      // 通常
  | 'holo'       // ホログラム
  | 'morph'      // 形状変化（ノイズ膨張）

interface PlanetProps {
  color: string
  orbitRadius: number
  orbitSpeed: number
  size: number
  onClick?: () => void
  variant?: Variant
  ring?: boolean
}

export default function Planet({
  color,
  orbitRadius,
  orbitSpeed,
  size,
  onClick,
  variant = 'basic',
  ring = false,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const angle = useRef(Math.random() * Math.PI * 2)
  const timeRef = useRef(0)

  // 公転 + 自転 + シェーダ時間
  useFrame((_, delta) => {
    angle.current += orbitSpeed
    const x = Math.cos(angle.current) * orbitRadius
    const y = Math.sin(angle.current) * orbitRadius
    meshRef.current.position.set(x, y, 0)

    meshRef.current.rotation.y += delta * 0.2
    timeRef.current += delta

    // grid シェーダの時間更新（必要なときだけ）
    if ((meshRef.current.material as any)?.uniforms?.uTime) {
      ;(meshRef.current.material as any).uniforms.uTime.value = timeRef.current
    }
  })

  // toon の段階グラデ
  const toonGradient = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 256, 0)
    grad.addColorStop(0.0, '#0a0a0a')
    grad.addColorStop(0.5, color)
    grad.addColorStop(1.0, '#ffffff')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 1)
    const tex = new THREE.CanvasTexture(canvas)
    tex.minFilter = THREE.LinearFilter
    return tex
  }, [color])

  // 近未来グリッド用の簡易シェーダ
  const gridVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `
  const gridFragment = /* glsl */ `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColor;
    void main(){
      vec2 uv = vUv * 6.0;
      uv.x += sin(uTime*0.8 + uv.y*2.5)*0.1;
      uv.y += cos(uTime*0.6 + uv.x*2.0)*0.1;

      float line = step(0.95, fract(uv.x)) + step(0.95, fract(uv.y));
      float glow = smoothstep(0.0, 0.2, line);

      vec3 base = uColor * 0.25;
      vec3 grid = mix(base, vec3(1.0), glow);
      gl_FragColor = vec4(grid, 1.0);
    }
  `
  const gridUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    }),
    [color]
  )

   // === ★ holo 用（ホログラム：リム光 + スキャンライン + 透明加算） ===
  const holoVertex = /* glsl */`
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main(){
      vec4 worldPos = modelMatrix * vec4(position,1.0);
      vPosW = worldPos.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `
  const holoFragment = /* glsl */`
    precision highp float;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    uniform float uTime;
    uniform vec3  uColor;
    uniform float uOpacity;
    uniform float uRimPower;
    uniform float uGridScale;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash(i+vec2(0,0)),hash(i+vec2(1,0)),u.x),
                 mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y);
    }

    void main(){
      // ビュー方向
      vec3 V = normalize(cameraPosition - vPosW);
      // フレネル（リム光）
      float rim = pow(1.0 - max(dot(normalize(vNormalW), V), 0.0), uRimPower);

      // スキャンライン（時間で上下に流れる）
      float lines = step(0.8, fract((vPosW.y* uGridScale + uTime*4.0)));
      // 3D感のための微ノイズ
      float n = noise(vPosW.xy*0.5 + uTime*0.5);

      vec3 col = uColor * (0.4 + 0.6*rim) + vec3(lines)*0.35 + n*0.15;
      gl_FragColor = vec4(col, uOpacity * (0.6 + 0.4*rim));
    }
  `
  const holoUniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uColor:     { value: new THREE.Color('#41e0ff') }, // シアン系
      uOpacity:   { value: 0.65 },
      uRimPower:  { value: 2.0 },   // 大きいほどリムが強い
      uGridScale: { value: 5.0 },   // スキャンライン密度
    }),
    []
  )

  // === ★ morph 用（形状変化：法線方向にノイズで膨張収縮） ===
  const morphVertex = /* glsl */`
    varying vec3 vNormalW;
    varying vec3 vPosW;
    uniform float uTime;
    uniform float uAmp;   // 変形量
    uniform float uFreq;  // ノイズ周波数

    float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7, 74.7))) * 43758.5453123); }
    float noise(vec3 p){
      vec3 i=floor(p), f=fract(p);
      vec3 u=f*f*(3.0-2.0*f);
      float n =
        mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),u.x),
                mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),
                mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y),u.z);
      return n;
    }

    void main(){
      vec3 nrm = normalize(normal);
      float n = noise(normal * uFreq + uTime*0.8);
      float disp = (n - 0.5) * 2.0 * uAmp; // -uAmp..uAmp

      vec3 newPos = position + nrm * disp;
      vec4 worldPos = modelMatrix * vec4(newPos,1.0);
      vPosW = worldPos.xyz;
      vNormalW = normalize(mat3(modelMatrix) * nrm);

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `
  const morphFragment = /* glsl */`
    precision highp float;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    uniform vec3 uBaseColor;

    void main(){
      // 簡易ライティング：ビュー依存のリム
      vec3 V = normalize(cameraPosition - vPosW);
      float rim = pow(1.0 - max(dot(normalize(vNormalW), V), 0.0), 2.0);
      vec3 col = uBaseColor * (0.6 + 0.4 * rim);
      gl_FragColor = vec4(col, 1.0);
    }
  `
  const morphUniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uAmp:       { value: size * 0.25 }, // 変形量(半径の25%目安)
      uFreq:      { value: 3.0 },         // ノイズの細かさ
      uBaseColor: { value: new THREE.Color(color) },
    }),
    [color, size]
  )

  // 形状：lowpoly は Icosahedron に
  const geometry = useMemo(() => {
    if (variant === 'lowpoly') return new THREE.IcosahedronGeometry(size, 1)
    return new THREE.SphereGeometry(size, 32, 32)
  }, [variant, size])

  return (
    <group>
      <mesh ref={meshRef} onClick={onClick} castShadow receiveShadow geometry={geometry}>
        {/* ▼ ここで variant ごとに JSX でマテリアルを分岐（new は使わない！） */}
        {variant === 'wobble' && (
          <MeshDistortMaterial color={color} distort={0.3} speed={2} roughness={0.4} />
        )}

        {variant === 'grid' && (
          <shaderMaterial
            vertexShader={gridVertex}
            fragmentShader={gridFragment}
            uniforms={gridUniforms}
          />
        )}

        {variant === 'metal' && (
          <meshStandardMaterial color={color} metalness={1} roughness={0.15} envMapIntensity={1.2} />
        )}

        {variant === 'wire' && <meshBasicMaterial color={color} wireframe />}

        {variant === 'toon' && <meshToonMaterial color={color} gradientMap={toonGradient as any} />}

        {(variant === 'basic' || variant === 'lowpoly') && (
          <meshStandardMaterial color={color} roughness={1} metalness={0.1} />
        )}

         {variant === 'holo' && (
          <shaderMaterial
            vertexShader={holoVertex}
            fragmentShader={holoFragment}
            uniforms={holoUniforms}
            blending={THREE.AdditiveBlending}
            transparent
            depthWrite={false}
          />
        )}

        {variant === 'morph' && (
          <shaderMaterial
            vertexShader={morphVertex}
            fragmentShader={morphFragment}
            uniforms={morphUniforms}
          />
        )}
      </mesh>

      {/* lowpoly は輪郭線が映える */}
      {variant === 'lowpoly' && <Edges scale={1.001} color="#ffffff" />}

      {/* 任意：リング */}
      {ring && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]} castShadow receiveShadow>
          <ringGeometry args={[size * 1.2, size * 1.9, 64]} />
          <meshStandardMaterial color={color} opacity={0.6} transparent side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      )}
    </group>
  )
}
