import * as THREE from "three";
import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";

type LayerOpts = {
  radius: number;            // その層の“基準球半径”（内側端の目安）
  columnSide: number;        // 柱の断面の一辺
  minLen: number;            // 柱の最短長
  maxLen: number;            // 柱の最長長
  jitter?: number;           // 配置の微妙なズレ
  color?: string;            // ベース色（個体差は内部で少し付与）
  colors?: Array<{ color: string; ratio: number }>; // 分布指定
  emissive?: string;         // 発光色
  emissiveIntensity?: number;// 発光強度
  emissiveColors?: Array<{ color: string; ratio: number; intensity?: number }>; // 発光色の分布
  flicker?: boolean;
  flickerSpeed?: number;   // デフォルト: 1.0
  flickerAmp?: number;     // デフォルト: 0.15（±15%）
};

type Props = {
  columnsPhi: number;
  columnsTheta: number;
  core: LayerOpts;
  shell: LayerOpts;
  phiStagger?: number;    // 外殻の経度オフセット（0〜1, 0.5で半ピッチずらす）
  gapSafety?: number;     // 2層の食い込み防止オフセット
  counterRotate?: number; // 外殻の逆回転係数（0で同回転, 正で逆向き）
};


// ✅ THREE には書き込まない。globalThis に一度だけフラグを立てる
const FRESNEL_GUARD_KEY = Symbol.for("voxelSun.fresnelGuard.v1");

