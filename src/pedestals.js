import * as T from 'three';
import { batch, box, column, finish, lathe, mesh, ring } from './sculpt.js';

const TAU = Math.PI * 2;

function plate(group, index, color, edge, height, front, width = .48) {
  box(group, edge, [0, height, front - .017], [width + .04, .231, .069], .037);
  const c = document.createElement('canvas');
  c.width = 320; c.height = 140;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#172525'; ctx.fillRect(0, 0, 320, 140);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.strokeRect(7,7,306,126);
  ctx.fillStyle = color;
  ctx.font = 'bold 61px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`0${index+1}`, 26, 74);
  ctx.font = 'bold 20px monospace'; ctx.fillText('BOTTOM', 139, 55); ctx.fillText('DROP', 139, 83);
  ctx.globalAlpha = .72;
  for (const [i, w] of [3,1,3,5,2,1,4,2].entries()) ctx.fillRect(259 + i * 5, 41, w, 53);
  const texture = new T.CanvasTexture(c);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  mesh(group, new T.PlaneGeometry(width - .017,.190), finish('#fff', { roughness: .72, grain: 0, map: texture }), [0,height,front + .019]).castShadow = false;
}

function kelp() {
  const g = new T.Group();
  const glaze = finish('#235545', { roughness: .54, metalness: .11, grain: .28, vertexColors: true });
  const cap = finish('#426856', { roughness: .52, metalness: .08, grain: .31 });
  const lower = finish('#2c4840', { roughness: .52, metalness: .18, grain: .24 });
  const seam = finish('#548c75', { roughness: .4, metalness: .35, grain: .1 });
  const grooved = finish('#273e34', { roughness: .67, metalness: .09, grain: .13 });
  lathe(g, lower, [[0,.026],[1.476,.026],[1.534,.034],[1.57,.059],[1.575,.106],[1.551,.145],[1.512,.157],[0,.157]]);
  column(g, glaze, [[.127,1.453],[.147,1.499],[.193,1.492],[.491,1.469],[.756,1.472],[.808,1.488],[.846,1.461]], {
    detail: 408, rings: 33,
    modify: (p,a,t,c) => {
      const rib = (.5 + .5 * Math.cos(a * 34 + .026 * Math.sin(t*4))) ** 1.71;
      const fade = Math.min(1, t * 9, (1-t)*9);
      const r = .105 * fade * (rib - .35);
      const wet = Math.sin(a*13.7+t*9) * Math.sin(a*23.8-t*29) * .055;
      p.x += r * Math.sin(a); p.z += r * Math.cos(a);
      c.setRGB(.89 + rib*.14 + wet, .89 + rib*.15 + wet, .89 + rib*.13 + wet);
    },
  });
  ring(g, seam, [0,.156,0], 1.515, .012, true);
  lathe(g, lower, [[0,.782],[1.471,.782],[1.527,.798],[1.548,.824],[1.548,.866],[1.516,.883],[0,.883]]);
  lathe(g, cap, [[0,.855],[1.512,.855],[1.56,.864],[1.599,.887],[1.609,.91],[1.607,.947],[1.583,.974],[1.535,.987],[0,.987]]);
  ring(g, seam, [0,.907,0], 1.605, .012, true);
  ring(g, grooved, [0,.99,0], 1.51, .005, true).castShadow = false;
  plate(g, 0, '#a6c9b3', lower, .49, 1.538);
  return { height: .985, root: batch(g) };
}

