import * as T from 'three';
import { ball, batch, box, chain, column, curve, finish, halfEye, joint, limb, path, polygon, ring, rod, shape, shell, sneaker } from './sculpt.js';

const TAU = Math.PI * 2;
const gold = () => finish('#db9a3f', { roughness: .25, metalness: .82, grain: .045 });
const platinum = () => finish('#b3c4c4', { roughness: .28, metalness: .84, grain: .055 });

function charm(g, material, center, points, inset) {
  shape(g, material, (s) => polygon(s, points), center, { depth: .043, bevel: .023 });
  if (inset) {
    shape(g, inset, (s) => polygon(s, points.map(([x, y]) => [x * .7, y * .70])), [center[0], center[1], center[2] + .06], { depth: .009, bevel: .01 });
  }
}

function fist(g, material, at, tilt, side = 1) {
  const hand = joint(g, at, [0, side * -.06, tilt]);
  ball(hand, material, [0, 0, 0], [.202, .116, .121]);
  for (let i = 0; i < 3; i++) {
    const y = .051 - .044 * i;
    limb(hand, material, [[side * .061,y,.060,.047],[side * .17,y - .008,.074,.049],[side * .219,y - .038,.067,.039],[side * .224,y - .060,.057,.006]], 16, 10);
  }
  limb(hand, material, [[-.035 * side,.038,.071,.054],[-.08 * side,.085,.096,.059],[-.151 * side,.063,.09,.015]], 16, 10);
  return hand;
}

