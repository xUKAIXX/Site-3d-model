import * as T from 'three';
import { ball, box, column, curve, finish, joint, mesh, path, polygon, ring, shape } from './sculpt.js';

const TAU = Math.PI * 2;

export const leather = (color, roughness = .7) => finish(color, { roughness, grain: .27, surface: 'leather' });
export const fabric = (color, grain = .24) => finish(color, { roughness: .78, grain, surface: 'canvas' });
export const warmGold = () => finish('#cd913c', { roughness: .288, metalness: .89, surface: 'metal', grain: .12 });
export const silver = () => finish('#b2c4ca', { roughness: .264, metalness: .92, surface: 'metal', grain: .1 });

export function seams(parent, material, pts, count, r = .008) {
  const route = curve(pts);
  for (let i = 0; i < count; i++) {
    const p = route.getPointAt(i / count);
    const q = route.getPointAt((i + .53) / count);
    path(parent, material, [p.toArray(), q.toArray()], r, 2, 5);
  }
}

export function cubanCharm(parent, metal, inset, at, outline, size = 1) {
  const g = joint(parent, at);
  g.scale.setScalar(size);
  shape(g, metal, (s) => polygon(s, outline), [0, 0, 0], { depth: .03, bevel: .025 });
  shape(g, inset, (s) => polygon(s, outline.map(([x, y]) => [.72*x,.72*y])), [0,0,.054], { depth: .014, bevel: .007 });
  for (const [x,y] of outline) ball(g, metal, [.90*x,.90*y,.058], [.015,.015,.011]);
  return g;
}

export function rosette(parent, material, at, radius, inner = .39, depth = .02, points = 4) {
  const verts = Array.from({ length: points * 2 }, (_, i) => {
    const t = Math.PI/2 + i * Math.PI / points, r = i % 2 ? radius * inner : radius;
    return [r * Math.cos(t), r * Math.sin(t)];
  });
  return shape(parent, material, (s) => polygon(s, verts), at, { depth, bevel: depth*.34 });
}

export function squareCloth(parent, material, profile, power = .60, wave = .022) {
  return column(parent, material, profile, { detail: 128, rings: 49, modify(p, a, t) {
    const x = Math.sin(a), z = Math.cos(a);
    const drape = Math.sin(a*11+t*5) * Math.sin(Math.PI*t)**.7 * wave;
    p.x = (p.x / Math.max(.0001,Math.abs(x))) * Math.abs(x)**power + Math.sin(a)*drape;
    p.z = (p.z / Math.max(.0001,Math.abs(z))) * Math.abs(z)**power + Math.cos(a)*drape;
  }});
}

export function ribKnit(parent, material, at, profile, { ribs=32, height=1, yaw=0, tilt=0 } = {}) {
  const g = joint(parent,at,[tilt,yaw,0]);
  g.scale.y = height;
  column(g,material,profile,{detail:ribs*4,rings:18,modify(p,a,t){
    const rib = (.5+.5*Math.cos(ribs*a))**1.5*.008;
    const fade = Math.min(t*7,1,(1-t)*7);
    p.x += rib*fade*Math.sin(a); p.z += rib*fade*Math.cos(a);
  }});
  return g;
}

function soleOutline(s, length=1) {
  s.moveTo(-.158,-.291);
  s.bezierCurveTo(-.084,-.348,.123,-.348,.202,-.286);
  s.bezierCurveTo(.255,-.221,.24,-.119,.258,-.019);
  s.bezierCurveTo(.278,.103,.325,.267,.307,.435*length);
  s.bezierCurveTo(.295,.575*length,.218,.624*length,.052,.622*length);
  s.bezierCurveTo(-.133,.625*length,-.299,.585*length,-.303,.452*length);
  s.bezierCurveTo(-.322,.281,-.269,.107,-.242,-.023);
  s.bezierCurveTo(-.218,-.108,-.239,-.252,-.158,-.291);
  s.closePath();
}

