import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const sphere = new T.SphereGeometry(1, 32, 24);
const link = new T.TorusGeometry(1, 0.27, 8, 20);
const clamp = T.MathUtils.clamp;
const v = (p) => new T.Vector3(p[0], p[1], p[2]);

export function finish(hex, { roughness = .54, metalness = 0, grain = .1, vertexColors = false, map = null } = {}) {
  const material = new T.MeshStandardMaterial({ color: hex, roughness, metalness, vertexColors, map });
  if (grain) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.sculptGrain = { value: grain };
      shader.vertexShader = 'varying vec3 vSculpt;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>', '#include <begin_vertex>\nvSculpt = position;',
      );
      shader.fragmentShader = 'varying vec3 vSculpt;\nuniform float sculptGrain;\n' + shader.fragmentShader.replace(
        '#include <color_fragment>', `#include <color_fragment>
        vec3 speck = fract(floor(vSculpt * 310.0) * .1031);
        speck += dot(speck, speck.yzx + 33.33);
        float grainSample = fract((speck.x + speck.y) * speck.z) - .5;
        float tooth = sin(vSculpt.x * 53.1 + sin(vSculpt.z * 22.5)) * sin(vSculpt.y * 61.2 - vSculpt.z * 38.5);
        diffuseColor.rgb *= 1.0 + sculptGrain * (grainSample / (1.0 + 115.0 * length(fwidth(vSculpt))) + tooth * .085);`,
      );
    };
    material.customProgramCacheKey = () => 'sculpt-grain-v1';
  }
  return material;
}

export function mesh(parent, geometry, material, at = [0, 0, 0]) {
  const object = new T.Mesh(geometry, material);
  object.position.set(...at);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function joint(parent, at = [0, 0, 0], turn = [0, 0, 0]) {
  const group = new T.Group();
  group.position.set(...at);
  group.rotation.set(...turn);
  parent.add(group);
  return group;
}

export function ball(parent, material, at, scale, turn) {
  const object = mesh(parent, sphere, material, at);
  object.scale.set(...scale);
  if (turn) object.rotation.set(...turn);
  return object;
}

export function box(parent, material, at, size, radius = .04, segments = 3) {
  return mesh(parent, new RoundedBoxGeometry(...size, segments, radius), material, at);
}

export function rod(parent, material, from, to, r1, r2 = r1, sides = 24) {
  const start = v(from);
  const end = v(to);
  const length = start.distanceTo(end);
  const object = mesh(parent, new T.CylinderGeometry(r2, r1, length, sides), material);
  object.position.copy(start).lerp(end, .5);
  object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize());
  return object;
}

export function ring(parent, material, at, radius, wire, flat = false) {
  const object = mesh(parent, new T.TorusGeometry(radius, wire, 9, 40), material, at);
  if (flat) object.rotation.x = Math.PI / 2;
  return object;
}

export function path(parent, material, pts, radius, steps = Math.max(16, pts.length * 6), sides = 10) {
  const curve = new T.CatmullRomCurve3(pts.map(v), false, 'catmullrom', .45);
  return mesh(parent, new T.TubeGeometry(curve, steps, radius, sides, false), material);
}