export function spongebob() {
  const g = new T.Group();
  const skin = finish('#e3ae37', { roughness: .55, grain: .19 });
  const core = finish('#e6ae37', { roughness: .58, grain: .23, vertexColors: true });
  const lids = finish('#e4ad37', { roughness: .55, grain: .15 });
  const lidLine = finish('#b97e21', { roughness: .58 });
  const brow = finish('#60431e', { roughness: .71 });
  const cheek = finish('#edb349', { roughness: .63 });
  const freckle = finish('#b86930', { roughness: .7 });
  const white = finish('#fff0d6', { roughness: .37 });
  const iris = finish('#458694', { roughness: .34 });
  const pupil = finish('#1a2620', { roughness: .29 });
  const mouth = finish('#482519', { roughness: .84 });
  const lip = finish('#c4862f', { roughness: .58 });
  const tongue = finish('#ad5746', { roughness: .61 });
  const shirt = finish('#e8dec6', { roughness: .68, grain: .15 });
  const cotton = finish('#faf1d9', { roughness: .73, grain: .14 });
  const tie = finish('#9c4031', { roughness: .58 });
  const pants = finish('#533929', { roughness: .76, grain: .28 });
  const topstitch = finish('#795537', { roughness: .72, grain: .19 });
  const rubber = finish('#2a2722', { roughness: .74, grain: .17 });
  const leather = finish('#393e34', { roughness: .51, grain: .16 });
  const toe = finish('#443b2b', { roughness: .55 });
  const chainMat = gold();

  const shoeMats = { upper: leather, toe, sole: shirt, outsole: rubber, badge: topstitch, lace: cotton };
  for (const side of [-1, 1]) {
    const x = .47 * side;
    sneaker(g, shoeMats, [x + .03*side, 0, side < 0 ? .13 : -.02], side * .23, 1.025);
    rod(g, skin, [x + .027*side, .36, .056], [x - .012*side, .97, -.014], .097, .087);
    rod(g, cotton, [x + .022*side, .318, .039], [x + .004*side, .70, .016], .124, .11);
    for (const [y, mat] of [[.531, topstitch], [.579, tie], [.665, shirt]]) {
      ring(g, mat, [x + .012*side, y, .027], .114, .013, true);
    }
    box(g, pants, [x, .846, -.015], [.49, .262, .57], .112);
    box(g, topstitch, [x, .775, -.005], [.479, .093, .56], .044);
  }

  box(g, pants, [0, 1.117, 0], [2.20, .609, .985], .127, 5);
  box(g, topstitch, [0, 1.26, 0], [2.22, .098, 1.003], .046);
  box(g, shirt, [0, 1.473, 0], [2.24, .343, 1.008], .105, 5);
  for (const side of [-1, 1]) {
    const detail = joint(g, [side * .68, 1.099, .489], [0, 0, side * .081]);
    box(detail, topstitch, [0, 0, 0], [.34, .128, .053], .022);
    box(detail, pants, [0, .005, .032], [.297, .049, .014], .007);
    box(g, topstitch, [side * 1.095, 1.06, .048], [.081, .247, .385], .037);
    shape(g, cotton, (s) => polygon(s, [[side * .041, .095], [side * .52, .104], [side * .27, -.128]]), [0, 1.458, .493], { depth: .024, bevel: .019 });
  }
  shape(g, tie, (s) => polygon(s, [[-.102,.094],[.09,.094],[.071,.003],[.114,-.15],[.005,-.231],[-.101,-.15],[-.068,.004]]), [0, 1.42, .528]);
  box(g, topstitch, [0, 1.414, .576], [.143,.104,.043], .021).rotation.z = -.044;

  const pores = [];
  const place = (face, marks) => marks.forEach(([u,y,r,depth]) => pores.push({ face, u, y, r, depth }));
  place('front', [[-.982,.80,.176,.124],[-.93,.429,.092,.063],[.998,.815,.125,.09],[1.064,.376,.084,.05],[-1.089,-.30,.096,.061],[.968,-.432,.148,.105],[-.961,-.63,.143,.119],[-.732,-.91,.11,.068],[.826,-.886,.083,.072],[.493,1.055,.078,.043],[-.14,.965,.102,.067]]);
  place('left', [[.04,.79,.224,.151],[-.27,.32,.143,.09],[.15,.06,.185,.143],[-.028,-.48,.151,.119],[.21,-.83,.106,.063],[-.29,-.774,.078,.05]]);
  place('right', [[-.067,.73,.193,.116],[.16,.371,.139,.07],[-.18,-.065,.16,.105],[.18,-.38,.19,.109],[-.13,-.79,.124,.078]]);
  place('back', [[-.82,.749,.177,.116],[.862,.35,.211,.145],[.496,.789,.091,.072],[-.252,.397,.13,.098],[-.862,-.251,.151,.087],[.16,-.223,.246,.165],[.86,-.741,.17,.123],[-.367,-.746,.144,.10]]);
  shell(g, core, [0, 2.724, 0], [2.64, 2.42, 1.12], .218, pores);

  for (const side of [-1, 1]) {
    const x = side * .405;
    const eyes = halfEye(g, [x, 3.076 + (side === 1 ? -.029 : 0), .541], [.452, .463, .479], side * -.078, {
      white, iris, pupil, lid: lids, liner: lidLine,
    }, { irisX: .18, irisY: -.13, irisSize: 1.07, blink: 1.65 });
    for (let i = 0; i < 3; i++) {
      const x0 = -.47 + i * .468;
      const y = i === 1 ? .905 : .78;
      limb(eyes, brow, [[x0,y,.027,.041],[x0 * 1.17,y + .18,.052,.039],[x0 * 1.28,y + .283,.061,.017],[x0 * 1.29,y + .304,.061,.004]], 17, 9);
    }
    ball(g, cheek, [side * .763, 2.646 + .034*side, .563], [.197, .141, .123], [0, side * -.21, side * .25]);
    for (const [i, dx] of [-.069,.028,.086].entries()) {
      ball(g, freckle, [side * (.775 + dx), 2.666 + .033*side + (i === 1 ? .051 : 0), .671 - .027 * (i === 2)], [.022, .022, .01]);
    }
  }

  shape(g, mouth, (s) => {
    s.moveTo(-.788, .224);
    s.bezierCurveTo(-.55, -.018, -.238, -.052, .016, -.023);
    s.bezierCurveTo(.371, -.014, .647, .072, .791, .298);
    s.bezierCurveTo(.693, -.005, .485, -.281, .053, -.309);
    s.bezierCurveTo(-.348, -.329, -.669, -.137, -.788, .224);
    s.closePath();
  }, [0, 2.426, .554], { depth: .046, bevel: .015 });
  path(g, lip, [[-.755,2.641,.617],[-.55,2.473,.627],[-.15,2.385,.632],[.179,2.416,.635],[.547,2.515,.632],[.755,2.698,.618]], .029, 44);
  path(g, lip, [[-.765,2.626,.573],[-.568,2.337,.575],[-.243,2.152,.575],[.164,2.132,.574],[.510,2.283,.577],[.753,2.642,.578]], .021, 42);
  ball(g, tongue, [.112, 2.20, .577], [.248, .070, .045], [0, 0, .028]);
  for (const side of [-1, 1]) {
    const tooth = box(g, white, [side * .125, 2.354 + .018 * side, .633], [.199, .209, .087], .04, 4);
    tooth.rotation.z = side * -.04;
  }
  limb(g, skin, [[-.020,2.855,.632,.087],[.019,2.787,.782,.108],[.133,2.795,.93,.131],[.253,2.854,1.038,.138],[.302,2.913,1.062,.104],[.333,2.926,1.076,.012]], 44, 22);

  for (const side of [-1, 1]) {
    limb(g, shirt, [[side * .992,1.782,-.002,.105],[side * 1.073,1.652,.039,.179],[side * 1.159,1.511,.169,.177],[side * 1.183,1.463,.20,.138],[side * 1.201,1.449,.215,.010]], 24, 20);
  }
  limb(g, skin, [[1.129,1.55,.157,.105],[1.236,1.384,.293,.097],[1.26,1.208,.469,.112],[1.13,1.235,.625,.123],[.604,1.399,.729,.105],[.058,1.521,.719,.104],[-.464,1.634,.649,.086],[-.574,1.656,.625,.051]], 72);
  limb(g, skin, [[-1.139,1.538,.163,.104],[-1.247,1.351,.319,.094],[-1.225,1.194,.524,.121],[-1.08,1.232,.753,.121],[-.546,1.376,.919,.112],[.052,1.558,.928,.109],[.525,1.681,.806,.093],[.653,1.698,.745,.062]], 72);
  fist(g, skin, [-.627, 1.654, .674], .19, -1);
  const hand = fist(g, skin, [.68, 1.691, .806], -.25, 1);
  box(hand, chainMat, [.147, .033, .124], [.091, .076, .045], .018).rotation.z = -.25;
  const bangle = ring(g, chainMat, [.37, 1.646, .865], .103, .022);
  bangle.rotation.set(-.13, 1.04, -.02);

  const necklace = [];
  for (let i = 0; i < 92; i++) {
    const angle = i * TAU / 92, sn = Math.sin(angle), cs = Math.cos(angle);
    necklace.push([1.278 * Math.sign(sn) * Math.abs(sn) ** .32, 2.174 - .222 * Math.max(0,cs) ** 1.54 + .045 * sn, .649 * Math.sign(cs) * Math.abs(cs) ** .32]);
  }
  chain(g, chainMat, curve(necklace, true), 68, .084, .69);
  ring(g, chainMat, [.038, 1.917, .681], .065, .02);
  charm(g, chainMat, [.043, 1.808, .735], [[0,.115],[.117,.028],[.074,-.101],[-.064,-.116],[-.121,.021]], leather);
  return batch(g);
}

