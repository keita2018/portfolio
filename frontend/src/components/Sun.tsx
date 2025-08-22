import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ShaderMaterial, TextureLoader, AdditiveBlending } from 'three'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition;
  }
`

const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;

  vec2 fade(vec2 t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  float perlinNoise(vec2 P) {
    vec2 Pi = floor(P);
    vec2 Pf = fract(P);

    vec4 ix = vec4(Pi.x, Pi.x + 1.0, Pi.x, Pi.x + 1.0);
    vec4 iy = vec4(Pi.y, Pi.y, Pi.y + 1.0, Pi.y + 1.0);

    vec4 gx = fract(sin(ix * 12.9898 + iy * 78.233) * 43758.5453) * 2.0 - 1.0;
    vec4 gy = sqrt(1.0 - gx * gx);

    vec4 dotProduct = gx * Pf.x + gy * Pf.y;

    vec2 f = fade(Pf);
    return mix(mix(dotProduct.x, dotProduct.y, f.x), mix(dotProduct.z, dotProduct.w, f.x), f.y);
  }

  void main() {
    vec2 uv = vUv * 6.0;
    float n = perlinNoise(uv + uTime * 0.5);
    float intensity = smoothstep(0.4, 0.6, n);

    vec3 color = mix(vec3(4.0, 1.0, 0.0), vec3(6.0, 4.0, 0.0), intensity); // 高輝度でBloom対応
    gl_FragColor = vec4(color, 1.0);
  }
`

export default function Sun() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const coronaRef = useRef<THREE.Mesh>(null!)
  const flareRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<ShaderMaterial>(null!)
  const { viewport } = useThree()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t
    }
    if (coronaRef.current) {
      const mat = coronaRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.5 + Math.sin(t * 2.0) * 0.2
    }
    if (flareRef.current) {
      flareRef.current.rotation.z = t * 0.1
    }
  })

  const flareTexture = new TextureLoader().load('/textures/flare.png') // ご自身でflare.pngを用意

  return (
    <>
      {/* Core Sun */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.5, 64, 64]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={{ uTime: { value: 0 } }}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Corona Layer
      <mesh ref={coronaRef}>
        <sphereGeometry args={[2.2, 64, 64]} />
        <meshBasicMaterial
          color={new THREE.Color('orange')}
          transparent={true}
          opacity={0.5}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh> */}

      {/* Flare (Solar Prominence) */}
      {/* <mesh ref={flareRef} position={[0, 1.8, 0]} rotation={[0, 0, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshBasicMaterial
          map={flareTexture}
          transparent={true}
          blending={AdditiveBlending}
          depthWrite={false}
          opacity={0.6}
          side={THREE.DoubleSide}
          color={new THREE.Color('orange')}
        />
      </mesh> */}
    </>
  )
}

// import { useRef } from 'react';
// import { useFrame } from '@react-three/fiber';
// import { Sphere } from '@react-three/drei';
// import * as THREE from 'three';
// import { shaderMaterial } from '@react-three/drei';
// import glsl from 'babel-plugin-glsl/macro';
// import { extend } from '@react-three/fiber';

// // Define the custom shader material
// const SunMaterial = shaderMaterial(
//   { time: 0 },
//   glsl`
//     varying vec2 vUv;
//     void main() {
//       vUv = uv;
//       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//     }
//   `,
//   glsl`
//     precision highp float;

//     uniform float time;
//     varying vec2 vUv;

//     float hash(vec2 p) {
//       return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
//     }

//     float noise(vec2 p) {
//       vec2 i = floor(p);
//       vec2 f = fract(p);
//       vec2 u = f * f * (3.0 - 2.0 * f);
//       return mix(
//         mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
//         mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
//         u.y
//       );
//     }

//     void main() {
//       vec2 uv = vUv * 4.0;

//       float n1 = noise(uv + time * 0.5);
//       float n2 = noise(uv * 0.5 + time * 0.2);

//       float activity = smoothstep(0.3, 0.7, n2);

//       vec3 baseColor = vec3(1.0, 0.6, 0.1);
//       baseColor *= 0.6;

//       vec3 color = mix(baseColor, vec3(1.2), activity);

//       gl_FragColor = vec4(color * 1.2, 1.0);
//     }
//   `
// );

// // Register the material to use in JSX
// extend({ SunMaterial });

// export default function Sun() {
//   const ref = useRef<THREE.ShaderMaterial>(null);

//   useFrame(({ clock }) => {
//     if (ref.current) {
//       ref.current.uniforms.time.value = clock.getElapsedTime();
//     }
//   });

//   return (
//     <Sphere args={[1.2, 64, 64]}>
//       {/* NOTE: "sunMaterial" comes from the lowercase version of "SunMaterial" */}
//       <sunMaterial ref={ref} attach="material" />
//     </Sphere>
//   );
// }