export function limb(parent, material, pts, steps = 44, segments = 16) {
  const curve = new T.CatmullRomCurve3(pts.map(v), false, 'catmullrom', .5);
  const frame = curve.computeFrenetFrames(steps, false);
  const pos = [], indexes = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const center = curve.getPointAt(u);
    const t = curve.getUtoTmapping(u) * (pts.length - 1);
    const index = Math.min(Math.floor(t), pts.length - 2);
    const f = t - index;
    const a = pts[index - 1]?.[3] ?? pts[index][3];
    const b = pts[index][3];
    const c = pts[index + 1][3];
    const d = pts[index + 2]?.[3] ?? c;
    const r = Math.max(.001, .5 * ((2 * b) + (-a + c) * f + (2*a - 5*b + 4*c - d) * f*f + (-a + 3*b - 3*c + d) * f*f*f));
    const n = frame.normals[i], bAxis = frame.binormals[i];
    for (let j = 0; j < segments; j++) {
      const angle = j * TAU / segments;
      const x = r * Math.cos(angle), y = r * Math.sin(angle);
      pos.push(center.x + x*n.x + y*bAxis.x, center.y + x*n.y + y*bAxis.y, center.z + x*n.z + y*bAxis.z);
      if (i < steps) {
        const l = i * segments + j, next = i * segments + (j + 1) % segments;
        indexes.push(l, next, l + segments, next, next + segments, l + segments);
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setIndex(indexes);
  g.computeVertexNormals();
  return mesh(parent, g, material);
}

export function shape(parent, material, draw, at, { depth = .032, bevel = .025 } = {}) {
  const outline = new T.Shape();
  draw(outline);
  const geometry = new T.ExtrudeGeometry(outline, {
    depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 4, curveSegments: 24, steps: 1,
  });
  return mesh(parent, geometry, material, at);
}

export function polygon(s, points) {
  s.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) s.lineTo(...points[i]);
  s.closePath();
}

// A continuous, UV-mapped rotational surface with independently sculptable silhouettes.
export function column(parent, material, points, { detail = 112, rings = 60, modify } = {}) {
  const axis = new T.CatmullRomCurve3(points.map(([y, rx, rz = rx]) => new T.Vector3(rx, y, rz)), false, 'catmullrom', .43);
  const centers = new T.CatmullRomCurve3(points.map((p, i) => new T.Vector3(p[3] ?? 0, i, p[4] ?? 0)), false, 'catmullrom', .43);
  const pos = [], uv = [], shades = [], ix = [];
  const color = new T.Color(1, 1, 1);
  const pt = new T.Vector3();
  for (let j = 0; j <= rings; j++) {
    const t = j / rings;
    const { x: rx, y: h, z: rz } = axis.getPoint(t);
    const ctr = centers.getPoint(t);
    for (let i = 0; i <= detail; i++) {
      const s = i / detail;
      const a = (i % detail) / detail * TAU;
      pt.set(ctr.x + Math.sin(a) * Math.max(.001, rx), h, ctr.z + Math.cos(a) * Math.max(.001, rz));
      color.setRGB(1, 1, 1);
      modify?.(pt, a, t, color);
      pos.push(pt.x, pt.y, pt.z);
      uv.push(s, clamp((h - points[0][0]) / (points.at(-1)[0] - points[0][0]), 0, 1));
      if (material.vertexColors) shades.push(color.r, color.g, color.b);
      if (j < rings && i < detail) {
        const lo = j * (detail + 1) + i, hi = lo + detail + 1;
        ix.push(lo, lo + 1, hi, lo + 1, hi + 1, hi);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  if (material.vertexColors) geometry.setAttribute('color', new T.Float32BufferAttribute(shades, 3));
  geometry.setIndex(ix);
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  const cross = new T.Vector3();
  for (let j = 0; j <= rings; j++) {
    const first = j * (detail + 1), last = first + detail;
    pt.fromBufferAttribute(normals, first).add(cross.fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, pt.x, pt.y, pt.z);
    normals.setXYZ(last, pt.x, pt.y, pt.z);
  }
  return mesh(parent, geometry, material);
}

export function lathe(parent, material, profile, count = 112) {
  return mesh(parent, new T.LatheGeometry(profile.map(([r, h]) => new T.Vector2(r, h)), count), material);
}

export function shell(parent, material, at, size, radius, pores) {
  const [w, h, d] = size;
  let geo = new T.BoxGeometry(w, h, d, 96, 88, 40);
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const welded = mergeVertices(geo);
  geo.dispose();
  geo = welded;
  const vertices = geo.attributes.position;
  const tint = new Float32Array(vertices.count * 3);
  const p = new T.Vector3(), base = new T.Vector3(), n = new T.Vector3();
  const bounds = new T.Vector3(w / 2 - radius, h / 2 - radius, d / 2 - radius);
  for (let i = 0; i < vertices.count; i++) {
    p.fromBufferAttribute(vertices, i);
    base.set(clamp(p.x, -bounds.x, bounds.x), clamp(p.y, -bounds.y, bounds.y), clamp(p.z, -bounds.z, bounds.z));
    n.copy(p).sub(base).normalize();
    p.copy(base).addScaledVector(n, radius);
    let shade = 0;
    for (const { face, u, y, r, depth } of pores) {
      const facing = face === 'front' ? n.z : face === 'back' ? -n.z : face === 'left' ? -n.x : n.x;
      if (facing < .38) continue;
      const coord = face === 'front' || face === 'back' ? p.x : p.z;
      const t = Math.hypot((coord - u) / r, (p.y - y) / (r * 1.13));
      if (t < 1) {
        const amount = (1 - t*t) ** 2 * facing;
        p.addScaledVector(n, -depth * amount);
        shade += amount * .31;
      }
    }
    const xf = p.x / (w / 2), yf = p.y / (h / 2);
    p.x *= .965 + .105 * yf;
    p.x += Math.sign(xf) * Math.abs(xf) ** 3 * (.047 * Math.sin(9.75 * p.y + .3) + .025 * Math.cos(17.5 * p.y + .2));
    p.y += Math.sign(yf) * Math.abs(yf) ** 4 * (.042 * Math.cos(8.7 * p.x + .15) + .018 * Math.sin(15.6 * p.x));
    p.z += .013 * Math.sin(11 * p.x + 8.3 * p.y) * Math.abs(n.x + n.y) + .014 * yf;
    vertices.setXYZ(i, p.x, p.y, p.z);
    const mottling = .012 * Math.sin(p.x * 13.4 + p.z * 37) * Math.sin(p.y * 38 - p.z * 11);
    tint.set([1 - shade * .72 + mottling, 1 - shade * .78 + mottling, 1 - shade * 1.5 + mottling], i * 3);
  }
  geo.setAttribute('color', new T.BufferAttribute(tint, 3));
  geo.computeVertexNormals();
  return mesh(parent, geo, material, at);
}

export function halfEye(parent, at, scale, turn, mats, options = {}) {
  const { irisX = .08, irisY = -.13, blink = 1.63, irisSize = 1 } = options;
  const g = joint(parent, at, [0, 0, turn]);
  g.scale.set(...scale);
  ball(g, mats.white, [0, 0, 0], [.98, 1, .47]);
  const lensZ = .47 * Math.sqrt(1 - irisX ** 2 - irisY ** 2);
  ball(g, mats.iris, [irisX, irisY, lensZ - .014], [.25 * irisSize, .33 * irisSize, .065]);
  ball(g, mats.pupil, [irisX + .017, irisY - .003, lensZ + .035], [.13 * irisSize, .219 * irisSize, .038]);
  ball(g, mats.glint ?? mats.white, [irisX + .044, irisY + .024, lensZ + .071], [.038, .048, .014]);
  const width = 1.021, h = 1.014, depth = .565;
  const lid = mesh(g, new T.SphereGeometry(1, 36, 20, 0, TAU, 0, blink), mats.lid, [0, .034, .014]);
  lid.scale.set(width, h, depth);
  const r = Math.sin(blink), y = Math.cos(blink) * h + .034;
  const line = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * i / 16;
    line.push([Math.cos(a) * width * r, y + .015 * Math.sin(a), Math.sin(a) * depth * r + .014]);
  }
  path(g, mats.liner ?? mats.lid, line, .045, 42);
  return g;
}

export function chain(parent, material, curve, count, width, oval = .62) {
  const axis = new T.Vector3(0, 1, 0);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  const matrix = new T.Matrix4();
  for (let i = 0; i < count; i++) {
    const u = curve.closed ? i / count : i / (count - 1);
    a.copy(curve.getTangentAt(u)).normalize();
    b.copy(axis).addScaledVector(a, -axis.dot(a)).normalize();
    b.applyAxisAngle(a, (i % 2 ? .97 : -.16) + .12 * Math.sin(i * 2.3));
    c.crossVectors(a, b).normalize();
    const object = mesh(parent, link, material);
    object.position.copy(curve.getPointAt(u));
    object.quaternion.setFromRotationMatrix(matrix.makeBasis(a, b, c));
    object.scale.set(width, width * oval, width * oval * .84);
  }
}

export function curve(pts, closed = false) {
  return new T.CatmullRomCurve3(pts.map(v), closed, 'catmullrom', .47);
}

export function sneaker(parent, mats, at, yaw, scale = 1) {
  const g = joint(parent, at, [0, yaw, 0]);
  g.scale.setScalar(scale);
  function soleOutline(s, width = 1) {
    s.moveTo(-.181 * width, -.287);
    s.bezierCurveTo(-.095*width,-.348,.13*width,-.356,.193*width,-.273);
    s.bezierCurveTo(.234*width,-.207,.235*width,-.121,.245*width,-.039);
    s.bezierCurveTo(.266*width,.069,.293*width,.205,.289*width,.37);
    s.bezierCurveTo(.290*width,.502,.229*width,.555,.074*width,.563);
    s.bezierCurveTo(-.119*width,.568,-.282*width,.546,-.284*width,.412);
    s.bezierCurveTo(-.288*width,.292,-.262*width,.131,-.231*width,.022);
    s.bezierCurveTo(-.205*width,-.08,-.223*width,-.247,-.181*width,-.287);
    s.closePath();
  }
  shape(g, mats.outsole, (s) => soleOutline(s, 1.015), [0,.091,0], { depth: .073, bevel: .017 }).rotation.x = Math.PI / 2;
  shape(g, mats.sole, soleOutline, [0,.153,0], { depth: .061, bevel: .024 }).rotation.x = Math.PI / 2;
  ball(g, mats.upper, [0, .202, .102], [.289, .183, .444]);
  ball(g, mats.upper, [0, .262, -.096], [.23, .218, .269]);
  ball(g, mats.toe ?? mats.upper, [0, .198, .37], [.248, .117, .168]);
  ball(g, mats.upper, [0, .346, -.084], [.218, .134, .226]);
  const tongue = box(g, mats.upper, [0,.346,.138], [.226,.111,.349], .051);
  tongue.rotation.x = .30;
  box(g, mats.badge, [0, .42, .053], [.145, .039, .085], .016).rotation.x = -.25;
  for (let i = 0; i < 4; i++) {
    const z = .099 + i * .051, y = .406 - i * .016;
    path(g, mats.lace, [[-.114, y - .032, z], [-.034, y + .01, z + .026], [.045, y + .012, z + .031], [.117, y - .028, z + .043]], .012, 10, 7);
  }
  for (const side of [-1, 1]) {
    path(g, mats.badge, [[side * .203, .205, -.24], [side * .261, .231, -.081], [side * .286, .205, .061], [side * .285, .185, .21]], .014, 14, 8);
  }
  return g;
}

// Batch the static parts by material, leaving each whole vinyl and its pedestal free to turn.
export function batch(source) {
  source.updateMatrixWorld(true);
  const buckets = new Map();
  const inverse = new T.Matrix4().copy(source.matrixWorld).invert();
  source.traverse((obj) => {
    if (!obj.isMesh) return;
    const key = obj.material.uuid + (obj.castShadow ? 's' : '') + (obj.receiveShadow ? 'r' : '');
    if (!buckets.has(key)) buckets.set(key, { mat: obj.material, cast: obj.castShadow, receive: obj.receiveShadow, geometries: [] });
    let geo = obj.geometry.clone();
    if (!obj.material.map) geo.deleteAttribute('uv');
    if (!geo.index) {
      const compact = mergeVertices(geo);
      geo.dispose();
      geo = compact;
    }
    geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, obj.matrixWorld));
    buckets.get(key).geometries.push(geo);
  });
  const used = new Set();
  source.traverse((obj) => { if (obj.isMesh && obj.geometry !== sphere && obj.geometry !== link) used.add(obj.geometry); });
  const result = new T.Group();
  for (const { mat, cast, receive, geometries } of buckets.values()) {
    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries);
    if (geometries.length > 1) for (const geo of geometries) geo.dispose();
    if (!merged) continue;
    merged.computeBoundingSphere();
    const surface = mesh(result, merged, mat);
    surface.castShadow = cast;
    surface.receiveShadow = receive;
  }
  for (const geo of used) geo.dispose();
  return result;
}