function coral() {
  const g = new T.Group();
  const rock = finish('#996d5d', { roughness: .89, grain: .49, vertexColors: true });
  const copper = finish('#9f745e', { roughness: .38, metalness: .41, grain: .17 });
  const slab = finish('#bd947d', { roughness: .62, metalness: .03, grain: .35 });
  const rim = finish('#ad806c', { roughness: .55, metalness: .14, grain: .31 });
  column(g, rock, [[.024,.052,.058],[.032,1.23,.99],[.065,1.5,1.294],[.161,1.622,1.331],[.276,1.594,1.331],[.393,1.548,1.307],[.461,1.404,1.185],[.487,.067,.067]], {
    detail: 196, rings: 69,
    modify: (p,a,t,c) => {
      const off = (Math.sin(a*3+2.2)*.044 + Math.sin(a*7+.8)*.056 + Math.sin(a*13+t*8)*.021 + Math.sin(a*19-t*25)*.016 + Math.sin(a*47+t*87)*.012 + Math.sin(a*63-t*59)*.009) * Math.sin(Math.PI*t) ** .35;
      p.x += off * Math.sin(a) * 1.47; p.z += off * Math.cos(a);
      p.y += (Math.sin(a*11) * .018 + Math.sin(a*19+t*61)*.015 + off*.3) * Math.sin(Math.PI*t);
      const band = Math.sin(p.y*37+a*2+1) * .089 + off * 1.3;
      c.setRGB(.91+band,.90+band,.895+band);
    },
  });
  lathe(g, rim, [[0,.452],[1.24,.452],[1.299,.477],[1.329,.509],[1.329,.553],[1.286,.568],[0,.568]]);
  lathe(g, slab, [[0,.517],[1.306,.517],[1.366,.541],[1.402,.576],[1.436,.638],[1.435,.800],[1.401,.852],[1.342,.874],[0,.874]]);
  ring(g, copper, [0,.636,0], 1.43, .014, true);
  ring(g, rim, [0,.877,0], 1.32, .005, true).castShadow = false;
  plate(g, 1, '#e8bd9e', copper, .741, 1.444, .420);
  return { height: .873, root: batch(g) };
}

function ink() {
  const g = new T.Group();
  const violet = finish('#454e66', { roughness: .65, metalness: .18, grain: .27, vertexColors: true });
  const dark = finish('#2f3948', { roughness: .55, metalness: .23, grain: .27 });
  const cap = finish('#657b94', { roughness: .48, metalness: .18, grain: .15 });
  const chrome = finish('#7591a2', { roughness: .3, metalness: .69, grain: .09 });
  lathe(g, dark, [[0,.026],[1.418,.026],[1.477,.058],[1.508,.113],[1.48,.178],[1.414,.224],[0,.224]], 16).rotation.y = Math.PI / 16;
  lathe(g, cap, [[0,.184],[1.387,.184],[1.431,.198],[1.458,.226],[1.411,.259],[0,.259]], 16).rotation.y = Math.PI / 16;
  column(g, violet, [[.238,1.326],[.262,1.375],[.477,1.367],[.747,1.393],[.801,1.394],[.835,1.323]], {
    detail: 320, rings: 44,
    modify: (p,a,t,c) => {
      const stripe = (.5 + .5 * Math.cos(a*24 + t * 2.3)) ** 2;
      const off = .093 * (stripe - .33) * Math.min(t*6,1,(1-t)*6);
      p.x += off*Math.sin(a); p.z += off*Math.cos(a);
      c.setRGB(.81 + .21*stripe,.83 + .20*stripe,.86 + .18*stripe);
    },
  });
  lathe(g, dark, [[0,.781],[1.352,.781],[1.423,.804],[1.443,.847],[1.435,.874],[0,.874]]);
  lathe(g, cap, [[0,.862],[1.411,.862],[1.482,.881],[1.508,.915],[1.504,.954],[1.465,.978],[1.412,.988],[0,.988]]);
  ring(g, chrome, [0,.897,0], 1.493,.012,true);
  ring(g, dark, [0,.992,0], 1.39,.006,true).castShadow = false;
  plate(g, 2, '#aec9de', dark, .571, 1.441);
  return { height: .987, root: batch(g) };
}

const contactTexture = (() => {
  let texture;
  return () => {
    if (texture) return texture;
    const el = document.createElement('canvas'); el.width = 128; el.height = 128;
    const ctx = el.getContext('2d');
    const spot = ctx.createRadialGradient(64,64,14,64,64,64);
    spot.addColorStop(0,'rgba(0,0,0,0.93)');
    spot.addColorStop(.38,'rgba(0,0,0,0.78)');
    spot.addColorStop(.65,'rgba(0,0,0,0.33)');
    spot.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle = spot; ctx.fillRect(0,0,128,128);
    texture = new T.CanvasTexture(el);
    return texture;
  };
})();

export function floorShadow() {
  const ground = new T.Mesh(new T.PlaneGeometry(5.55, 4.55), new T.MeshBasicMaterial({
    map: contactTexture(), opacity: .88, transparent: true, depthWrite: false, toneMapped: false,
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-.21, .018, .035);
  return ground;
}

export const pedestalMakers = [kelp, coral, ink];