function installFresnelUniformGuardOnce() {
  const g = globalThis as any;
  if (g[FRESNEL_GUARD_KEY]) return;   // HMR/StrictMode対策
  g[FRESNEL_GUARD_KEY] = true;

  const proto = (THREE.Material as any).prototype;
  const prev = proto.onBeforeCompile;

  proto.onBeforeCompile = function onBeforeCompileGuard(shader: any, renderer: any) {
    // 既存を尊重（2引数で呼ぶ）
    prev?.call(this, shader, renderer);

    // --- 1) JS側 Uniform（デフォ0.0で見た目無影響） ---
    shader.uniforms = shader.uniforms || {};
    if (!("uFresnelPow" in shader.uniforms)) {
      shader.uniforms.uFresnelPow = { value: 0.0 };
    }

    // --- 2) GLSL側 宣言を挿入（未宣言で使われていても必ず通るように） ---
    const ensureDecl = (src: string, decl: string) =>
      src.includes(decl) ? src : `${decl}\n${src}`;

    // 頂点シェーダーに uniform と varying を宣言
    shader.vertexShader = ensureDecl(shader.vertexShader, "uniform float uFresnelPow;");
    shader.vertexShader = ensureDecl(shader.vertexShader, "varying float vFresnel;");

    // フラグメント側にも varying を宣言（参照される場合に備えて）
    shader.fragmentShader = ensureDecl(shader.fragmentShader, "varying float vFresnel;");
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

  // ★ 追加：表面ゆらぎ（全体の既定値）
  const SURF_AMP_BASE   = 0.035; // 1本あたりの最大変位（法線方向）— 0.02〜0.05 推奨
  const SURF_AMP_JITTER = 0.015; // 振幅の個体差
  const SURF_FREQ       = 8.0;   // 縦方向の波の細かさ（Boxローカル座標系のYに掛ける）
  const SURF_SPEED      = 1.0;   // 時間変化の速さ

  // const coreScale  = useRef(1);
  // const coreTarget = useRef(1);
  // const shellScale  = useRef(1);
  // const shellTarget = useRef(1);

  // const inflateAmountCore  = 1.25; // 内核の最大スケール
  // const inflateAmountShell = 2; // 外殻の最大スケール

  // const onCoreClick = (e: ThreeEvent<MouseEvent>) => {
  //   e.stopPropagation();
  //   coreTarget.current = coreTarget.current > 1 ? 1 : inflateAmountCore;
  // };

  // const onShellClick = (e: ThreeEvent<MouseEvent>) => {
  //   e.stopPropagation();
  //   shellTarget.current = shellTarget.current > 1 ? 1 : inflateAmountShell;
  // };
  
  const coreOffset = useRef(0);
  const coreOffsetTarget = useRef(0);
  const shellOffset = useRef(0);
  const shellOffsetTarget = useRef(0);

  // 各インスタンスの“初期姿勢”を保持するマップ
  type InstanceData = {
    pos: THREE.Vector3[];
    quat: THREE.Quaternion[];
    scale: THREE.Vector3[];
    normal: THREE.Vector3[]; // 半径方向
  };
  const instanceDataMap = useRef(new Map<THREE.InstancedMesh, InstanceData>());

  const corePushAmount = 2;   // 内核の押し出し量（半径方向）
  const shellPushAmount = 7;  // 外殻の押し出し量
  const pulseMs = 1260;

  // const onCoreClick = (e: any) => {
  //   e.stopPropagation();
  //   coreOffsetTarget.current = coreOffsetTarget.current > 0 ? 0 : corePushAmount;
  // };

  // const onShellClick = (e: any) => {
  //   e.stopPropagation();
  //   shellOffsetTarget.current = shellOffsetTarget.current > 0 ? 0 : shellPushAmount;
  // };

  // 同時トグル用ヘルパ
  const toggleBothOffset = () => {
    const expanded = coreOffsetTarget.current > 0 || shellOffsetTarget.current > 0;
    // 展開していなければ両方押し出し、していれば両方戻す
    if (!expanded) {
      coreOffsetTarget.current  = corePushAmount;   // 例: 0.6
      shellOffsetTarget.current = shellPushAmount;  // 例: 0.8
    } else {
      coreOffsetTarget.current  = 0;
      shellOffsetTarget.current = 0;
    }
  };

  const pulseBothOffsets = () => {
    coreOffsetTarget.current  = corePushAmount;
    shellOffsetTarget.current = shellPushAmount;
    // 一定時間後に戻す
    window.setTimeout(() => {
      coreOffsetTarget.current  = 0;
      shellOffsetTarget.current = 0;
    }, pulseMs);
  };

  // クリック時はどちらを押しても両方トグル
  const onCoreClick = (e: any) => {
    e.stopPropagation();
    toggleBothOffset();
    pulseBothOffsets();
  };

  const onShellClick = (e: any) => {
    e.stopPropagation();
    toggleBothOffset();
    pulseBothOffsets();
  };

  // コロナ乱流の揺らぎ 用
  const coronaGeoRef   = useRef<THREE.SphereGeometry | null>(null);
  const coronaBasePos  = useRef<Float32Array | null>(null);
  // 調整用（振幅・速度・周波数）
  const CORONA_WOBBLE_AMP   = 0.015;  // 0.01〜0.02
  const CORONA_WOBBLE_SPEED = 0.9;    // 0.6〜1.2
  const CORONA_WOBBLE_FREQ  = 0.15;   // 0.1〜0.25

  const applyRadialOffset = (mesh: THREE.InstancedMesh | null, offset: number) => {
    if (!mesh || offset === undefined) return;
    const data = instanceDataMap.current.get(mesh);
    if (!data) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < data.pos.length; i++) {
      // 基準位置 + 法線方向 * offset
      dummy.position.copy(data.pos[i]).addScaledVector(data.normal[i], offset);
      dummy.quaternion.copy(data.quat[i]);
      dummy.scale.copy(data.scale[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  // 緯度経度正規化テーブル（0..1）
  const grid = useMemo(() => {
    const uv: Array<{ u: number; v: number }> = [];
    for (let t = 0; t <= columnsTheta; t++) {
      const v = t / columnsTheta; // 0..1
      for (let p = 0; p < columnsPhi; p++) {
        const u = p / columnsPhi; // 0..1
        uv.push({ u, v });
      }
    }
    return uv;
  }, [columnsPhi, columnsTheta]);

  const count = grid.length;

  // 共通: u,v -> 法線 n を返す
  const uvToNormal = (u: number, v: number) => {
    const theta = v * Math.PI;      // 0..π
    const phi = u * Math.PI * 2;    // 0..2π
    const sinT = Math.sin(theta);
    return new THREE.Vector3(
      sinT * Math.cos(phi),
      Math.cos(theta),
      sinT * Math.sin(phi)
    ).normalize();
  };

  // 層ごとの配置関数
  const placeLayer = (
    mesh: THREE.InstancedMesh,
    opts: LayerOpts,
    phiShift: number
  ) => {
    const { radius, columnSide, minLen, maxLen, jitter = 0, color = "#d9c19a" } = opts;
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    // 色分布（ベース色）
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

    // ★ 発光色の分布（なければ 1,1,1 = “emissive を変えない”）
    const emissivePalette =
      opts.emissiveColors && opts.emissiveColors.length > 0
        ? (() => {
            const total = opts.emissiveColors!.reduce((s, e) => s + (e.ratio ?? 0), 0) || 1;
            let acc = 0;
            return opts.emissiveColors!.map((e) => {
              acc += (e.ratio ?? 0) / total;
              const c = new THREE.Color(e.color);
              const m = e.intensity ?? 1; // 任意の倍率
              return { cutoff: acc, color: new THREE.Color(c.r * m, c.g * m, c.b * m) };
            });
          })()
        : null;

    // ★ per-instance emissive 用のバッファ
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

      // ---- ベース色（従来仕様 + 分布対応）----
      let chosen = baseColor.clone();
      if (basePalette) {
        const r = Math.random();
        for (let k = 0; k < basePalette.length; k++) {
          if (r <= basePalette[k].cutoff) { chosen = basePalette[k].color.clone(); break; }
        }
      }
      chosen.offsetHSL(0, (Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06);
      mesh.setColorAt(i, chosen);

      // ---- ★ 発光色（分布 or 既定値 → attribute へ）----
      let e = new THREE.Color(1, 1, 1); // 既定は“変更なし”
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
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // ★ attribute を geometry に登録
    (mesh.geometry as THREE.InstancedBufferGeometry).setAttribute(
      "instanceEmissive",
      new THREE.InstancedBufferAttribute(emissiveArray, 3)
    );

    // ★ 追記：表面ゆらぎ用の per-instance 属性（振幅＆位相）
    {
      const surfAmp  = new Float32Array(count);
      const surfPhas = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        // 個体差ありの振幅（負荷や破綻防止のため小さめ）
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

    // フリッカー用に位相属性をつける指定がある場合
    if (opts.flicker) {
      const phaseArray = new Float32Array(count);
      for (let i = 0; i < count; i++) phaseArray[i] = Math.random() * Math.PI * 2;
      (mesh.geometry as THREE.InstancedBufferGeometry).setAttribute(
        "instancePhase",
        new THREE.InstancedBufferAttribute(phaseArray, 1)
      );
    }

    // ★ グラニュレーションでも使うため、未設定なら位相を保証
    if (!(mesh.geometry as any).attributes.instancePhase) {
      const phaseArray = new Float32Array(count);
      for (let i = 0; i < count; i++) phaseArray[i] = Math.random() * Math.PI * 2;
      (mesh.geometry as THREE.InstancedBufferGeometry).setAttribute(
        "instancePhase",
        new THREE.InstancedBufferAttribute(phaseArray, 1)
      );
    }

    // ★ 材質に小さなシェーダーパッチ（totalEmissiveRadiance をインスタンス色で変調）
    const mat = mesh.material as THREE.MeshStandardMaterial & { userData?: any };
    if (!mat.userData) mat.userData = {};
    if (!mat.userData._patchedEmissive) {
      const prevOnBeforeCompile = mat.onBeforeCompile; // 既存を尊重

      mat.onBeforeCompile = (shader, renderer: any) => {
        // 先に既存（他所で設定済みの onBeforeCompile）があれば実行
        prevOnBeforeCompile?.call(mat, shader, renderer);

        // --- uniforms（既存＋表面ゆらぎ） ---
        shader.uniforms.uTime         = shader.uniforms.uTime         ?? { value: 0 };
        shader.uniforms.uFlickerSpeed = shader.uniforms.uFlickerSpeed ?? { value: opts.flickerSpeed ?? 1.0 };
        shader.uniforms.uFlickerAmp   = shader.uniforms.uFlickerAmp   ?? { value: opts.flickerAmp ?? 0.15 };
        shader.uniforms.uSurfTime     = shader.uniforms.uSurfTime     ?? { value: 0 };
        shader.uniforms.uSurfFreq     = shader.uniforms.uSurfFreq     ?? { value: SURF_FREQ };
        shader.uniforms.uSurfSpeed    = shader.uniforms.uSurfSpeed    ?? { value: SURF_SPEED };
        shader.uniforms.uFresnelPow   = shader.uniforms.uFresnelPow   ?? { value: 4.0 }; // ← 既存仕様キープ
        shader.uniforms.uStrength     = shader.uniforms.uStrength     ?? { value: 1.0 };

        // 1) 宣言ブロック：重複注入を避けるため includes ガード
        const VS_DECL = `
          attribute vec3 instanceEmissive;
          varying vec3 vInstanceEmissive;
          ${opts.flicker ? "attribute float instancePhase; varying float vPhase;" : ""}
          // 表面ゆらぎ（per-instance）
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
              ${opts.flicker ? "vPhase = instancePhase;" : ""}
          `
          );
        }

        // 2) “表面ゆらぎ”：begin_vertex の直後に一回だけ注入
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

        // 3) fragment：per-instance emissive とフリッカー
        const FS_DECL = `
          varying vec3 vInstanceEmissive;
          uniform float uTime;
          uniform float uFlickerSpeed;
          uniform float uFlickerAmp;
          ${opts.flicker ? "varying float vPhase;" : ""}
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
              float flicker = ${opts.flicker ? "(1.0 + uFlickerAmp * sin(uTime * uFlickerSpeed + vPhase))" : "1.0"};
              vec3 totalEmissiveRadiance = emissive * vInstanceEmissive * flicker;
            `
          );
        }

        // useFrame から更新するため uniforms を保持
        mat.userData.uniforms = shader.uniforms;
      };

      // プログラムキャッシュを分ける（誤共有防止）
      mat.customProgramCacheKey = () =>
        `voxelSun_emissive_v1|flicker:${!!opts.flicker}|freq:${SURF_FREQ}|speed:${SURF_SPEED}`;

      mat.needsUpdate = true;
      mat.userData._patchedEmissive = true;
    }

    // // ★ 材質に小さなシェーダーパッチ（totalEmissiveRadiance をインスタンス色で変調）
    // const mat = mesh.material as THREE.MeshStandardMaterial & { userData?: any };
    // if (!mat.userData) mat.userData = {};
    // if (!mat.userData._patchedEmissive) {
    //   mat.onBeforeCompile = (shader) => {
    //     // --- uniforms（既存＋表面ゆらぎ） ---
    //     shader.uniforms.uTime         = { value: 0 };
    //     shader.uniforms.uFlickerSpeed = { value: opts.flickerSpeed ?? 1.0 };
    //     shader.uniforms.uFlickerAmp   = { value: opts.flickerAmp ?? 0.15 };
    //     shader.uniforms.uSurfTime     = { value: 0 };
    //     shader.uniforms.uSurfFreq     = { value: SURF_FREQ };
    //     shader.uniforms.uSurfSpeed    = { value: SURF_SPEED };
    //     shader.uniforms.uFresnelPow = { value: 4.0 }; // 2〜4 で調整
    //     shader.uniforms.uStrength   = { value: 1.0 };

    //     // 1) 宣言ブロック：main の“直前”に注入（= three の #define 群の後になる）
    //     const VS_DECL = `
    //       attribute vec3 instanceEmissive;
    //       varying vec3 vInstanceEmissive;
    //       ${opts.flicker ? "attribute float instancePhase; varying float vPhase;" : ""}
    //       // 表面ゆらぎ（per-instance）
    //       attribute float instanceSurfAmp;
    //       attribute float instanceSurfPhase;
    //       uniform float uSurfTime;
    //       uniform float uSurfFreq;
    //       uniform float uSurfSpeed;
    //     `;
    //     shader.vertexShader = shader.vertexShader.replace(
    //       "void main() {",
    //       `${VS_DECL}
    //       void main() {
    //         vInstanceEmissive = instanceEmissive;
    //         ${opts.flicker ? "vPhase = instancePhase;" : ""}
    //       `
    //     );

    //     // 2) “表面ゆらぎ”：'#include <begin_vertex>' の直後に注入（transformed が定義済み）
    //     shader.vertexShader = shader.vertexShader.replace(
    //       "#include <begin_vertex>",
    //       `
    //         #include <begin_vertex>
    //         float surfWave = sin(uSurfFreq * transformed.y + uSurfTime * uSurfSpeed + instanceSurfPhase);
    //         vec3  surfNormal = normalize(normal);
    //         transformed += surfNormal * instanceSurfAmp * surfWave;
    //       `
    //     );

    //     // 3) fragment：per-instance emissive とフリッカー
    //     const FS_DECL = `
    //       varying vec3 vInstanceEmissive;
    //       uniform float uTime;
    //       uniform float uFlickerSpeed;
    //       uniform float uFlickerAmp;
    //       ${opts.flicker ? "varying float vPhase;" : ""}
    //     `;
    //     shader.fragmentShader = shader.fragmentShader.replace(
    //       "void main() {",
    //       `${FS_DECL}
    //       void main() {
    //       `
    //     );
    //     shader.fragmentShader = shader.fragmentShader.replace(
    //       "vec3 totalEmissiveRadiance = emissive;",
    //       `
    //         float flicker = ${opts.flicker ? "(1.0 + uFlickerAmp * sin(uTime * uFlickerSpeed + vPhase))" : "1.0"};
    //         vec3 totalEmissiveRadiance = emissive * vInstanceEmissive * flicker;
    //       `
    //     );

    //     // useFrame から更新するため uniforms を保持
    //     mat.userData.uniforms = shader.uniforms;
    //   };

    //   mat.needsUpdate = true;
    //   mat.userData._patchedEmissive = true;
    // }

    // この層の“初期姿勢”を保存
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

        // ローカルY（up）を回転に通すと“その柱の法線方向”が得られる
        data.normal[i] = up.clone().applyQuaternion(q).normalize();
      }
      instanceDataMap.current.set(mesh, data);
    }
  };


  // 初期配置（core/shell）
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

  // ★ ② グラニュレーション + 押し出しを同時に適用する関数（追加）
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
    if (!data) return;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < data.pos.length; i++) {
      const baseS = data.scale[i];
      const phase = ph ? ph.getX(i) : 0;
      const k = 1 + amp * Math.sin(time * speed + phase); // 長手(Y)だけふわっと
      dummy.position.copy(data.pos[i]).addScaledVector(data.normal[i], offset);
      dummy.quaternion.copy(data.quat[i]);
      dummy.scale.set(baseS.x, baseS.y * k, baseS.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  // 回転（外殻はわずかに逆方向へ）
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;
    const g = groupRef.current;
    g.rotation.y = t * 0.25;
    g.rotation.x = Math.sin(t * 0.2) * 0.1;

    if (shellRef.current) {
      shellRef.current.rotation.y = -t * counterRotate; // 逆回転で層の違いが見える
    }

    // // ★ 追記：クリックで設定された target に向けてダンプで補間
    // coreScale.current  = THREE.MathUtils.damp(coreScale.current,  coreTarget.current,  6, delta);
    // shellScale.current = THREE.MathUtils.damp(shellScale.current, shellTarget.current, 6, delta);

    // if (coreRef.current)  coreRef.current.scale.setScalar(coreScale.current);
    // if (shellRef.current) shellRef.current.scale.setScalar(shellScale.current);

    // ▼ ここから追加：ターゲットへダンプで滑らかに
    coreOffset.current  = THREE.MathUtils.damp(coreOffset.current,  coreOffsetTarget.current,  6, delta);
    shellOffset.current = THREE.MathUtils.damp(shellOffset.current, shellOffsetTarget.current, 6, delta);

    // // オフセット適用（半径方向に平行移動）
    // applyRadialOffset(coreRef.current,  coreOffset.current);
    // applyRadialOffset(shellRef.current, shellOffset.current);

    // ★ ② グラニュレーション + 押し出し（ここに変更）
    applyRadialOffsetWithGranulation(coreRef.current,  coreOffset.current,  t, 0.9, 0.10); //(..., speed, amp) の speed=0.6〜0.9、amp=0.08〜0.18
    applyRadialOffsetWithGranulation(shellRef.current, shellOffset.current, t, 0.9, 0.18);


    // ★ 追記：フリッカー用の時間を流し込む（ある場合だけ）
    const tick = (m: THREE.InstancedMesh | null) => {
      if (!m) return;

      // マテリアルが配列の可能性もケア（将来の拡張に安全）
      const mats = Array.isArray((m as any).material)
        ? (m as any).material
        : [(m as any).material];

      for (const mat of mats) {
        const u = mat?.userData?.uniforms as any | undefined;
        if (!u) continue;              // ★ ← ここでガード
        if (u.uTime)     u.uTime.value = t;
        if (u.uSurfTime) u.uSurfTime.value = t;  // ★ ← こちらもオプショナルに
      }
    };
    tick(coreRef.current);
    tick(shellRef.current);

    // ───────── ③ コロナ乱流の揺らぎ（追加）─────────
    const geo = coronaGeoRef.current;
    if (geo) {
      const pos = geo.attributes.position as THREE.BufferAttribute;
      // 初回にベース座標をスナップショット
      if (!coronaBasePos.current || coronaBasePos.current.length !== pos.array.length) {
        coronaBasePos.current = (pos.array as Float32Array).slice(0);
      }
      const base = coronaBasePos.current!;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3 + 0];
        const by = base[i * 3 + 1];
        const bz = base[i * 3 + 2];
        const r  = Math.sqrt(bx*bx + by*by + bz*bz);
        // 半径方向に微小変形
        const n = CORONA_WOBBLE_AMP * Math.sin(CORONA_WOBBLE_SPEED * t + (bx + by + bz) * CORONA_WOBBLE_FREQ);
        const s = (r + n) / r;
        pos.setXYZ(i, bx * s, by * s, bz * s);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
  });

  // プロミネンスのパラメータ（安定のため初回だけ生成）
  const prominences = useMemo(() => {
    return Array.from({ length: 6 }).map(() => ({
      baseR: shell.radius,
      height: 1.6 + Math.random() * 1.2,
      theta: Math.random() * Math.PI,
      phi:   Math.random() * Math.PI * 2,
      radius: 0.08 + Math.random() * 0.05, // チューブ太さ
    }));
  }, [shell.radius]);

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

      {/* ★ ① コロナ（縁が強く光るフレネル殻）— 既存機能に影響しない独立メッシュ */}
      {/* <mesh renderOrder={999}>
        <sphereGeometry args={[shell.radius * 1.12, 64, 64]} />
        <meshStandardMaterial
          color={"#ffb300"}
          emissive={"#ff9000"}
          emissiveIntensity={1.0}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
          onBeforeCompile={(shader) => {
            // // Fresnel 係数で縁ほど emissive を強める
            // shader.uniforms.uFresnelPow = { value: 4 }; // 2〜4で調整
            // shader.uniforms.uStrength  = { value: 1.0 };  // 強さ
            // shader.vertexShader =
            //   `
            //   uniform float uFresnelPow;
            //   varying float vFresnel;
            //   void computeFresnel(){
            //     vec3 n = normalize( normalMatrix * normal );     // view空間法線
            //     vec4 mv = modelViewMatrix * vec4( position, 1.0 );
            //     vec3 v = normalize( -mv.xyz );                   // 視線
            //     float ndotv = clamp(dot(n, v), 0.0, 1.0);
            //     vFresnel = pow(1.0 - ndotv, uFresnelPow);
            //   }
            //   ` + shader.vertexShader.replace(
            //     "void main() {",
            //     "void main() { computeFresnel();"
            //   );
            // shader.fragmentShader =
            //   `
            //   uniform float uFresnelPow;
            //   uniform float uStrength;
            //   varying float vFresnel;
            //   ` + shader.fragmentShader.replace(
            //     "vec3 totalEmissiveRadiance = emissive;",
            //     "vec3 totalEmissiveRadiance = emissive * (1.0 + uStrength * vFresnel);"
            //   );

            // Fresnel 係数で縁ほど emissive を強める（重複宣言を避ける）
            shader.uniforms.uFresnelPow = shader.uniforms.uFresnelPow ?? { value: 4 };
            shader.uniforms.uFresnelPow.value = 4;
            shader.uniforms.uStrength  = shader.uniforms.uStrength ?? { value: 1.0 };

            const ensure = (src: string, decl: string) =>
              src.includes(decl) ? src : `${decl}\n${src}`;

            // vertex: 既にグローバルガードで入っている可能性あり
            shader.vertexShader = ensure(shader.vertexShader, "uniform float uFresnelPow;");
            shader.vertexShader = ensure(shader.vertexShader, "varying float vFresnel;");
            shader.vertexShader = shader.vertexShader.replace(
              "void main() {",
              `void main() {
                 vec3 n = normalize( normalMatrix * normal );
                 vec4 mv = modelViewMatrix * vec4( position, 1.0 );
                 vec3 v = normalize( -mv.xyz );
                 float ndotv = clamp(dot(n, v), 0.0, 1.0);
                 vFresnel = pow(1.0 - ndotv, uFresnelPow);`
            );

            // fragment: vFresnel と uStrength のみ必要
            shader.fragmentShader = ensure(shader.fragmentShader, "varying float vFresnel;");
            shader.fragmentShader = ensure(shader.fragmentShader, "uniform float uStrength;");
            shader.fragmentShader = shader.fragmentShader.replace(
              "vec3 totalEmissiveRadiance = emissive;",
              "vec3 totalEmissiveRadiance = emissive * (1.0 + uStrength * vFresnel);"
           );
          }}
        />
      </mesh> */}

      {/* ② プロミネンス（炎の房）
      {prominences.map((p, idx) => (
        <Prominence key={idx} {...p} />
      ))} */}
    </group>
  );
}

/** ② プロミネンス用の内部コンポーネント（追加） */
function Prominence({
  baseR, height, theta, phi, radius = 0.1
}: { baseR: number; height: number; theta: number; phi: number; radius?: number }) {
  // 表面の開始位置（法線方向へ少し外）
  const start = useMemo(() => new THREE.Vector3(
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),
    Math.sin(theta) * Math.sin(phi)
  ).multiplyScalar(baseR * 1.02), [baseR, theta, phi]);

  // 接線方向に少し流しつつ外へ
  const mid = useMemo(() => {
    const normal = start.clone().normalize();
    const tangent = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi)).multiplyScalar(baseR * 0.6);
    return start.clone().addScaledVector(normal, height).add(tangent);
  }, [start, phi, baseR, height]);

  const end = useMemo(() => start.clone().addScaledVector(start.clone().normalize(), baseR * 0.15), [start, baseR]);

  const path = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return new THREE.CatmullRomCurve3(curve.getPoints(32));
  }, [start, mid, end]);

  return (
    <mesh renderOrder={1000}>
      <tubeGeometry args={[path, 64, radius, 12, false]} />
      <meshStandardMaterial
        color={"#ff8800"}
        emissive={"#ff4d00"}
        emissiveIntensity={1.4}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}