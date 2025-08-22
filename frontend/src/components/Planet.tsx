// src/components/Planet.tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PlanetProps {
  color: string
  orbitRadius: number
  orbitSpeed: number
  size: number
  onClick?: () => void
}

export default function Planet({
  color,
  orbitRadius,
  orbitSpeed,
  size,
  onClick,
}: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const angle = useRef(Math.random() * Math.PI * 2)

  useFrame(() => {
    angle.current += orbitSpeed
    const x = Math.cos(angle.current) * orbitRadius
    const y = Math.sin(angle.current) * orbitRadius
    meshRef.current.position.set(x, y, 0)
  })

  return (
    <mesh ref={meshRef} onClick={onClick}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}
