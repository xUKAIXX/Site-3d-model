import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { characterMakers } from './characters.js';
import { floorShadow, pedestalMakers } from './pedestals.js';

export const initialYaws = [.34, -.29, .32];
const rimColors = ['#86f6d7', '#f8ac99', '#89bbff'].map((hex) => new T.Color(hex));
const fillColors = ['#ffebc9', '#fff0dd', '#f3ebea'].map((hex) => new T.Color(hex));

export function createViewer(canvas, { capture = false } = {}) {
  const attributes = { alpha: true, antialias: true, powerPreference: 'high-performance' };
  const context = canvas.getContext('webgl2', attributes);
  if (!context) throw new Error('WebGL 2 context unavailable');
  const debug = context.getExtension('WEBGL_debug_renderer_info');
  const rendererName = debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : '';
  const software = !capture && /swiftshader|llvmpipe|software rasterizer/i.test(rendererName);
  const renderer = new T.WebGLRenderer({ canvas, context, ...attributes });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, .15, 42);
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const reflection = pmrem.fromScene(room, .05, .1, 30, { size: 128 });
  scene.environment = reflection.texture;
  scene.environmentIntensity = .36;
  room.dispose();
  pmrem.dispose();

  const ambient = new T.HemisphereLight('#e5f6ee', '#26382f', .86);
  scene.add(ambient);
  const key = new T.DirectionalLight('#ffebc9', 3.05);
  key.position.set(3.7, 7.25, 4.75);
  key.target.position.set(.08, 2.35, 0);
  key.castShadow = true;
  const shadowSize = software ? 768 : 1536;
  key.shadow.mapSize.set(shadowSize, shadowSize);
  key.shadow.camera.left = -3.65; key.shadow.camera.right = 3.65;
  key.shadow.camera.top = 4.05; key.shadow.camera.bottom = -3.48;
  key.shadow.camera.near = .5; key.shadow.camera.far = 20;
  key.shadow.normalBias = .012;
  key.shadow.bias = -.00017;
  key.shadow.radius = software ? 1.575 : 3.15;
  scene.add(key, key.target);

  const rim = new T.DirectionalLight('#86f6d7', 2.54);
  rim.position.set(-5.7, 4.4, -4.04);
  rim.target.position.set(0, 2.18, 0);
  scene.add(rim, rim.target);
  const fill = new T.DirectionalLight('#c2cfc9', .59);
  fill.position.set(-3.1, 2.95, 5.6);
  fill.target.position.set(0, 2.26, 0);
  scene.add(fill, fill.target);

  const figures = [];
  const look = new T.Vector3(0, 2.37, 0);
  let distance = 10.6;

  function build(index) {
    if (figures[index]) return figures[index];
    const { root, height } = pedestalMakers[index]();
    const sculpture = characterMakers[index]();
    sculpture.position.y = height;
    const subject = new T.Group();
    subject.add(root, sculpture);
    const node = new T.Group();
    node.add(floorShadow(), subject);
    node.visible = false;
    scene.add(node);
    figures[index] = { node, subject };
    return figures[index];
  }

  function resize(width, height, resolution) {
    if (width < 1 || height < 1) return;
    const pixelBudget = software ? 535_000 : 1_280_000;
    const dpr = resolution ?? Math.min(window.devicePixelRatio || 1, software ? 1 : 1.65, Math.sqrt(pixelBudget / (width * height)));
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    distance = Math.max(10.72, 7.65 / camera.aspect);
    camera.updateProjectionMatrix();
  }

  function draw(progress, angles, tilt, active, reduced = false) {
    const source = Math.floor(progress), target = Math.min(source + 1, 2), tween = progress - source;
    rim.color.copy(rimColors[source]).lerp(rimColors[target], tween);
    key.color.copy(fillColors[source]).lerp(fillColors[target], tween);
    const dive = reduced ? 0 : Math.sin(Math.PI*tween);
    for (let i = 0; i < 3; i++) {
      const depth = i - progress;
      const visible = reduced ? i === active : Math.abs(depth) < .965;
      if (!visible && !figures[i]) continue;
      const item = visible ? build(i) : figures[i];
      item.node.visible = visible;
      if (!visible) continue;
      const delta = reduced ? 0 : depth;
      item.node.position.set(2.70 * delta, -4.48 * delta, -4.08 * Math.abs(delta));
      item.node.scale.setScalar(1 - .23 * Math.abs(delta));
      item.subject.rotation.y = initialYaws[i] + angles[i] + .86 * delta;
    }
    camera.position.set(-.33 * dive, 4.01 + tilt * 2.1 + .23 * dive, distance + 1.04 * dive);
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  function dispose() {
    scene.traverse((object) => {
      object.geometry?.dispose();
      object.material?.map?.dispose();
      object.material?.dispose();
    });
    reflection.dispose();
    key.shadow.dispose();
    renderer.dispose();
  }

  return { resize, draw, build, dispose };
}
