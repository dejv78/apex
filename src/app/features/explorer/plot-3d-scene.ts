import {
  AmbientLight,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Sprite,
  SpriteMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { clampSrgb, oklabToSrgb, type Oklab } from '../../../core/color/color';
import { srgbGamutMesh } from '../../../core/gamut/srgb-gamut';
import { intersectTriangleSets } from '../../../core/gamut/triangle-intersection';
import type { Pigment } from '../../../core/pigments/pigments';
import {
  CHROMA_RINGS,
  CYLINDER_CHROMA,
  HUE_ANGLES,
  LIGHTNESS_TICKS,
  VIEW_PRESETS,
  circleAt,
  hueLine,
  toScene,
  type Vec3,
  type ViewPreset,
} from './plot-3d-geometry';

/** The mixing path as the scene draws it: interior dots, one or two end markers, optional line. */
export interface PathView {
  dots: { lab: Oklab; hex: string; tip: string }[];
  ends: {
    pigment: Pigment;
    /** Where the model puts the end (the true color when mixes are corrected). */
    lab: Oklab;
    hex: string;
    anchor: boolean;
    /** The pigment's true color, only when it differs visibly from `lab`. */
    truth: Oklab | null;
  }[];
  /** Endpoints of the straight OKLab line, when it is shown. */
  linear: [Oklab, Oklab] | null;
}

export interface Hover {
  text: string;
  x: number;
  y: number;
}

export interface SceneCallbacks {
  /** A pigment was clicked; `asAnchor` is set for Ctrl/⌘+click. */
  onPick(pigment: Pigment, asAnchor: boolean): void;
  onHover(hover: Hover | null): void;
}

const BACKGROUND = '#777777';
/** The mixture hull's color; the sRGB crossing line reuses it. */
const HULL_COLOR = 0xffd54f;
/** Distance of the camera from the cylinder's center, per preset. */
const DISTANCE: Record<ViewPreset, number> = { top: 4.8, front: 8, side: 8, reset: 8.5 };
const PIGMENT_RADIUS = 0.034;
const DOT_RADIUS = 0.018;
const END_RADIUS = 0.05;
/** Pointer movement in pixels beyond which a press counts as a drag, not a click. */
const CLICK_SLOP = 5;

const v3 = (p: Vec3) => new Vector3(p[0], p[1], p[2]);

/** An sRGB color in [0, 1] as the renderer's linear working color components. */
function linearComponents(srgb: { r: number; g: number; b: number }): [number, number, number] {
  const c = new Color().setRGB(srgb.r, srgb.g, srgb.b, SRGBColorSpace);
  return [c.r, c.g, c.b];
}

function labelSprite(text: string, width = 0.7): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '600 34px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const material = new SpriteMaterial({
    map: new CanvasTexture(canvas),
    transparent: true,
    depthTest: false,
  });
  const sprite = new Sprite(material);
  sprite.scale.set(width, width / 4, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * A flat ring that always faces the camera, like the white border markers in the 2D plot. `radius`
 * is the ring's center line in scene units; the center stays empty, so it never hides what it
 * encircles.
 */
function ringSprite(radius: number, opacity = 1): Sprite {
  const size = 128;
  const ringRadius = 56;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, ringRadius, 0, Math.PI * 2);
  ctx.stroke();
  const sprite = new Sprite(
    new SpriteMaterial({
      map: new CanvasTexture(canvas),
      transparent: true,
      opacity,
      depthTest: false,
    }),
  );
  sprite.scale.setScalar((radius * size) / ringRadius);
  sprite.renderOrder = 5;
  return sprite;
}

function lineSegments(points: Vec3[], opacity: number): LineSegments {
  const geometry = new BufferGeometry().setFromPoints(points.map(v3));
  return new LineSegments(
    geometry,
    new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity }),
  );
}

/** The triangles of a geometry as a flat list of vertex coordinates (9 numbers per triangle). */
function triangleArray(geometry: BufferGeometry): Float32Array {
  const position = geometry.getAttribute('position');
  const index = geometry.index;
  const count = index ? index.count : position.count;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = index ? index.getX(i) : i;
    out[i * 3] = position.getX(v);
    out[i * 3 + 1] = position.getY(v);
    out[i * 3 + 2] = position.getZ(v);
  }
  return out;
}

/** Frees the GPU resources of everything under `group` and empties it. */
function clearGroup(group: Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse((o: Object3D) => {
      const mesh = o as Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as Material | Material[] | undefined;
      for (const m of Array.isArray(material) ? material : material ? [material] : []) {
        (m as { map?: { dispose(): void } }).map?.dispose();
        m.dispose();
      }
    });
  }
}

