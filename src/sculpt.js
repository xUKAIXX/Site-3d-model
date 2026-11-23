import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const sphere = new T.SphereGeometry(1, 32, 24);
const link = (() => {
  const points = [];
  for (let i = 0; i < 24; i++) {
    const a = i * TAU / 24;
    const soften = (v) => Math.sign(v) * Math.abs(v) ** .77;
    points.push(new T.Vector3(soften(Math.cos(a)), soften(Math.sin(a)), .15 * Math.sin(2 * a)));
  }
  const outline = new T.CatmullRomCurve3(points, true);
  const geometry = new T.TubeGeometry(outline, 36, .23, 10, true);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, T.MathUtils.clamp(p.getZ(i), -.27, .27) * .82);
  geometry.computeVertexNormals();
  return geometry;
})();
const clamp = T.MathUtils.clamp;
const v = (p) => new T.Vector3(p[0], p[1], p[2]);

const surfaces = {
  clay: [0, .0016, 47],
  glazed: [0, .0012, 58],
  canvas: [1, .0017, 115],
  ribbed: [1, .00265, 79],
  leather: [0, .0023, 108],
  metal: [2, .0017, 150],
};

export function finish(hex, { roughness = .54, metalness = 0, grain = .1, vertexColors = false, map = null, surface, coat = 0 } = {}) {
  const parameters = { color: hex, roughness, metalness, vertexColors, map };
  const material = coat ? new T.MeshPhysicalMaterial({ ...parameters, clearcoat: coat, clearcoatRoughness: .26 }) : new T.MeshStandardMaterial(parameters);
  if (grain || surface) {
    const settings = surfaces[surface] ?? [0, 0, 58];
    material.onBeforeCompile = (shader) => {
      shader.uniforms.sculptGrain = { value: grain };
      shader.uniforms.sculptFinish = { value: new T.Vector3(...settings) };
      shader.vertexShader = 'varying vec3 vSculpt;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>', '#include <begin_vertex>\nvSculpt = position;',
      );
      shader.fragmentShader = `
        varying vec3 vSculpt;
        uniform float sculptGrain;
        uniform vec3 sculptFinish;
      ` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 speck = fract(floor(vSculpt * 293.0) * .1031);
        speck += dot(speck, speck.yzx + 33.33);
        float grainSample = fract((speck.x + speck.y) * speck.z) - .5;
        float tooth = sin(vSculpt.x * 53.1 + sin(vSculpt.z * 22.5)) * sin(vSculpt.y * 61.2 - vSculpt.z * 38.5);
        float antialias = 1.0 / (1.0 + length(fwidth(vSculpt)) * sculptFinish.z * .84);
        vec3 grid = vSculpt * sculptFinish.z;
        float grainWave = sin(grid.x + sin(grid.y * .89 + grid.z * .35)) * sin(grid.y + cos(grid.z * 1.08)) * cos(grid.z * .96 + grid.x * .57);
        float canvasWeave = sin(grid.y + .7 * sin(grid.x * 1.25 + grid.z)) * cos(grid.x * .96 - grid.z * .83);
        float machining = sin(grid.y * 1.41 + sin(grid.x * .032)) * .36 + tooth * .26;
        float relief = sculptFinish.x > 1.5 ? machining : (sculptFinish.x > .5 ? canvasWeave : grainWave);
        diffuseColor.rgb *= 1.0 + sculptGrain * (grainSample * antialias + tooth * .096 + relief * .19 * antialias);`
      ).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + relief * .05 * antialias * min(1.0, sculptFinish.y * 600.0), .04, 1.0);`
      ).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (sculptFinish.y > 0.0) {
          vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
          vec3 r1 = cross(dy, normal), r2 = cross(normal, dx);
          float det = dot(dx, r1) * faceDirection;
          float bump = relief * sculptFinish.y * antialias;
          vec3 grad = sign(det) * (dFdx(bump) * r1 + dFdy(bump) * r2);
          normal = normalize(max(abs(det), 0.00000001) * normal - grad);
        }`
      );
    };
    material.customProgramCacheKey = () => 'sculpt-finish-v2';
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
