// src/components/Planet.tsx 
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MeshDistortMaterial, Edges, RoundedBox } from '@react-three/drei'

type Variant =
  | 'wobble'
  | 'grid'
  | 'metal'
  | 'wire'
  | 'toon'
  | 'lowpoly'
  | 'basic'
  | 'holo'
  | 'morph'

interface PlanetProps {
  isFocused?: boolean
  cardRotation?: [number, number, number]
  appearSpin?: number
  appearOvershoot?: number
  orbitEuler?: [number, number, number]
  phaseOffset?: number

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
  cardRotation = [-0.1, 0.2, 0],
  appearSpin = Math.PI * 1.2,
  appearOvershoot = 0.08,
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

  // 状態（再レンダーしない）
  const angle = useRef((phaseOffset ?? 0) + Math.random() * Math.PI * 2)
  const timeRef = useRef(0)
  const tRef = useRef(0) // 0..1 : 球→カードのクロスフェード

  // ====== 使い回す一時オブジェクト（毎フレームnewしない） ======
  const baseVec = useMemo(() => new THREE.Vector3(), [])
  const centerTarget = useMemo(() => new THREE.Vector3(-5, 3, 0), [])
  const qTarget = useMemo(() => {
    const e = new THREE.Euler(cardRotation[0], cardRotation[1], cardRotation[2])
    return new THREE.Quaternion().setFromEuler(e)
  // 依存に配列をそのまま入れると毎回再生成されやすいので要素で追従
  }, [cardRotation[0], cardRotation[1], cardRotation[2]])
  const tmpQuat = useMemo(() => new THREE.Quaternion(), [])
  const spinQuat = useMemo(() => new THREE.Quaternion(), [])
  const finalQuat = useMemo(() => new THREE.Quaternion(), [])
  const spinEulerY = useMemo(() => new THREE.Euler(0, 0, 0), [])

  // 軌道面の回転（オイラー→クォータニオン）
  const orbitQuat = useMemo(() => {
    const e = orbitEuler ?? [0, 0, 0]
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0], e[1], e[2]))
  }, [orbitEuler?.[0], orbitEuler?.[1], orbitEuler?.[2]])

  // ===== toon 用グラデ =====
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

  // ===== grid 用シェーダ =====
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

  // ===== holo 用 =====
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

  // ===== morph 用 =====
  const morphVertex = /* glsl */ `
    varying vec3 vNormalW;
    varying vec3 vPosW;
    uniform float uTime;
    uniform float uAmp;
    uniform float uFreq;
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
      float disp = (n - 0.5) * 2.0 * uAmp;
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

  // ===== 形状 =====
  const geometry = useMemo(() => {
    if (variant === 'lowpoly') return new THREE.IcosahedronGeometry(size, 1)
    return new THREE.SphereGeometry(size, 32, 32)
  }, [variant, size])

  // マテリアル（球/カード）
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

  // リング（必要な時だけ生成）
  const ringGeom = useMemo(() => new THREE.RingGeometry(size * 1.2, size * 1.9, 64), [size])
  const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
    color,
    opacity: 0.6,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.8
  }), [color])

  // ===== アニメーション（公転・自転・uTime更新・カード入場） =====
  useFrame((_, delta) => {
    const speed = 2.0
    const lerpK = 1 - Math.pow(0.001, delta * speed)

    // フォーカス補間（球→カード）
    const targetT = isFocused ? 1 : 0
    tRef.current = THREE.MathUtils.clamp(
      THREE.MathUtils.lerp(tRef.current, targetT, lerpK),
      0, 1
    )

    // 公転 or 中央へ移動（Vector3を再利用）
    if (!isFocused) {
      angle.current += orbitSpeed
      baseVec.set(
        Math.cos(angle.current) * orbitRadius,
        Math.sin(angle.current) * orbitRadius,
        0
      )
      baseVec.applyQuaternion(orbitQuat)
      meshRef.current.position.copy(baseVec)
    } else {
      meshRef.current.position.lerp(centerTarget, lerpK)
    }

    // 自転
    meshRef.current.rotation.y += delta * 0.2

    // uTime の更新：使用中の uniforms だけ直接更新（material参照しない）
    timeRef.current += delta
    if (variant === 'grid')  gridUniforms.uTime.value  = timeRef.current
    if (variant === 'holo')  holoUniforms.uTime.value  = timeRef.current
    if (variant === 'morph') morphUniforms.uTime.value = timeRef.current

    // 球↔カードのフェード（コメントと実装を一致）
    sphereMat.opacity = 1 - tRef.current
    cardMat.opacity   = tRef.current

    // カードの位置・姿勢・スケール（Quaternion/Eulerを再利用）
    if (cardRef.current) {
      const base = size * 1.2
      const w = THREE.MathUtils.lerp(base, size * 3.2, tRef.current)
      const h = THREE.MathUtils.lerp(base, size * 2.0, tRef.current)
      const d = THREE.MathUtils.lerp(base, 0.12, tRef.current)
      cardRef.current.scale.set(w / base, h / base, d / base)
      cardRef.current.position.copy(meshRef.current.position)

      // 目標：カード姿勢（固定qTargetへ漸近）
      tmpQuat.copy(cardRef.current.quaternion)
      tmpQuat.slerp(qTarget, lerpK * tRef.current)
      cardRef.current.quaternion.copy(tmpQuat)

      // 入場アニメ：回転＆ポップ（計算オブジェクトを再利用）
      const e = easeOutBack(tRef.current)
      const spin = appearSpin * (1 - e)
      spinEulerY.y = spin
      spinQuat.setFromEuler(spinEulerY)
      finalQuat.copy(spinQuat).multiply(qTarget)
      cardRef.current.quaternion.slerp(finalQuat, lerpK)

      const pop = 1 + appearOvershoot * Math.sin(e * Math.PI)
      cardRef.current.scale.multiplyScalar(pop)
    }
  })

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
        {/* バリアント */}
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
        <primitive object={cardMat} attach="material" />
      </RoundedBox>

      {/* lowpoly の輪郭線 */}
      {variant === 'lowpoly' && <Edges scale={1.001} color="#ffffff" />}

      {/* リング（生成物をメモ化） */}
      {ring && (
        <mesh rotation={[Math.PI / 2.5, 0, 0]} castShadow receiveShadow geometry={ringGeom} material={ringMat} />
      )}
    </group>
  )
}