/**
 * The 3D color cylinder: a Three.js scene with orbit controls and picking. Framework-free, so
 * all Three.js code lives here. Throws from the constructor when WebGL is unavailable.
 */
export class ColorScene {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(35, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private readonly raycaster = new Raycaster();
  private readonly observer: ResizeObserver;

  private readonly pigmentGroup = new Group();
  private readonly pathGroup = new Group();
  private readonly cloudGroup = new Group();
  private readonly srgbGroup = new Group();
  /** The line where the mixture hull crosses the sRGB surface. */
  private readonly crossGroup = new Group();
  private crossMaterials: LineMaterial[] = [];
  private hullTriangles: Float32Array | null = null;
  private srgbTriangles: Float32Array | null = null;

  private pigmentMesh: InstancedMesh | null = null;
  private pigmentList: readonly Pigment[] = [];
  private dotMesh: InstancedMesh | null = null;
  private dotTips: string[] = [];
  private endMeshes: Mesh[] = [];
  /** Hidden when looking along the lightness axis, where they would pile up at the center. */
  private readonly lightnessLabels: Sprite[] = [];

  private renderQueued = false;
  private pressAt: { x: number; y: number } | null = null;
  private hoverQueued: PointerEvent | null = null;
  private disposed = false;

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: SceneCallbacks,
  ) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.background = new Color(BACKGROUND);
    this.scene.add(new AmbientLight(0xffffff, 1));
    this.scene.add(
      this.pigmentGroup,
      this.pathGroup,
      this.cloudGroup,
      this.srgbGroup,
      this.crossGroup,
      this.buildFrame(),
    );

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.appendChild(canvas);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.addEventListener('change', () => {
      const alongAxis = Math.sin(this.controls.getPolarAngle()) < 0.3;
      for (const label of this.lightnessLabels) label.visible = !alongAxis;
      this.requestRender();
    });

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.setView('reset');
  }

  // ---- public API -------------------------------------------------------------------------

  setView(preset: ViewPreset): void {
    const dir = v3(VIEW_PRESETS[preset]).normalize();
    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(dir.multiplyScalar(DISTANCE[preset]));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 0, 0);
    this.controls.update();
    this.requestRender();
  }

  setPigments(pigments: readonly Pigment[]): void {
    clearGroup(this.pigmentGroup);
    this.pigmentList = pigments;
    const geometry = new SphereGeometry(PIGMENT_RADIUS, 14, 10);
    const mesh = new InstancedMesh(geometry, new MeshBasicMaterial(), pigments.length);
    const outline = new InstancedMesh(
      geometry,
      new MeshBasicMaterial({ color: 0x222222, side: BackSide }),
      pigments.length,
    );
    const m = new Matrix4();
    pigments.forEach((p, i) => {
      const [x, y, z] = toScene(p.oklab);
      m.makeTranslation(x, y, z);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, new Color(p.hex));
      m.makeScale(1.22, 1.22, 1.22).setPosition(x, y, z);
      outline.setMatrixAt(i, m);
    });
    this.pigmentGroup.add(outline, mesh);
    this.pigmentMesh = mesh;
    this.requestRender();
  }

  setPath(path: PathView | null): void {
    clearGroup(this.pathGroup);
    this.dotMesh = null;
    this.dotTips = [];
    this.endMeshes = [];
    if (!path) {
      this.requestRender();
      return;
    }
    const m = new Matrix4();

    if (path.dots.length > 0) {
      const mesh = new InstancedMesh(
        new SphereGeometry(DOT_RADIUS, 10, 8),
        new MeshBasicMaterial(),
        path.dots.length,
      );
      path.dots.forEach((d, i) => {
        const [x, y, z] = toScene(d.lab);
        mesh.setMatrixAt(i, m.makeTranslation(x, y, z));
        mesh.setColorAt(i, new Color(d.hex));
      });
      this.pathGroup.add(mesh);
      this.dotMesh = mesh;
      this.dotTips = path.dots.map((d) => d.tip);
    }

    if (path.linear) {
      const line = new Line(
        new BufferGeometry().setFromPoints(path.linear.map((l) => v3(toScene(l)))),
        new LineDashedMaterial({ color: 0xffffff, dashSize: 0.06, gapSize: 0.04, opacity: 0.7 }),
      );
      line.computeLineDistances();
      this.pathGroup.add(line);
    }

    for (const end of path.ends) {
      const [x, y, z] = toScene(end.lab);
      const sphere = new SphereGeometry(END_RADIUS, 18, 14);
      const mesh = new Mesh(sphere, new MeshBasicMaterial({ color: new Color(end.hex) }));
      mesh.position.set(x, y, z);
      mesh.userData['pigment'] = end.pigment;
      mesh.userData['tip'] =
        `${end.pigment.name} (${end.pigment.code})${end.anchor ? ' (anchor)' : ''}`;
      const outline = new Mesh(sphere, new MeshBasicMaterial({ color: 0xffffff, side: BackSide }));
      outline.position.copy(mesh.position);
      outline.scale.setScalar(1.28);
      this.pathGroup.add(outline, mesh);
      this.endMeshes.push(mesh);
      if (end.anchor) {
        const ring = ringSprite(END_RADIUS * 1.9);
        ring.position.copy(mesh.position);
        this.pathGroup.add(ring);
      }
      if (end.truth) {
        const [tx, ty, tz] = toScene(end.truth);
        const truth = ringSprite(END_RADIUS * 1.35, 0.8);
        truth.position.set(tx, ty, tz);
        this.pathGroup.add(truth);
      }
    }
    this.requestRender();
  }

  /**
   * The sampled mixtures: a cloud of points, each in its own color, and/or a translucent hull
   * around them. The two are independent.
   */
  setCloud(samples: readonly Oklab[], show: { points: boolean; hull: boolean }): void {
    clearGroup(this.cloudGroup);
    this.hullTriangles = null;
    if (show.points && samples.length > 0) {
      const positions = new Float32Array(samples.length * 3);
      const colors = new Float32Array(samples.length * 3);
      samples.forEach((lab, i) => {
        const [x, y, z] = toScene(lab);
        positions.set([x, y, z], i * 3);
        colors.set(linearComponents(clampSrgb(oklabToSrgb(lab))), i * 3);
      });
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
      this.cloudGroup.add(
        new Points(
          geometry,
          new PointsMaterial({
            size: 0.028,
            vertexColors: true,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
          }),
        ),
      );
    }
    if (show.hull && samples.length >= 4) {
      try {
        const hull = new ConvexGeometry(samples.map((lab) => v3(toScene(lab))));
        const material = new MeshBasicMaterial({
          color: HULL_COLOR,
          transparent: true,
          opacity: 0.16,
          side: DoubleSide,
          depthWrite: false,
        });
        this.cloudGroup.add(new Mesh(hull, material));
        this.hullTriangles = triangleArray(hull);
      } catch {
        // Degenerate (coplanar) sample sets have no hull; the cloud alone is still shown.
      }
    }
    this.updateCrossing();
    this.requestRender();
  }

  setSrgbGamut(show: boolean): void {
    clearGroup(this.srgbGroup);
    this.srgbTriangles = null;
    if (show) {
      const mesh = srgbGamutMesh(16);
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new Float32BufferAttribute(
          mesh.vertices.flatMap((v) => toScene(v)),
          3,
        ),
      );
      geometry.setAttribute(
        'color',
        new Float32BufferAttribute(
          mesh.colors.flatMap((c) => linearComponents({ r: c[0], g: c[1], b: c[2] })),
          3,
        ),
      );
      geometry.setIndex(mesh.indices);
      this.srgbTriangles = triangleArray(geometry);
      this.srgbGroup.add(
        new Mesh(
          geometry,
          new MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.22,
            side: DoubleSide,
            depthWrite: false,
          }),
        ),
      );
    }
    this.updateCrossing();
    this.requestRender();
  }

  dispose(): void {
    this.disposed = true;
    this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    for (const group of [
      this.pigmentGroup,
      this.pathGroup,
      this.cloudGroup,
      this.srgbGroup,
      this.crossGroup,
    ]) {
      clearGroup(group);
    }
    this.scene.traverse((o) => {
      const mesh = o as Mesh;
      mesh.geometry?.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    canvas.remove();
  }

  // ---- internals --------------------------------------------------------------------------

  /**
   * Draws the curve where the mixture hull crosses the sRGB surface, when both are shown: inside
   * it the mixtures are within sRGB, outside it they exceed it. It is a secondary cue, so it is a
   * thin line in the hull's own color, only more opaque than the hull.
   */
  private updateCrossing(): void {
    clearGroup(this.crossGroup);
    this.crossMaterials = [];
    if (!this.hullTriangles || !this.srgbTriangles) return;
    const segments = intersectTriangleSets(this.hullTriangles, this.srgbTriangles);
    if (segments.length === 0) return;
    const geometry = new LineSegmentsGeometry();
    geometry.setPositions(segments);
    const material = new LineMaterial({
      color: HULL_COLOR,
      linewidth: 1.8,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    material.resolution.set(this.host.clientWidth, this.host.clientHeight);
    const line = new LineSegments2(geometry, material);
    line.renderOrder = 3;
    this.crossMaterials.push(material);
    this.crossGroup.add(line);
  }

  private requestRender(): void {
    if (this.renderQueued || this.disposed) return;
    this.renderQueued = true;
    requestAnimationFrame(() => {
      this.renderQueued = false;
      if (!this.disposed) this.renderer.render(this.scene, this.camera);
    });
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.host;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const material of this.crossMaterials) material.resolution.set(w, h);
    this.requestRender();
  }

  /** The cylinder wall, floor rings, hue lines and lightness axis, with their labels. */
  private buildFrame(): Group {
    const frame = new Group();
    const segments: Vec3[] = [];
    const addRing = (chroma: number, lightness: number) => {
      const ring = circleAt(chroma, lightness);
      for (let i = 0; i < ring.length - 1; i++) segments.push(ring[i], ring[i + 1]);
    };
    for (const l of [0, 0.5, 1]) addRing(CYLINDER_CHROMA, l);
    for (const c of CHROMA_RINGS.filter((c) => c < CYLINDER_CHROMA)) addRing(c, 0);
    for (const deg of HUE_ANGLES) {
      const { bottom, top } = hueLine(deg);
      segments.push(bottom, top);
      const center = toScene({ l: 0, a: 0, b: 0 });
      segments.push(center, bottom);
    }
    frame.add(lineSegments(segments, 0.22));

    const axis = lineSegments([toScene({ l: 0, a: 0, b: 0 }), toScene({ l: 1, a: 0, b: 0 })], 0.7);
    frame.add(axis);

    for (const deg of HUE_ANGLES) {
      const label = labelSprite(`${deg}°`, 0.5);
      label.position.copy(v3(hueLine(deg).label));
      frame.add(label);
    }
    for (const l of LIGHTNESS_TICKS) {
      const label = labelSprite(`L ${l}`, 0.5);
      label.position.copy(v3(toScene({ l, a: 0.045, b: 0 })));
      label.position.x += 0.2;
      this.lightnessLabels.push(label);
      frame.add(label);
    }
    for (const [text, a, b] of [
      ['a+ magenta', 0.36, 0],
      ['green a−', -0.36, 0],
      ['yellow b+', 0, 0.36],
      ['blue b−', 0, -0.36],
    ] as const) {
      const label = labelSprite(text, 0.8);
      label.position.copy(v3(toScene({ l: 0, a, b })));
      frame.add(label);
    }
    return frame;
  }

  private hitTest(event: {
    clientX: number;
    clientY: number;
  }): { pigment: Pigment; tip: string } | { tip: string; pigment?: undefined } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const targets: Object3D[] = [...this.endMeshes];
    if (this.pigmentMesh) targets.push(this.pigmentMesh);
    if (this.dotMesh) targets.push(this.dotMesh);
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    if (hit.object === this.pigmentMesh && hit.instanceId !== undefined) {
      const pigment = this.pigmentList[hit.instanceId];
      return { pigment, tip: `${pigment.name} (${pigment.code})` };
    }
    if (hit.object === this.dotMesh && hit.instanceId !== undefined) {
      return { tip: this.dotTips[hit.instanceId] };
    }
    const pigment = hit.object.userData['pigment'] as Pigment | undefined;
    return pigment ? { pigment, tip: hit.object.userData['tip'] as string } : null;
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.pressAt = { x: e.clientX, y: e.clientY };
    this.callbacks.onHover(null);
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    const press = this.pressAt;
    this.pressAt = null;
    if (!press || e.button !== 0) return;
    if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > CLICK_SLOP) return;
    const hit = this.hitTest(e);
    if (hit?.pigment) this.callbacks.onPick(hit.pigment, e.ctrlKey || e.metaKey);
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (e.buttons !== 0) return;
    const first = this.hoverQueued === null;
    this.hoverQueued = e;
    if (!first) return;
    requestAnimationFrame(() => {
      const event = this.hoverQueued;
      this.hoverQueued = null;
      if (!event || this.disposed) return;
      const hit = this.hitTest(event);
      const rect = this.host.getBoundingClientRect();
      this.callbacks.onHover(
        hit ? { text: hit.tip, x: event.clientX - rect.left, y: event.clientY - rect.top } : null,
      );
      this.renderer.domElement.style.cursor = hit?.pigment ? 'pointer' : 'grab';
    });
  };

  private readonly onPointerLeave = (): void => {
    this.callbacks.onHover(null);
  };
}
