
// src/components/Planet.tsx
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshDistortMaterial, Edges, RoundedBox } from '@react-three/drei'

type Variant =
  | 'wobble'     // 有機的ゆらぎ
  | 'grid'       // 近未来グリッド
  | 'metal'      // 金属
  | 'wire'       // ワイヤーフレーム
  | 'toon'       // トゥーン
  | 'lowpoly'    // ローポリ形状
  | 'basic'      // 通常
  | 'holo'       // ホログラム
  | 'morph'      // 形状変化

interface PlanetProps {
  
  isFocused?: boolean
  // showCard?: boolean
  // cardContent?: React.ReactNode
  cardRotation?: [number, number, number]
  appearSpin?: number                        // 入場中の回転量（ラジアン）
  appearOvershoot?: number                   // 少し“ポップ”させる倍率
  orbitEuler?: [number, number, number]   // 軌道面の回転（XYZオイラー）
  phaseOffset?: number                    // 初期位相（任意）

  // 既存
  color: string
  orbitRadius: number
  orbitSpeed: number
  size: number
  onClick?: () => void
  variant?: Variant
  ring?: boolean
}

const easeOutBack = (t: number, k = 1.70158) => {
  const x = Math.min(Math.max(t, 0), 1)
  return 1 + ( (x - 1) * (x - 1) * ((k + 1) * (x - 1) + k) )
}