function floralPrint() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 384;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#a3ad58';
  ctx.fillRect(0, 0, c.width, c.height);
  let seed = 14;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }
  for (let i = 0; i < 4400; i++) {
    ctx.fillStyle = i % 2 ? '#666e2c20' : '#f3f29625';
    ctx.fillRect(random() * c.width, random() * c.height, 1 + random() * 2, 1 + random() * 2);
  }
  for (const [x, y, r, turn] of [[67,175,62,.31],[229,350,76,.8],[348,76,71,.2],[483,235,75,3.4],[654,91,62,.2],[777,305,80,1.9],[923,105,78,.9],[1010,314,62,2.6]]) {
    for (const wrap of [-1024, 0, 1024]) {
      ctx.save();
      ctx.translate(x + wrap, y);
      ctx.rotate(turn);
      ctx.scale(r, r);
      ctx.beginPath();
      for (let i = 0; i <= 140; i++) {
        const a = i * TAU / 140;
        const radius = .73 + .25 * Math.cos(5 * a) + .055 * Math.sin(3 * a + 1);
        i ? ctx.lineTo(radius * Math.cos(a), radius * Math.sin(a)) : ctx.moveTo(radius * Math.cos(a), radius * Math.sin(a));
      }
      ctx.closePath();
      ctx.fillStyle = '#785d96'; ctx.fill();
      ctx.strokeStyle = '#9e80bb'; ctx.lineWidth = .031; ctx.stroke();
      ctx.fillStyle = '#aeb366';
      ctx.beginPath(); ctx.ellipse(.07, -.065, .143, .122, 1, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function patrick() {
  const g = new T.Group();
  const flesh = finish('#e99080', { roughness: .56, grain: .21 });
  const belly = finish('#eb9382', { roughness: .59, grain: .21, vertexColors: true });
  const light = finish('#f2a38a', { roughness: .57 });
  const speckle = finish('#bc6c64', { roughness: .7 });
  const dark = finish('#593334', { roughness: .68 });
  const sole = finish('#ebdbbf', { roughness: .65 });
  const topstitch = finish('#c8c783', { roughness: .75, grain: .19 });
  const moss = finish('#818c49', { roughness: .77, grain: .2 });
  const pants = finish('#ffffff', { roughness: .79, grain: .18, map: floralPrint() });
  const rubber = finish('#473c46', { roughness: .64 });
  const grape = finish('#61495a', { roughness: .52, grain: .14 });
  const laces = finish('#f4e9d9', { roughness: .66 });
  const lens = finish('#2b2436', { roughness: .19, metalness: .42, grain: 0 });
  const edge = finish('#392936', { roughness: .37, metalness: .34 });
  const metal = gold();

  for (const side of [-1, 1]) {
    const x = .55 * side;
    sneaker(g, { upper: grape, toe: grape, sole, outsole: rubber, badge: moss, lace: laces }, [x, 0, side * .075], side * .26, 1.14);
    limb(g, flesh, [[x*1.05,.31,.038,.124],[x,.474,.027,.186],[x*.995,.659,.003,.237],[x,.798,-.005,.235]], 29);
    const cuff = joint(g, [x * .96, .55, .005], [0, 0, side * .14]);
    column(cuff, pants, [[-.033,.266,.33],[.02,.334,.395],[.204,.375,.454],[.291,.41,.485]], { rings: 22, detail: 64 });
    const seam = ring(cuff, moss, [0, .005, 0], .338, .018, true);
    seam.scale.y = 1.15;
  }
  column(g, pants, [[.612,.109,.111],[.641,.713,.433],[.691,.977,.593],[.793,1.064,.674],[1.092,1.104,.698],[1.237,1.086,.691],[1.284,1.011,.663]], {
    detail: 120, rings: 45, modify: (p, a, t) => { const a1 = Math.sin(a*18+t*4) * .014; p.x += a1 * Math.sin(a); p.z += a1 * Math.cos(a); },
  });
  column(g, moss, [[1.166,1.071,.694],[1.209,1.111,.721],[1.283,1.128,.732],[1.315,1.121,.730],[1.323,1.080,.707]], { rings: 16 });
  path(g, topstitch, [[-.955,1.242,.375],[-.621,1.242,.603],[0,1.241,.735],[.677,1.239,.59],[.965,1.234,.365]], .012, 35, 8);
  for (const side of [-1, 1]) {
    limb(g, laces, [[0,1.216,.746,.027],[side*.074,1.156,.749,.036],[side*.151,.996 + side * .022,.713,.033],[side*.152,.978 + side*.022,.713,.011]], 24, 11);
  }

  column(g, belly, [[.75,.10,.06],[.95,.85,.53],[1.206,1.039,.675],[1.49,1.116,.741],[1.72,1.06,.705],[1.98,.918,.622],[2.25,.698,.533],[2.49,.558,.464,.026],[2.75,.455,.397,.048],[3.025,.349,.33,.028],[3.271,.235,.239,-.016,-.012],[3.482,.166,.172,-.082,-.025],[3.628,.095,.107,-.157,-.035],[3.713,.027,.044,-.228,-.022],[3.709,.002,.004,-.26,-.018]], {
    rings: 103, detail: 116, modify: (p, a, t, color) => {
      const navel = Math.max(0, 1 - (p.x/.101)**2 - ((p.y-1.405)/.085)**2) ** 1.7;
      if (p.z > .36) p.z -= navel * .06;
      const blush = .038 * Math.pow(Math.abs(Math.sin(a)), 2) + .015 * Math.sin(p.y * 11 + a * 7) * Math.sin(a * 11);
      color.setRGB(1 - blush, 1 - blush * 1.9 - .22*navel, 1 - blush * 1.12 - .14*navel);
    },
  });
  limb(g, flesh, [[-.373,2.227,-.087,.049],[-.545,2.124,-.063,.203],[-.811,1.964,-.031,.259],[-1.028,1.674,.07,.228],[-1.056,1.395,.244,.178],[-.893,1.237,.494,.131],[-.763,1.263,.54,.074],[-.731,1.28,.548,.004]], 52, 22);
  limb(g, flesh, [[.363,2.223,-.095,.051],[.546,2.128,-.09,.203],[.856,1.991,-.075,.253],[1.128,1.772,-.023,.207],[1.22,1.552,.106,.166],[1.16,1.341,.331,.129],[1.064,1.256,.382,.071],[1.009,1.245,.399,.005]], 56, 22);
  ring(g, metal, [1.137, 1.339, .344], .126, .022).rotation.set(1.09, -.23, -.38);
  path(g, metal, [[-.939,1.319,.404],[-.94,1.245,.501],[-.851,1.181,.504],[-.771,1.2,.488]], .021, 24);

  // Oversized glasses with bevelled frames, gold hinges and separate lenses.
  const spectacles = joint(g, [.025, 2.656, .386], [0, -.034, -.09]);
  for (const side of [-1, 1]) {
    const frame = joint(spectacles, [side * .241, 0, 0], [.022, side * .18, side * .034]);
    const glass = (s, m = 1) => {
      s.moveTo(-.215*m,.084*m);
      s.quadraticCurveTo(-.228*m,.139*m,-.165*m,.146*m);
      s.lineTo(.157*m,.146*m); s.quadraticCurveTo(.234*m,.151*m,.219*m,.077*m);
      s.lineTo(.183*m,-.087*m); s.quadraticCurveTo(.172*m,-.134*m,.093*m,-.134*m);
      s.lineTo(-.105*m,-.134*m); s.quadraticCurveTo(-.189*m,-.133*m,-.2*m,-.059*m); s.closePath();
    };
    shape(frame, edge, glass, [0, 0, 0], { depth:.056,bevel:.036 });
    shape(frame, metal, (s) => glass(s,.94), [0, 0, .053], { depth:.018,bevel:.013 });
    shape(frame, lens, (s) => glass(s,.828), [0, 0, .074], { depth:.023,bevel:.02 });
    box(frame, metal, [side*.216,.069,.018], [.071,.07,.103], .02);
    path(spectacles, edge, [[side*.46,.092,.025],[side*.508,.092,-.124],[side*.452,.057,-.30]], .035, 22);
  }
  path(spectacles, metal, [[-.055,.043,.068],[0,.071,.085],[.054,.051,.068]], .03);
  limb(g, speckle, [[-.318,2.857,.27,.011],[-.264,2.932,.33,.042],[-.179,2.96,.347,.045],[-.089,2.93,.37,.014]], 23);
  limb(g, speckle, [[.152,2.904,.367,.011],[.239,2.955,.31,.046],[.324,2.96,.267,.04],[.381,2.916,.222,.005]], 23);
  const smile = joint(g, [0,2.291,.525], [0, -.068, -.036]);
  shape(smile, dark, (s) => {
    s.moveTo(-.388,.107); s.bezierCurveTo(-.212,-.056,.103,-.063,.346,.113);
    s.bezierCurveTo(.285,-.092,.091,-.161,-.123,-.142); s.quadraticCurveTo(-.328,-.113,-.388,.107); s.closePath();
  }, [0,0,0], { depth: .022, bevel: .014 });
  ball(smile, light, [.005,-.095,.021], [.114,.029,.021]);
  for (const side of [-1, 1]) {
    ball(g, light, [side*.373,2.382,.477], [.111,.078,.088]);
    for (let i = 0; i < 3; i++) ball(g, speckle, [side * (.39 + i*.054), 2.381 + (i%2)*.041, .556-i*.023], [.019,.017,.009]);
  }
  for (const [x,y,z,r] of [[-.414,1.719,.683,.021],[-.477,1.67,.659,.015],[-.37,1.65,.702,.013],[.487,1.52,.677,.017],[.541,1.576,.652,.022],[.499,1.603,.669,.013]]) {
    ball(g,speckle,[x,y,z],[r,r,.009]);
  }
  const necklace = [];
  for (let i = 0; i < 64; i++) {
    const a = i * TAU/64, s = Math.sin(a), c = Math.cos(a);
    necklace.push([.79*s, 2.168 - .303*Math.max(0,c) ** 1.56 - .033*s, .58*c + .09*Math.max(0,c)]);
  }
  chain(g, metal, curve(necklace,true), 46, .079, .65);
  ring(g, metal, [.045,1.825,.718], .06, .021);
  const star = Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + i * TAU / 10, r = i % 2 ? .087 : .176;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  charm(g, metal, [.045,1.686,.742], star, grape);
  return batch(g);
}

export function squidward() {
  const g = new T.Group();
  const skin = finish('#70a59e', { roughness: .54, grain: .17 });
  const face = finish('#85b7aa', { roughness: .53, grain: .17, vertexColors: true });
  const lids = finish('#77a99f', { roughness: .59 });
  const line = finish('#457b76', { roughness: .60 });
  const toe = finish('#457773', { roughness: .47 });
  const freckles = finish('#60938b', { roughness: .7 });
  const white = finish('#eddfbb', { roughness: .49 });
  const iris = finish('#ac4935', { roughness: .43 });
  const pupil = finish('#342522', { roughness: .33 });
  const bomber = finish('#615045', { roughness: .73, grain: .24 });
  const collar = finish('#3e3c39', { roughness: .76, grain: .20 });
  const tape = finish('#968276', { roughness: .66, grain: .13 });
  const dark = finish('#252d33', { roughness: .52, grain: .086 });
  const padded = finish('#373e49', { roughness: .68, grain: .14 });
  const silver = platinum();
  const enamel = finish('#8e9ec2', { roughness: .27, metalness: .35 });

  for (const side of [-1,1]) {
    limb(g, skin, [[side*.37,1.28,-.113,.135],[side*.44,.997,-.306,.12],[side*.52,.536,-.437,.116],[side*.652,.225,-.657,.163],[side*.861,.112,-.59,.172],[side*.977,.102,-.447,.099],[side*1.014,.101,-.388,.005]], 47, 19);
    limb(g, skin, [[side*.31,1.292,.097,.144],[side*.467,.92,.213,.137],[side*.41,.535,.329,.104],[side*.463,.254,.416,.12],[side*.604,.141,.544,.175],[side*.817,.132,.64,.164],[side*.911,.141,.703,.086],[side*.953,.143,.73,.006]], 50, 19);
    for (let i = 0; i < 3; i++) {
      ball(g, toe, [side*(.648 + i*.079),.103,.641+i*.034], [.056,.052,.053]);
    }
  }
  column(g, bomber, [[1.103,.027,.03],[1.135,.488,.286],[1.197,.647,.382],[1.323,.682,.382],[1.71,.705,.391],[1.926,.648,.346],[2.073,.564,.293],[2.166,.262,.248],[2.195,.02,.025]], {
    detail: 92, rings: 64, modify: (p, a, t) => {
      const wave = .019 * Math.sin(a*12+t*4) * Math.sin(Math.PI*t);
      p.x += wave * Math.sin(a); p.z += wave * Math.cos(a);
    },
  });
  column(g, collar, [[1.129,.19,.16],[1.158,.601,.352],[1.209,.658,.382],[1.268,.685,.386]], { detail: 80, rings: 18 });
  rod(g, skin, [0,1.999,0], [.005,2.644,.024], .221,.233);
  for (const side of [-1, 1]) {
    limb(g, bomber, [[side*.455,1.986,-.022,.123],[side*.599,1.891,-.017,.219],[side*.716,1.75,.063,.218],[side*.802,1.663,.066,.175],[side*.818,1.638,.065,.101]], 36, 22);
    limb(g, collar, [[side*.746,1.735,.064,.153],[side*.793,1.665,.077,.176],[side*.824,1.622,.079,.147]], 18, 22);
    shape(g, collar, (s) => polygon(s, [[side * .036,.037],[side * .228,.124],[side * .394,.026],[side * .24,-.132]]), [0,2.040,.286], { depth: .043, bevel: .028 });
    path(g, tape, [[side*.142,2.071,.337],[side*.28,1.991,.355],[side*.382,2.043,.316]], .014, 18, 8);
    path(g, tape, [[side*.451,1.365,.295],[side*.552,1.501,.269],[side*.600,1.671,.232]], .016, 23, 8);
  }
  box(g, collar, [0,1.827,.373], [.075,.425,.062], .021);
  for (let i = 0; i < 11; i++) box(g, silver, [i%2 ? -.016 : .016, 1.67 + i*.026, .408], [.031,.015,.014], .005, 2);
  box(g, silver, [0,1.971,.419], [.055,.105,.031], .015).rotation.z = -.236;
  box(g, enamel, [.451,1.815,.304], [.134,.079,.022], .019).rotation.y = -.36;

  limb(g, skin, [[-.778,1.708,.076,.087],[-.929,1.491,.173,.087],[-.941,1.285,.286,.094],[-.767,1.245,.404,.108],[-.403,1.332,.535,.091],[.02,1.458,.589,.087],[.289,1.498,.494,.052]], 57);
  limb(g, skin, [[.777,1.697,.089,.092],[.934,1.445,.155,.089],[.878,1.257,.327,.103],[.706,1.273,.541,.104],[.393,1.353,.638,.103],[-.085,1.389,.666,.091],[-.346,1.456,.572,.055]], 55);
  fist(g, skin, [.311,1.49,.517], -.29, 1);
  const hand = fist(g, skin, [-.396,1.45,.592], .12, -1);
  box(hand, silver, [-.12,.022,.121], [.086,.069,.042], .017);

  column(g, face, [[2.06,.01,.04],[2.20,.212,.23],[2.426,.284,.292],[2.603,.385,.338],[2.778,.522,.432],[2.983,.637,.527],[3.222,.798,.630],[3.466,.943,.708],[3.676,.93,.712],[3.859,.754,.620],[4.008,.488,.44],[4.09,.226,.267],[4.118,.005,.008]], {
    detail: 120, rings: 98, modify: (p, a, t, color) => {
      p.x += .024*Math.sin(p.y*4.16+a)*Math.sin(a);
      p.z += .014*Math.sin(p.y*14.2+a*7);
      const n = Math.sin(t*38+a*3)*Math.sin(a*9)*.018;
      color.setRGB(1 + n, 1 + n, 1 + n);
    },
  });
  for (const [x,y,z,r] of [[-.66,3.59,.518,.039],[-.535,3.635,.587,.046],[-.464,3.506,.621,.025],[-.35,3.68,.653,.032],[-.267,3.56,.679,.024],[.494,3.59,.604,.036],[.626,3.516,.528,.032],[.389,3.686,.648,.031]]) {
    ball(g, freckles, [x,y,z],[r,r*.86,.013], [0,x*.49,0]);
  }
  for (const side of [-1, 1]) {
    halfEye(g, [side * .255, 3.121 + .008*side, .495], [.288,.379,.345], side * .087, { white, iris, pupil, lid: lids, liner: line }, { irisX: .10, irisY: -.14, blink: 1.57, irisSize: .95 });
    limb(g, line, [[side*.089,3.381,.61,.016],[side*.216,3.436,.619,.044],[side*.389,3.47,.596,.067],[side*.538,3.437,.538,.04],[side*.56,3.419,.522,.007]], 34);
  }
  limb(g, skin, [[.005,3.089,.526,.102],[.019,2.933,.672,.131],[.036,2.766,.796,.154],[.064,2.604,.961,.177],[.079,2.444,.99,.198],[.066,2.355,.977,.147],[.052,2.293,.977,.025]], 61, 24);
  limb(g, line, [[-.367,2.43,.297,.009],[-.222,2.499,.355,.021],[.0,2.527,.366,.023],[.231,2.48,.34,.024],[.344,2.404,.304,.005]], 34);

  chain(g, silver, curve([[-.573,2.069,.169],[-.514,1.938,.307],[-.319,1.856,.421],[0,1.774,.47],[.319,1.854,.42],[.507,1.958,.294],[.563,2.062,.177]]), 24, .059, .65);
  ring(g,silver,[.029,1.733,.481],.045,.016);
  charm(g, silver, [.028,1.654,.486], [[0,.12],[.095,.012],[0,-.105],[-.095,.016]], enamel);

  // Cup details and the padded headband sit on the sides of the sculpt, not on a flat decal.
  path(g, dark, [[-.975,3.418,-.057],[-.974,3.710,-.077],[-.763,4.009,-.089],[-.411,4.163,-.091],[0,4.208,-.092],[.423,4.16,-.087],[.772,4.01,-.072],[.988,3.71,-.053],[.978,3.398,-.031]], .065, 80, 13);
  path(g, padded, [[-.834,3.888,-.082],[-.643,4.067,-.08],[-.326,4.174,-.068],[0,4.193,-.066],[.328,4.167,-.065],[.674,4.068,-.065],[.871,3.881,-.055]], .075, 65, 13);
  for (const side of [-1,1]) {
    const pad = joint(g, [side*.907,3.385,-.026], [0,0,side*.128]);
    ball(pad, padded, [0,0,0], [.165,.289,.237]);
    ball(pad, dark, [side*.105,0,0], [.146,.272,.224]);
    ball(pad, silver, [side*.196,0,0], [.072,.201,.171]);
    ball(pad, dark, [side*.239,0,0], [.05,.177,.148]);
    const logo = ring(pad, enamel, [side*.286,0,0], .081,.013);
    logo.rotation.y = Math.PI / 2;
    path(pad, silver, [[side*.065,.129,.175],[side*.109,.218,.094],[side*.107,.29,-.022]], .027, 20);
  }
  return batch(g);
}

export const characterMakers = [spongebob, patrick, squidward];