// A toe-to-heel loft, layered sole, embroidered quarters and laced tongue.
export function trainer(parent, mats, at, angle, scale = 1, highTop = false) {
  const g = joint(parent,at,[0,angle,0]);
  g.scale.setScalar(scale);
  for (const [top,thickness,mat,bevel] of [[.072,.06,mats.outsole,.011],[.154,.080,mats.sole,.022]]) {
    shape(g,mat,soleOutline,[0,top,0],{depth:thickness,bevel}).rotation.x=Math.PI/2;
  }
  const boot = joint(g,[0,0,0],[Math.PI/2,0,0]);
  const hi = highTop ? .036 : 0;
  column(boot,mats.upper,[[-.33,.02,.028,0,-.233],[-.30,.183,.086,0,-.240],[-.222,.231,.14+hi,.006,-.284-hi*.6],[-.107,.243,.168+hi,.014,-.293-hi*.82],[.020,.260,.155+hi,.015,-.286-hi*.5],[.167,.290,.142,.005,-.269],[.317,.297,.108,-.003,-.232],[.456,.283,.083,-.009,-.209],[.550,.213,.056,-.006,-.188],[.585,.024,.021,-.010,-.181]],{detail:64,rings:46});
  const cap = joint(g,[0,0,0],[Math.PI/2,0,0]);
  column(cap,mats.toe,[ [.325,.293,.101,-.008,-.228],[.393,.295,.095,-.011,-.221],[.469,.279,.085,-.014,-.212],[.537,.240,.068,-.013,-.197],[.588,.127,.042,-.009,-.187],[.608,.003,.003,-.006,-.177] ],{detail:64,rings:28});
  const tongue = box(g,mats.tongue,[0,.411+hi*.88,.121],[.185,.063,.383],.044,4);
  tongue.rotation.x=.36;
  for(let i=0;i<5;i++) {
    const z=.012 + i*.058, close=1-i*.041;
    const y=[.453,.444,.427,.405,.377][i]+hi*(1-i*.13);
    for (const side of [-1,1]) ball(g,mats.hardware,[side*.130*close,y-.021,z+.026],[.019,.014,.019]);
    path(g,mats.lace,[[-.126*close,y-.017,z+.007],[-.06,y+.002,z+.035],[.048,y-.003,z+.035],[.125*close,y-.024,z+.020]],.012,13,8);
  }
  path(g,mats.lace,[[-.114,.445+hi,-.017],[-.065,.489+hi,-.046],[-.02,.478+hi,-.020],[.010,.461+hi,.017],[.081,.479+hi,-.006],[.113,.462+hi,-.039]],.011,20,7);
  for(const side of [-1,1]) {
    const route = [[side*.200,.252,-.269],[side*.246,.307,-.148],[side*.272,.294,.048],[side*.289,.243,.232],[side*.266,.215,.371]];
    path(g,mats.trim,route,.020,33,8);
    seams(g,mats.stitch,route.map(([x,y,z])=>[x+side*.007,y+.021,z]),17,.0045);
    const stripe = joint(g,[side*.249,.291,-.068],[0,side*(Math.PI/2-.05),.08*side]);
    rosette(stripe,mats.trim,[0,.010,.009],.069,.47,.0035);
  }
  // Reinforced heel pull tab, raised double stripe and embossed heel plate.
  path(g,mats.trim,[[-.037,.35+hi,-.287],[-.045,.481+hi,-.291],[0,.506+hi,-.279],[.042,.478+hi,-.277],[.041,.359+hi,-.294]],.019,24,8);
  const heel = box(g,mats.toe,[0,.213,-.316],[.193,.087,.030],.014);
  heel.rotation.x = -.19;
  return g;
}