export default function Planet({
  isFocused = false,
  // showCard = false,
  // cardContent,
  cardRotation = [-0.1, 0.2, 0],
  appearSpin = Math.PI * 1.2,      // 入場時に 1.2π ラジアン回す
  appearOvershoot = 0.08,          // 8% だけ“ポッ”と膨らむ
  orbitEuler,
  phaseOffset = 0,

  color,
  orbitRadius,
  orbitSpeed,
  size,
  onClick,
  variant = 'basic',
  ring = false,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const cardRef = useRef<THREE.Mesh>(null!)
  const angle = useRef((phaseOffset ?? 0) + Math.random() * Math.PI * 2)
  const timeRef = useRef(0)
  const tRef = useRef(0) // 0..1 : 球→カードのクロスフェード係数

  // 軌道面の回転（オイラー→クォータニオン）
  const orbitQuat = useMemo(() => {
    const e = orbitEuler ?? [0, 0, 0]
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]))
  }, [orbitEuler])

  // ===== 既存：アニメーション（公転・自転・uTime更新） =====
  useFrame((_, delta) => {
    const speed = 2.0
    // フォーカス補間（球→カード）
    const targetT = isFocused ? 1 : 0
    tRef.current = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(tRef.current, targetT, 1 - Math.pow(0.001, delta * speed)),
      0,
      1
    )

    // 公転 or 中央へ移動
    if (!isFocused) {
      angle.current += orbitSpeed
      // XY平面の円（基本軌道）
      const base = new THREE.Vector3(
        Math.cos(angle.current) * orbitRadius,
        Math.sin(angle.current) * orbitRadius,
        0
      )

      // ★ 軌道面の回転を適用
      base.applyQuaternion(orbitQuat)

      meshRef.current.position.copy(base)
    } else {
      // 中央(0,0,0)へスムーズ移動
      meshRef.current.position.lerp(new THREE.Vector3(-5, 3, 0), 1 - Math.pow(0.001, delta * speed))
    }

    // 自転
    meshRef.current.rotation.y += delta * 0.2

    // grid/holo/morph などの uTime を更新（必要時のみ）
    timeRef.current += delta
    const mat = meshRef.current.material as any
    if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = timeRef.current

    // カードの位置とスケール（球の位置に追従 & 長方形へ）
    if (cardRef.current) {
      const base = size * 1.2
      const w = THREE.MathUtils.lerp(base, size * 3.2, tRef.current)
      const h = THREE.MathUtils.lerp(base, size * 2.0, tRef.current)
      const d = THREE.MathUtils.lerp(base, 0.12, tRef.current)
      cardRef.current.scale.set(w / base, h / base, d / base)
      cardRef.current.position.copy(meshRef.current.position)

      const qTarget = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(cardRotation[0], cardRotation[1], cardRotation[2])
      )
      const qCurrent = cardRef.current.quaternion
      // フォーカスしているほど目標姿勢に寄せる（tRef.current: 0..1）
      const tmp = new THREE.Quaternion().slerpQuaternions(
        qCurrent,
        qTarget,
        (1 - Math.pow(0.001, delta * speed)) * tRef.current
      )
      cardRef.current.quaternion.copy(tmp)

      // ★ 入場アニメ：回転＆ポップ
      const e = easeOutBack(tRef.current)           // 0→1（終盤で少しオーバー）
      const spin = appearSpin * (1 - e)             // 最初に回って、終盤で止まる
      // const [rx, ry, rz] = cardRotation
      // const qTarget = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz))
      const qSpin   = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, spin, 0))
      const qFinal  = qSpin.multiply(qTarget)       // 最終姿勢に“減衰する回転”を足す

      // ふわっと追従（slerp）
      cardRef.current.quaternion.slerp(qFinal, 1 - Math.pow(0.001, delta * speed))

      // ★ ちょいポップ（全体スケールを微加算）
      const pop = 1 + appearOvershoot * Math.sin(e * Math.PI) // 0→1→0 の山
      cardRef.current.scale.multiplyScalar(pop)
    }
  })

  // ===== toon 用グラデ（既存） =====
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

  // ===== grid 用シェーダ（既存） =====
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
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) } }),
    [color]
  )

  // ===== holo 用（既存） =====
  const holoVertex = /* glsl */ `
    varying vec3 vNormalW;
    varying vec3 vPosW;
    void main(){
      vec4 worldPos = modelMatrix * vec4(position,1.0);
      vPosW = worldPos.xyz;
      vNormalW = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `
  const holoFragment = /* glsl */ `
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
      vec3 V = normalize(cameraPosition - vPosW);
      float rim = pow(1.0 - max(dot(normalize(vNormalW), V), 0.0), uRimPower);

      float lines = step(0.8, fract((vPosW.y* uGridScale + uTime*4.0)));
      float n = noise(vPosW.xy*0.5 + uTime*0.5);

      vec3 col = uColor * (0.4 + 0.6*rim) + vec3(lines)*0.35 + n*0.15;
      gl_FragColor = vec4(col, uOpacity * (0.6 + 0.4*rim));
    }
  `
  const holoUniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uColor:     { value: new THREE.Color('#41e0ff') },
      uOpacity:   { value: 0.65 },
      uRimPower:  { value: 2.0 },
      uGridScale: { value: 5.0 },
    }),
    []
  )

  // ===== morph 用（既存） =====
  const morphVertex = /* glsl */ `
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
  const morphFragment = /* glsl */ `
    precision highp float;
    varying vec3 vNormalW;
    varying vec3 vPosW;
    uniform vec3 uBaseColor;

    void main(){
      vec3 V = normalize(cameraPosition - vPosW);
      float rim = pow(1.0 - max(dot(normalize(vNormalW), V), 0.0), 2.0);
      vec3 col = uBaseColor * (0.6 + 0.4 * rim);
      gl_FragColor = vec4(col, 1.0);
    }
  `
  const morphUniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uAmp:       { value: size * 0.25 },
      uFreq:      { value: 3.0 },
      uBaseColor: { value: new THREE.Color(color) },
    }),
    [color, size]
  )

  // ===== 形状（既存） =====
  const geometry = useMemo(() => {
    if (variant === 'lowpoly') return new THREE.IcosahedronGeometry(size, 1)
    return new THREE.SphereGeometry(size, 32, 32)
  }, [variant, size])

  // ▼ 球とカード用のマテリアル（球↔カードのフェード用）
  const sphereMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0.1,
      transparent: true,
      opacity: 1,
    })
    return m
  }, [color])

  const cardMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: '#0b0b0b',
      roughness: 0.9,
      metalness: 0.0,
      transparent: true,
      opacity: 0,
    })
    return m
  }, [])

  return (
    <group>
      {/* ====== 元の惑星（球体） ====== */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        castShadow
        receiveShadow
        geometry={geometry}
      >
        {/* バリアント（既存） */}
        {variant === 'wobble' && (
          <MeshDistortMaterial color={color} distort={0.3} speed={2} roughness={0.4} />
        )}
        {variant === 'grid' && (
          <shaderMaterial vertexShader={gridVertex} fragmentShader={gridFragment} uniforms={gridUniforms} />
        )}
        {variant === 'metal' && (
          <meshStandardMaterial color={color} metalness={1} roughness={0.15} envMapIntensity={1.2} />
        )}
        {variant === 'wire' && <meshBasicMaterial color={color} wireframe />}
        {variant === 'toon' && <meshToonMaterial color={color} gradientMap={toonGradient as any} />}
        {(variant === 'basic' || variant === 'lowpoly') && (
          <primitive object={sphereMat} attach="material" />
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
          <shaderMaterial vertexShader={morphVertex} fragmentShader={morphFragment} uniforms={morphUniforms} />
        )}
      </mesh>

      {/* ====== 変形後のカード（中央でフェードイン） ====== */}
      <RoundedBox
        ref={cardRef}
        args={[size * 1.2, size * 1.2, size * 1.2]}
        radius={0.12}
        smoothness={8}
        castShadow
        receiveShadow
      >
        <primitive
          object={cardMat}
          attach="material"
          // 球→カードのフェード（tRefで更新）
          // opacity は useFrame 内で cardMat.opacity = tRef.current によって更新されています
        />
        {/* {showCard && (
          <Html transform center distanceFactor={2.2} style={{ pointerEvents: 'auto' }}>
            {cardContent}
          </Html>
        )} */}
      </RoundedBox>

      {/* lowpoly の輪郭線（既存） */}
      {variant === 'lowpoly' && <Edges scale={1.001} color="#ffffff" />}

      {/* リング（既存） */}
      {ring && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]} castShadow receiveShadow>
          <ringGeometry args={[size * 1.2, size * 1.9, 64]} />
          <meshStandardMaterial color={color} opacity={0.6} transparent side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      )}
    </group>
  )
}
