// VoxelSun
import * as THREE from "three";
import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";

type LayerOpts = {
  radius: number;
  columnSide: number;
  minLen: number;
  maxLen: number;
  jitter?: number;
  color?: string;
  colors?: Array<{ color: string; ratio: number }>;
  emissive?: string;
  emissiveIntensity?: number;
  emissiveColors?: Array<{ color: string; ratio: number; intensity?: number }>;
  flicker?: boolean;
  flickerSpeed?: number;
  flickerAmp?: number;
};

type Props = {
  columnsPhi: number;
  columnsTheta: number;
  core: LayerOpts;
  shell: LayerOpts;
  phiStagger?: number;
  gapSafety?: number;
  counterRotate?: number;
};

// ===== guard =====
const FRESNEL_GUARD_KEY = Symbol.for("voxelSun.fresnelGuard.v1");
function installFresnelUniformGuardOnce() {
  const g = globalThis as any;
  if (g[FRESNEL_GUARD_KEY]) return;
  g[FRESNEL_GUARD_KEY] = true;
  const proto = (THREE.Material as any).prototype;
  const prev = proto.onBeforeCompile;
  proto.onBeforeCompile = function (shader: any, renderer: any) {
    prev?.call(this, shader, renderer);
    shader.uniforms ||= {};
    if (!("uFresnelPow" in shader.uniforms)) shader.uniforms.uFresnelPow = { value: 0.0 };
    const ensure = (src: string, decl: string) => (src.includes(decl) ? src : `${decl}\n${src}`);
    shader.vertexShader = ensure(shader.vertexShader, "uniform float uFresnelPow;");
    shader.vertexShader = ensure(shader.vertexShader, "varying float vFresnel;");
    shader.fragmentShader = ensure(shader.fragmentShader, "varying float vFresnel;");
  };
}
installFresnelUniformGuardOnce();