export function eye(parent, at, scale, rotation, mats, { gaze=.12, lidEnd=1.67, lean=.05, irisScale=1 } = {}) {
  const g = joint(parent, at, rotation);
  g.scale.set(...scale);
  ball(g,mats.white,[0,0,0],[.995,1,.475]);
  const irisY=-.14;
  const base = Math.sqrt(1-gaze*gaze-irisY*irisY)*.475;
  const pos=[], color=[], indices=[];
  const dark = new T.Color(mats.limbal ?? '#172b27'), ringColor = new T.Color(mats.iris), fleck = new T.Color(mats.irisFleck ?? '#96c392');
  const shade = new T.Color();
  const radial=[.001,.34,.49,.61,.75,.88,.95,1], n=64;
  for (const [j,r] of radial.entries()) for(let i=0;i<n;i++) {
    const a=i/n*TAU, dx=Math.cos(a)*r*.285*irisScale, dy=Math.sin(a)*r*.366*irisScale;
    pos.push(gaze+dx, irisY+dy, base+.034-.038*r*r+.019*dy-.025*dx*gaze);
    const stripe = (.5 + .5*Math.sin(a*29+3*r+.68*Math.sin(a*17)))*(.74+.26*Math.cos(a*43-2.45*r));
    shade.copy(ringColor).lerp(fleck,stripe*.53);
    if (r>.86) shade.lerp(dark, (r-.86)/.14*.94);
    if (r<.46) shade.lerp(dark, (.46-r)*1.34);
    color.push(shade.r,shade.g,shade.b);
    if (j<radial.length-1) {
      const k = j*n+i, next=j*n+(i+1)%n;
      indices.push(k,k+n,next,next,k+n,next+n);
    }
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  geometry.setAttribute('color',new T.Float32BufferAttribute(color,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  mesh(g,geometry,mats.irisSurface).castShadow=false;
  ball(g,mats.pupil,[gaze+.013,irisY+.018,base+.03],[.128*irisScale,.212*irisScale,.044]);
  ball(g,mats.glint,[gaze+.056,irisY+.048,base+.068],[.044,.050,.015]);
  const cup=new T.SphereGeometry(1,48,26,0,TAU,0,lidEnd);
  const p=cup.attributes.position;
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    p.setXYZ(i,x*1.030,y*1.019+.023+lean*x*(1-Math.max(0,y)),z*.576+.011);
  }
  cup.computeVertexNormals();
  mesh(g,cup,mats.lid);
  const outer=[];
  for(let i=0;i<=18;i++){
    const a=i/18*Math.PI,x=Math.cos(a)*Math.sin(lidEnd);
    outer.push([x*1.026,Math.cos(lidEnd)*1.019+.023+lean*x+.008*Math.sin(a),.012+Math.sin(a)*Math.sin(lidEnd)*.581]);
  }
  path(g,mats.liner,outer,.044,44,12);
  return g;
}

export function engravedCanvas() {
  const c=document.createElement('canvas'); c.width=1152;c.height=416;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#9ba34e';ctx.fillRect(0,0,c.width,c.height);
  const shade=ctx.createLinearGradient(0,0,0,c.height);
  shade.addColorStop(0,'#a9ab61');shade.addColorStop(.65,'#858d4a');shade.addColorStop(1,'#797e44');
  ctx.fillStyle=shade;ctx.fillRect(0,0,c.width,c.height);
  let seed=214;
  const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<11200;i++) {
    ctx.fillStyle=i%2?'#3e45262b':'#e4dba734';
    ctx.fillRect(next()*c.width,next()*c.height,.8+2*next(),1+2*next());
  }
  for(const [x,y,r,turn] of [[65,164,75,.25],[234,373,77,.8],[345,77,72,.26],[488,248,71,3.4],[658,92,76,.23],[783,332,83,1.9],[929,132,77,.9],[1061,286,59,2.6]]) {
    for(const wrap of [-c.width,0,c.width]) {
      ctx.save(); ctx.translate(x+wrap,y);ctx.rotate(turn);ctx.scale(r,r);
      ctx.beginPath();
      for(let i=0;i<=130;i++){
        const a=i/130*TAU, d=.73+.268*Math.cos(a*5)+.052*Math.sin(a*3+1);
        i?ctx.lineTo(d*Math.cos(a),d*Math.sin(a)):ctx.moveTo(d*Math.cos(a),d*Math.sin(a));
      }
      ctx.closePath();ctx.fillStyle='#776387';ctx.fill();ctx.strokeStyle='#aa95b4';ctx.lineWidth=.036;ctx.stroke();
      ctx.save();ctx.clip();
      ctx.fillStyle='#443c5e30';
      for(let j=0;j<26;j++)ctx.fillRect(-1.1,-.99+j*.078,2.2,.023);
      ctx.restore();ctx.fillStyle='#b8b379';ctx.beginPath();ctx.ellipse(.039,-.016,.16,.133,.6,0,TAU);ctx.fill();
      ctx.restore();
    }
  }
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
  return tex;
}