export default function VoxelColumnSphereDual({
  columnsPhi,
  columnsTheta,
  core,
  shell,
  phiStagger = 0,
  gapSafety = 0.0,
  counterRotate = 0.0,
}: Props) {
  const groupRef = useRef<THREE.Group | null>(null);
  const coreRef  = useRef<THREE.InstancedMesh | null>(null);
  const shellRef = useRef<THREE.InstancedMesh | null>(null);

  const SURF_AMP_BASE   = 0.035;
  const SURF_AMP_JITTER = 0.015;
  const SURF_FREQ       = 8.0;
  const SURF_SPEED      = 1.0;

  const coreOffset = useRef(0);
  const coreOffsetTarget = useRef(0);
  const shellOffset = useRef(0);
  const shellOffsetTarget = useRef(0);

  // 共有 uniforms（uTime を一括更新）
  const sharedUniforms = useMemo(() => ({
    uTime:        { value: 0 },
    uSurfTime:    { value: 0 },
  }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // ★FIX: 初回更新スキップを防ぐため NaN を明示的に管理
  const prevOffsets = useRef<{ core: number; shell: number }>({ core: NaN as unknown as number, shell: NaN as unknown as number });

  // 緯度経度グリッド
  const grid = useMemo(() => {
    const uv: Array<{ u: number; v: number }> = [];
    for (let t = 0; t <= columnsTheta; t++) {
      const v = t / columnsTheta;
      for (let p = 0; p < columnsPhi; p++) {
        const u = p / columnsPhi;
        uv.push({ u, v });
      }
    }
    return uv;
  }, [columnsPhi, columnsTheta]);
  const count = grid.length;

  const uvToNormal = (u: number, v: number) => {
    const theta = v * Math.PI;
    const phi = u * Math.PI * 2;
    const sinT = Math.sin(theta);
    return new THREE.Vector3(
      sinT * Math.cos(phi),
      Math.cos(theta),
      sinT * Math.sin(phi)
    ).normalize();
  };

  type InstanceData = {
    pos: THREE.Vector3[];
    quat: THREE.Quaternion[];
    scale: THREE.Vector3[];
    normal: THREE.Vector3[];
  };
  const instanceDataMap = useRef(new Map<THREE.InstancedMesh, InstanceData>());

  const corePushAmount = 2;
  const shellPushAmount = 7;
  const pulseMs = 1260;

  const toggleBothOffset = () => {
    const expanded = coreOffsetTarget.current > 0 || shellOffsetTarget.current > 0;
    if (!expanded) {
      coreOffsetTarget.current  = corePushAmount;
      shellOffsetTarget.current = shellPushAmount;
    } else {
      coreOffsetTarget.current  = 0;
      shellOffsetTarget.current = 0;
    }
  };
  const pulseBothOffsets = () => {
    coreOffsetTarget.current  = corePushAmount;
    shellOffsetTarget.current = shellPushAmount;
    window.setTimeout(() => {
      coreOffsetTarget.current  = 0;
      shellOffsetTarget.current = 0;
    }, pulseMs);
  };
  const onCoreClick  = (e: any) => { e.stopPropagation(); toggleBothOffset(); pulseBothOffsets(); };
  const onShellClick = (e: any) => { e.stopPropagation(); toggleBothOffset(); pulseBothOffsets(); };

  const placeLayer = (
    mesh: THREE.InstancedMesh,
    opts: LayerOpts,
    phiShift: number
  ) => {
    const { radius, columnSide, minLen, maxLen, jitter = 0, color = "#d9c19a" } = opts;
    const up = new THREE.Vector3(0, 1, 0);

    const basePalette =
      opts.colors && opts.colors.length > 0
        ? (() => {
            const total = opts.colors!.reduce((s, e) => s + (e.ratio ?? 0), 0) || 1;
            let acc = 0;
            return opts.colors!.map((e) => {
              acc += (e.ratio ?? 0) / total;
              return { cutoff: acc, color: new THREE.Color(e.color) };
            });
          })()
        : null;
    const baseColor = new THREE.Color(color);

    const emissivePalette =
      opts.emissiveColors && opts.emissiveColors.length > 0
        ? (() => {
            const total = opts.emissiveColors!.reduce((s, e) => s + (e.ratio ?? 0), 0) || 1;
            let acc = 0;
            return opts.emissiveColors!.map((e) => {
              acc += (e.ratio ?? 0) / total;
              const c = new THREE.Color(e.color);
              const m = e.intensity ?? 1;
              return { cutoff: acc, color: new THREE.Color(c.r * m, c.g * m, c.b * m) };
            });
          })()
        : null;

    const emissiveArray = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const { u, v } = grid[i];
      const uShifted = (u + phiShift) % 1;
      const n = uvToNormal(uShifted, v);
      const len = THREE.MathUtils.lerp(minLen, maxLen, Math.random());

      const innerR = radius + gapSafety;
      const center = n.clone().multiplyScalar(innerR + len * 0.5);

      if (jitter > 0) {
        center.x += (Math.random() * 2 - 1) * jitter;
        center.y += (Math.random() * 2 - 1) * jitter;
        center.z += (Math.random() * 2 - 1) * jitter;
      }

      const quat = new THREE.Quaternion().setFromUnitVectors(up, n);
      const scale = new THREE.Vector3(columnSide, len, columnSide);

      dummy.position.copy(center);
      dummy.quaternion.copy(quat);
      dummy.scale.copy(scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      let chosen = baseColor.clone();
      if (basePalette) {
        const r = Math.random();
        for (let k = 0; k < basePalette.length; k++) {
          if (r <= basePalette[k].cutoff) { chosen = basePalette[k].color.clone(); break; }
        }
      }
      chosen.offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06);
      mesh.setColorAt(i, chosen);

      let e = new THREE.Color(1, 1, 1);
      if (emissivePalette) {
        const r2 = Math.random();
        for (let k = 0; k < emissivePalette.length; k++) {
          if (r2 <= emissivePalette[k].cutoff) { e = emissivePalette[k].color.clone(); break; }
        }
      } else if (opts.emissive) {
        const m = opts.emissiveIntensity ?? 1;
        const baseE = new THREE.Color(opts.emissive);
        e.setRGB(baseE.r * m, baseE.g * m, baseE.b * m);
      }
      emissiveArray[i * 3 + 0] = e.r;
      emissiveArray[i * 3 + 1] = e.g;
      emissiveArray[i * 3 + 2] = e.b;
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    (mesh.geometry as THREE.InstancedBufferGeometry).setAttribute(
      "instanceEmissive",
      new THREE.InstancedBufferAttribute(emissiveArray, 3)
    );

    {
      const surfAmp  = new Float32Array(count);
      const surfPhas = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const amp = SURF_AMP_BASE + (Math.random() * 2 - 1) * SURF_AMP_JITTER;
        surfAmp[i]  = Math.max(0.0, amp);
        surfPhas[i] = Math.random() * Math.PI * 2.0;
      }
      (mesh.geometry as THREE.InstancedBufferGeometry).setAttribute(
        "instanceSurfAmp",
        new THREE.InstancedBufferAttribute(surfAmp, 1)
      );
      (mesh.geometry as THREE.InstancedBufferGeometry).setAttribute(
        "instanceSurfPhase",
        new THREE.InstancedBufferAttribute(surfPhas, 1)
      );
    }

    {
      const phaseArray = new Float32Array(count);
      for (let i = 0; i < count; i++) phaseArray[i] = Math.random() * Math.PI * 2;
      (mesh.geometry as THREE.InstancedBufferGeometry).setAttribute(
        "instancePhase",
        new THREE.InstancedBufferAttribute(phaseArray, 1)
      );
    }

    const mat = mesh.material as THREE.MeshStandardMaterial & { userData?: any; customProgramCacheKey?: any };
    mat.userData ||= {};
    if (!mat.userData._patchedEmissive) {
      const prevOnBeforeCompile = mat.onBeforeCompile;
      mat.onBeforeCompile = (shader, renderer: any) => {
        prevOnBeforeCompile?.call(mat, shader, renderer);
        shader.uniforms.uTime         = sharedUniforms.uTime;
        shader.uniforms.uSurfTime     = sharedUniforms.uSurfTime;
        shader.uniforms.uFlickerSpeed = shader.uniforms.uFlickerSpeed ?? { value: opts.flickerSpeed ?? 1.0 };
        shader.uniforms.uFlickerAmp   = shader.uniforms.uFlickerAmp   ?? { value: opts.flickerAmp ?? 0.15 };
        shader.uniforms.uSurfFreq     = shader.uniforms.uSurfFreq     ?? { value: SURF_FREQ };
        shader.uniforms.uSurfSpeed    = shader.uniforms.uSurfSpeed    ?? { value: SURF_SPEED };
        shader.uniforms.uFresnelPow   = shader.uniforms.uFresnelPow   ?? { value: 4.0 };
        shader.uniforms.uStrength     = shader.uniforms.uStrength     ?? { value: 1.0 };

        const VS_DECL = `
          attribute vec3 instanceEmissive;
          varying vec3 vInstanceEmissive;
          attribute float instancePhase; varying float vPhase;
          attribute float instanceSurfAmp;
          attribute float instanceSurfPhase;
          uniform float uSurfTime;
          uniform float uSurfFreq;
          uniform float uSurfSpeed;
        `;
        if (!shader.vertexShader.includes("varying vec3 vInstanceEmissive;")) {
          shader.vertexShader = shader.vertexShader.replace(
            "void main() {",
            `${VS_DECL}
             void main() {
               vInstanceEmissive = instanceEmissive;
               vPhase = instancePhase;
          `
          );
        }
        if (!shader.vertexShader.includes("instanceSurfAmp")) {
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            `
              #include <begin_vertex>
              float surfWave = sin(uSurfFreq * transformed.y + uSurfTime * uSurfSpeed + instanceSurfPhase);
              vec3  surfNormal = normalize(normal);
              transformed += surfNormal * instanceSurfAmp * surfWave;
            `
          );
        }

        const FS_DECL = `
          varying vec3 vInstanceEmissive;
          uniform float uTime;
          uniform float uFlickerSpeed;
          uniform float uFlickerAmp;
          varying float vPhase;
        `;
        if (!shader.fragmentShader.includes("varying vec3 vInstanceEmissive;")) {
          shader.fragmentShader = shader.fragmentShader.replace(
            "void main() {",
            `${FS_DECL}
             void main() {
          `);
        }
        if (!shader.fragmentShader.includes("vInstanceEmissive *")) {
          shader.fragmentShader = shader.fragmentShader.replace(
            "vec3 totalEmissiveRadiance = emissive;",
            `
              float flicker = (1.0 + uFlickerAmp * sin(uTime * uFlickerSpeed + vPhase));
              vec3 totalEmissiveRadiance = emissive * vInstanceEmissive * flicker;
            `
          );
        }
        mat.userData.uniforms = shader.uniforms;
      };
      mat.customProgramCacheKey = () =>
        `voxelSun_emissive_v2|flicker:${!!opts.flicker}|freq:${SURF_FREQ}|speed:${SURF_SPEED}`;
      mat.needsUpdate = true;
      mat.userData._patchedEmissive = true;
    }

    {
      const data: InstanceData = {
        pos: new Array(count),
        quat: new Array(count),
        scale: new Array(count),
        normal: new Array(count),
      };
      const up = new THREE.Vector3(0, 1, 0);
      const m = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();

      for (let i = 0; i < count; i++) {
        mesh.getMatrixAt(i, m);
        m.decompose(p, q, s);
        data.pos[i] = p.clone();
        data.quat[i] = q.clone();
        data.scale[i] = s.clone();
        data.normal[i] = up.clone().applyQuaternion(q).normalize();
      }
      instanceDataMap.current.set(mesh, data);
    }
  };

  useLayoutEffect(() => {
    if (coreRef.current)  placeLayer(coreRef.current,  core, 0.0);
    if (shellRef.current) placeLayer(shellRef.current, shell, phiStagger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    grid,
    core.radius, core.columnSide, core.minLen, core.maxLen, core.jitter, core.color,
    shell.radius, shell.columnSide, shell.minLen, shell.maxLen, shell.jitter, shell.color,
    phiStagger, gapSafety
  ]);

  // 押し出し + グラニュレーション
  const applyRadialOffsetWithGranulation = (
    mesh: THREE.InstancedMesh | null,
    offset: number,
    time: number,
    speed = 0.6,
    amp = 0.12
  ) => {
    if (!mesh) return;
    const data = instanceDataMap.current.get(mesh);
    const ph = (mesh.geometry as any).attributes.instancePhase as THREE.InstancedBufferAttribute;
    if (!data || !ph) return;

    for (let i = 0; i < data.pos.length; i++) {
      const baseS = data.scale[i];
      const phase = ph.getX(i);
      const k = 1 + amp * Math.sin(time * speed + phase);
      dummy.position.copy(data.pos[i]).addScaledVector(data.normal[i], offset);
      dummy.quaternion.copy(data.quat[i]);
      dummy.scale.set(baseS.x, baseS.y * k, baseS.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  const frame = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const g = groupRef.current;
    if (!g) return;

    g.rotation.y = t * 0.25;
    g.rotation.x = Math.sin(t * 0.2) * 0.1;
    if (shellRef.current) shellRef.current.rotation.y = -t * counterRotate;

    const lerpK = 6;
    coreOffset.current  = THREE.MathUtils.damp(coreOffset.current,  coreOffsetTarget.current,  lerpK, delta);
    shellOffset.current = THREE.MathUtils.damp(shellOffset.current, shellOffsetTarget.current, lerpK, delta);

    // 共有 uTime を一括更新
    sharedUniforms.uTime.value     = t;
    sharedUniforms.uSurfTime.value = t;

    // 交互フレーム更新
    const f = frame.current++;
    const EPS = 1e-4;

    const needUpdate = (prev: number, curr: number) =>
      Number.isNaN(prev) || Math.abs(curr - prev) > EPS; // ★FIX: 初回は必ずtrue

    if ((f & 1) === 0) {
      if (coreRef.current && needUpdate(prevOffsets.current.core, coreOffset.current)) {
        applyRadialOffsetWithGranulation(coreRef.current, coreOffset.current, t, 0.9, 0.10);
        prevOffsets.current.core = coreOffset.current;
      }
    } else {
      if (shellRef.current && needUpdate(prevOffsets.current.shell, shellOffset.current)) {
        applyRadialOffsetWithGranulation(shellRef.current, shellOffset.current, t, 0.9, 0.18);
        prevOffsets.current.shell = shellOffset.current;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* 内核 */}
      <instancedMesh ref={coreRef} args={[undefined, undefined, count]} onClick={onCoreClick} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          roughness={0.6}
          metalness={0}
          emissive={core.emissive ?? "#000000"}
          emissiveIntensity={core.emissiveIntensity ?? 0}
        />
      </instancedMesh>

      {/* 外殻 */}
      <instancedMesh ref={shellRef} args={[undefined, undefined, count]} onClick={onShellClick} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          vertexColors
          roughness={0.6}
          metalness={0}
          emissive={shell.emissive ?? "#000000"}
          emissiveIntensity={shell.emissiveIntensity ?? 0}
        />
      </instancedMesh>
    </group>
  );
}
