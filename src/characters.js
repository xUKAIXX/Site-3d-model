import { Group } from 'three';
import { ball, batch, box, chain, column, curve, finish, joint, lathe, limb, mesh, path, polygon, ring, rod, shape } from './sculpt.js';
import { cubanCharm, engravedCanvas, eye, fabric, leather, ribKnit, rosette, seams, silver, squareCloth, trainer, warmGold } from './wardrobe.js';

const TAU = Math.PI * 2;
const skinMaterial = (hex, roughness = .54) => finish(hex, { roughness, grain: .22, surface: 'clay', vertexColors: true });

function eyeMats({ lid, line, iris, fleck, limbal, white = '#f6ead2' }) {
  return {
    lid: finish(lid,{ roughness: .52, surface:'clay', grain:.14 }),
    liner: finish(line,{ roughness:.57, surface:'clay' }),
    white: finish(white,{ roughness:.34, coat:.13, surface:'glazed',grain:.04 }),
    irisSurface: finish('#fff',{ roughness:.31,coat:.23,vertexColors:true,grain:0 }),
    pupil: finish('#141b1a',{ roughness:.16, coat:.43, grain:0 }),
    glint: finish('#fdf6e6',{ roughness:.15, grain:0 }),
    iris, irisFleck: fleck, limbal,
  };
}

function quartz(parent, metal, inset, at) {
  const pendant = cubanCharm(parent, metal, inset, at,
    [[0,.147],[.132,.069],[.106,-.101],[0,-.153],[-.108,-.098],[-.133,.066]]);
  pendant.rotation.z=-.129;
  rosette(pendant,metal,[0,-.004,.072],.061,.38,.012);
  return pendant;
}

export function spongebob(carving) {
  const g = new Group();
  const skin = skinMaterial('#dba849',.61);
  const enamel = finish('#344238',{ roughness:.39, coat:.24, surface:'glazed' });
  const gilt = warmGold();
  const oldGold = finish('#8b6234',{ roughness:.35, metalness:.75,surface:'metal' });
  const tobacco = fabric('#4d3428');
  const welt = fabric('#79533a');
  const seam = fabric('#c49460');
  const tee = fabric('#d9ceba');
  const cotton = finish('#ebe2c9',{ roughness:.79, surface:'ribbed', grain:.22 });
  const creamy = fabric('#ede4cc');
  const shade = fabric('#aa9e85');
  const brick = fabric('#903d30');
  const rose = finish('#9e5644',{ roughness:.55, surface:'glazed' });
  const tooth = finish('#faf0d8',{ roughness:.37, coat:.12, grain:.07 });
  const lash = finish('#654424',{ roughness:.69,grain:.14 });
  const eyes = eyeMats({ lid:'#dba745', line:'#ad772f', iris:'#396f82', fleck:'#87b6ad', limbal:'#233944' });
  const boot = leather('#2e332c');
  const bootTrim = leather('#62513a');
  const cap = leather('#424034');
  const outsole = leather('#211f1a');
  const midsole = finish('#d0c1a6',{ roughness:.79, surface:'leather',grain:.29 });

  mesh(g,carving,skin);
  for (const side of [-1,1]) {
    const x=side*.482;
    const shoeZ=side<0?.127:-.094;
    trainer(g,{upper:boot,toe:cap,sole:midsole,outsole,trim:bootTrim,tongue:boot,stitch:seam,lace:creamy,hardware:oldGold},[x,0,shoeZ],side*.229,1.035);
    rod(g,finish('#c8953d',{roughness:.55,surface:'clay'}),[x,.359,shoeZ+.011],[x*.973,.944,shoeZ-.062],.080,.074);
    const sock = ribKnit(g,cotton,[x,.347,shoeZ],[[0,.118],[.054,.121],[.212,.117],[.399,.102],[.441,.104]],{ ribs:26, tilt:side*.039-.095 });
    for (const [h, mat, wire] of [[.232,brick,.0095],[.283,welt,.0085],[.399,creamy,.009]]) ring(sock,mat,[0,h,0],h>.35?.105:.117,wire,true);
    const cuff = joint(g,[x,.785,shoeZ*.47],[0,side*.062,side*.092]);
    squareCloth(cuff,tobacco,[[0,.111,.113],[.034,.229,.256],[.093,.270,.275],[.179,.287,.289],[.239,.268,.266]],.68,.01);
    squareCloth(cuff,welt,[[.026,.219,.25],[.04,.239,.265],[.062,.251,.272],[.087,.253,.274]],.68,.002);
  }

  // The chinos have separately sculpted hems, tapered sides, pocket welts and topstitching.
  squareCloth(g,tobacco,[[.842,.040,.03],[.866,.765,.379],[.906,.965,.46],[1.026,1.025,.514],[1.186,1.043,.506],[1.307,1.038,.49],[1.376,1.029,.493],[1.396,1.015,.457],[1.409,.032,.038]], .52,.018);
  squareCloth(g,welt,[[1.277,1.036,.50],[1.296,1.053,.513],[1.370,1.054,.515],[1.399,1.020,.486]],.52,.004);
  squareCloth(g,tee,[[1.397,.968,.45],[1.410,1.035,.502],[1.443,1.058,.512],[1.534,1.049,.515],[1.628,1.036,.493],[1.664,.904,.416]],.55,.012);
  for (const side of [-1,1]) {
    const pocket=joint(g,[side*.635,1.097,.448],[.03,side*.13,side*.09]);
    shape(pocket,welt,(s)=>polygon(s,[[-.182,.064],[.164,.064],[.167,-.004],[.110,-.058],[-.108,-.052],[-.174,-.007]]),[0,0,.028],{depth:.023,bevel:.019});
    box(pocket,tobacco,[0,.017,.072],[.304,.025,.014],.007,2);
    seams(pocket,seam,[[-.147,.061,.073],[0,.072,.078],[.149,.058,.073]],13,.0047);
    for(const dx of [-.131,.135]) ball(pocket,oldGold,[dx,.011,.082],[.016,.016,.010]);
    const carp=joint(g,[side*1.018,1.123,-.035],[0,side*Math.PI/2,0]);
    box(carp,tobacco,[0,-.058,0],[.365,.21,.068],.036);
    box(carp,welt,[.006,.041,.023],[.388,.087,.052],.020);
    ball(carp,oldGold,[0,.028,.058],[.018,.018,.010]);
    const legLine=[[side*.287,.931,.439],[side*.452,.933,.465],[side*.663,.948,.438],[side*.832,.952,.391]];
    seams(g,seam,legLine,21,.0043);

    shape(g,creamy,(s)=>polygon(s,[[side*.028,.115],[side*.505,.089],[side*.333,-.154],[side*.214,-.098]]),[0,1.478,.487],{depth:.032,bevel:.021});
    path(g,shade,[[side*.076,1.55,.53],[side*.27,1.548,.533],[side*.455,1.566,.522]],.0085,27,7);
    const sh=side===1 ? .007 : -.013;
    limb(g,tee,[[side*.940,1.689,.013,.110],[side*1.038,1.674,.094,.170],[side*1.135,1.579,.157,.178],[side*1.191,1.482+sh,.226,.142],[side*1.204,1.469+sh,.243,.117]],30,22);
    limb(g,creamy,[[side*1.153,1.536,.198,.129],[side*1.188,1.489+sh,.234,.153],[side*1.199,1.469+sh,.246,.136]],20,24);
  }
  shape(g,brick,(s)=>polygon(s,[[-.101,.183],[.092,.180],[.071,.077],[.112,-.108],[.006,-.203],[-.111,-.125],[-.074,.080]]),[0,1.383,.531],{depth:.039,bevel:.023});
  const tiePin=box(g,gilt,[.022,1.321,.597],[.103,.021,.019],.006,2);
  tiePin.rotation.z=.17;
  path(g,welt,[[-.087,1.446,.583],[.013,1.425,.575],[.074,1.441,.579]],.013,17);

  for (const side of [-1,1]) {
    const y=side===1?3.065:3.092;
    const e=eye(g,[side*.399 + .016,y,.532],[.464,.469,.538],[0,side*.067,-side*.049],eyes,{gaze:.135, lidEnd:1.722, lean:side*.036, irisScale:1.006});
    for(let i=0;i<3;i++){
      const xx=(i-1)*.436, yy=i===1?.888:.792;
      limb(e,lash,[[xx,yy,.096,.073],[xx*1.12,yy+.141,.116,.063],[xx*1.20+.025,yy+.258,.114,.042],[xx*1.22+.039,yy+.303,.108,.007]],20,12);
    }
  }
  for (const side of [-1,1]) {
    const crown = shape(g,tooth,(s)=>{
      s.moveTo(-.080,.096);s.quadraticCurveTo(-.092,.015,-.083,-.058);s.quadraticCurveTo(-.075,-.083,-.041,-.088);
      s.quadraticCurveTo(.032,-.091,.067,-.080);s.quadraticCurveTo(.089,-.068,.085,-.025);s.lineTo(.084,.092);s.closePath();
    },[side*.109+.015,2.382+side*.009,.558],{depth:.059,bevel:.018});
    crown.rotation.z=side*-.036;
  }
  ball(g,rose,[.07,2.309,.505],[.172,.038,.037],[0,0,.048]);

  const necklace=[];
  for(let i=0;i<88;i++){
    const a=i*TAU/88,s=Math.sin(a),c=Math.cos(a);
    necklace.push([1.173*Math.sign(s)*Math.abs(s)**.33,2.186-.255*Math.max(0,c)**1.55+.027*s,.616*Math.sign(c)*Math.abs(c)**.32]);
  }
  chain(g,gilt,curve(necklace,true),63,.083,.67);
  ring(g,gilt,[.031,1.904,.641],.058,.016);
  quartz(g,gilt,enamel,[.037,1.775,.638]).scale.setScalar(.9);
  const watch=joint(g,[.412,1.785,.796],[-.351,1.034,-.171]);
  ring(watch,oldGold,[0,0,0],.096,.025);
  ring(watch,gilt,[0,0,.027],.098,.014);
  const face=joint(g,[.425,1.871,.868],[.18,-.22,.164]);
  box(face,oldGold,[0,0,0],[.179,.137,.054],.03,4);
  box(face,gilt,[0,0,.024],[.162,.121,.041],.025,4);
  box(face,enamel,[0,0,.047],[.124,.093,.013],.016,4);
  for(const x of [-.043,0,.043]) box(face,gilt,[x,0,.056],[.009,.032,.006],.002);
  return batch(g);
}

export function patrick(carving) {
  const g = new Group();
  const clay = skinMaterial('#d48479',.54);
  const eyes = eyeMats({lid:'#cb7e73',line:'#9b534d',iris:'#606455',fleck:'#c8ba8a',limbal:'#47342d',white:'#f3e7cc'});
  const brow=finish('#a65e53',{roughness:.59,surface:'clay',grain:.19});
  const lip=finish('#a75358',{roughness:.63,surface:'clay'});
  const gold=warmGold();
  const purple=finish('#68577a',{roughness:.4,coat:.15,surface:'glazed'});
  const strap=leather('#393140',.49);
  const edge=finish('#312932',{roughness:.31,coat:.28,surface:'glazed'});
  const lens=finish('#231d2a',{roughness:.158,metalness:.34,coat:.64,grain:0});
  const inlay=finish('#594362',{roughness:.32,metalness:.51,grain:.045});
  const suede=leather('#584758',.71);
  const toe=leather('#463c46',.63);
  const outsole=leather('#2b282f',.77);
  const sole=leather('#cbbca6',.75);
  const lime=fabric('#747c47');
  const border=fabric('#a5a469');
  const welt=fabric('#434d31');
  const twine=fabric('#e8ddbc');
  const floral=finish('#fff',{roughness:.81,grain:.3,surface:'canvas',map:engravedCanvas()});
  mesh(g,carving,clay);

  for (const side of [-1,1]){
    trainer(g,{upper:suede,toe,sole,outsole,trim:strap,tongue:toe,stitch:border,lace:twine,hardware:gold},[side===-1?-.626:.553,0,side===-1?.045:.123],side*.243,1.093,true);
    const x=side===-1?-.549:.572;
    const cuff=joint(g,[x,.553,.027],[0,side*.049,side*.12]);
    column(cuff,floral,[[.002,.238,.297],[.028,.328,.357],[.113,.367,.390],[.247,.414,.452],[.289,.426,.460]],{rings:29,detail:74,modify(p,a,t){
      const crease=.008*Math.sin(a*17+t*4);p.x+=crease*Math.sin(a);p.z+=crease*Math.cos(a);
    }});
    ribKnit(cuff,lime,[0,.012,0],[[0,.292,.330],[.024,.337,.368],[.059,.345,.372],[.074,.337,.364]],{ribs:28});
    path(cuff,border,[[-.29,.044,.19],[-.20,.042,.30],[0,.041,.377],[.226,.047,.278],[.320,.041,.137]],.0105,34,9);
  }
  column(g,floral,[[.620,.039,.048],[.660,.625,.448],[.704,.931,.563],[.821,1.064,.688],[.989,1.116,.72],[1.177,1.116,.722],[1.279,1.107,.718],[1.329,1.079,.699]],{detail:146,rings:52,modify(p,a,t){
    const run = Math.sin(12*a + t * 3.9) * Math.sin(Math.PI*t)**.78;
    const fold=.018*run + .011*Math.sin(a*21 + t*13)*Math.sin(Math.PI*t)**2;
    p.x+=Math.sin(a)*fold;p.z+=Math.cos(a)*fold;
    p.y+=(.036*Math.sin(a*2+.53)+.012*Math.cos(a*5))*(1-t)**2;
  }});
  ribKnit(g,lime,[0,1.199,-.022],[[0,1.095,.731],[.032,1.132,.755],[.112,1.124,.755],[.146,1.081,.728]],{ribs:78});
  path(g,border,[[-1.02,1.256,.294],[-.685,1.26,.576],[0,1.269,.739],[.653,1.27,.590],[1.024,1.267,.294]],.011,44,10);
  seams(g,twine,[[-.852,1.211,.461],[-.535,1.214,.626],[0,1.226,.742],[.53,1.221,.633],[.852,1.217,.470]],51,.0056);
  for(const side of [-1,1]) {
    const p = joint(g,[side*1.047,.986,.266],[.08,side*.942,side*.062]);
    shape(p,lime,(s)=>polygon(s,[[-.135,.111],[.155,.088],[.146,-.126],[.066,-.168],[-.143,-.139]]),[0,0,0],{depth:.031,bevel:.022});
    box(p,welt,[.005,.106,.031],[.314,.089,.061],.028);
    ball(p,gold,[side*.036,.089,.069],[.023,.023,.013]);
    seams(p,border,[[-.115,-.070,.050],[-.102,-.128,.054],[.060,-.145,.05],[.115,-.119,.048]],12,.0055);
    limb(g,twine,[[0,1.234,.742,.024],[side*.065,1.18,.773,.029],[side*.11,1.084+side*.012,.766,.026],[side*.127,1.017+side*.033,.753,.023],[side*.127,1.008+side*.033,.751,.012]],27,12);
    ball(g,gold,[side*.024,1.224,.757],[.030,.026,.011]);
  }
  ball(g,twine,[0,1.225,.774],[.048,.036,.032]);

  for(const side of [-1,1]){
    eye(g,[side*.198-.052,2.787+side*.024,.350],[.203,.244,.334],[0,side*.135,side*.104],eyes,{gaze:.15,lidEnd:1.61,lean:side*.037,irisScale:.95});
    limb(g,brow,[[side*.064-.092,2.991+side*.050,.337,.008],[side*.191-.074,3.026+side*.035,.300,.037],[side*.277-.070,3.010+side*.066,.255,.034],[side*.318-.071,2.976+side*.050,.211,.008]],26,14);
  }
  ball(g,lip,[.057,2.279,.445],[.139,.032,.035],[0,0,.13]);
  const glasses=joint(g,[-.008,2.597,.436],[.069,-.052,-.079]);
  const silhouette=(s,u=1)=>{
    s.moveTo(-.210*u,.089*u);s.quadraticCurveTo(-.218*u,.130*u,-.167*u,.136*u);s.lineTo(.165*u,.131*u);
    s.quadraticCurveTo(.221*u,.129*u,.205*u,.070*u);s.lineTo(.164*u,-.097*u);
    s.quadraticCurveTo(.148*u,-.130*u,.080*u,-.131*u);s.lineTo(-.103*u,-.123*u);s.quadraticCurveTo(-.171*u,-.120*u,-.182*u,-.068*u);s.closePath();
  };
  for(const side of [-1,1]){
    const frame=joint(glasses,[side*.232,0,.003],[0,side*.185,side*.031]);
    shape(frame,edge,silhouette,[0,0,0],{depth:.052,bevel:.039});
    shape(frame,gold,(s)=>silhouette(s,.959),[0,0,.050],{depth:.018,bevel:.012});
    shape(frame,inlay,(s)=>silhouette(s,.873),[0,0,.069],{depth:.011,bevel:.013});
    shape(frame,lens,(s)=>silhouette(s,.792),[0,0,.076],{depth:.021,bevel:.019});
    box(frame,edge,[side*.207,.058,.022],[.101,.076,.077],.022);
    for(const h of [-.011,.029])ball(frame,gold,[side*.23,.057+h,.063],[.014,.014,.008]);
    path(glasses,edge,[[side*.454,.079,.014],[side*.498,.084,-.105],[side*.422,.046,-.333]],.029,23,12);
  }
  path(glasses,gold,[[-.058,.040,.042],[0,.073,.062],[.058,.042,.047]],.022,24,12);
  const bracelet = joint(g,[.674,2.437,.482],[-.23,1.24,-.74]);
  ring(bracelet,gold,[0,0,0],.095,.022);
  ring(bracelet,purple,[0,0,.030],.095,.013);

  chain(g,gold,curve([[-.714,2.227,-.103],[-.815,2.065,.165],[-.62,1.994,.427],[-.328,1.869,.640],[.005,1.826,.709],[.399,1.891,.636],[.707,2.010,.422],[.819,2.098,.064],[.54,2.198,-.462],[-.03,2.248,-.564],[-.573,2.207,-.405]],true),48,.085,.65);
  ring(g,gold,[.029,1.795,.738],.067,.0195);
  const star=Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*TAU/10,r=i%2?.089:.191;return [r*Math.cos(a),r*Math.sin(a)];});
  const charm=cubanCharm(g,gold,purple,[.044,1.622,.742],star);
  charm.rotation.set(.104,.121,.133);
  rosette(charm,gold,[0,-.005,.072],.05,.44,.006,5);
  return batch(g);
}

export function squidward(carving) {
  const g = new Group();
  const porcelain = skinMaterial('#86ada0',.49);
  const eyes = eyeMats({lid:'#769c92',line:'#427267',iris:'#94482e',fleck:'#d08e56',limbal:'#592e26',white:'#e6d9b8'});
  const crease=finish('#697c72',{roughness:.66,surface:'clay'});
  const canvas=fabric('#49423b');
  const inset=fabric('#655345');
  const knitted=finish('#303831',{roughness:.81,surface:'ribbed',grain:.32});
  const edge=fabric('#8e7c69');
  const thread=fabric('#b6a992');
  const needle=finish('#9eb2b2',{roughness:.38,metalness:.6,surface:'metal'});
  const bright=silver();
  const enamel=finish('#638f97',{roughness:.32,metalness:.43,coat:.29,surface:'glazed'});
  const cuff=leather('#29323b',.47);
  const padded=leather('#40464b',.63);
  const chrome=finish('#74858c',{roughness:.255,metalness:.89,surface:'metal'});
  const earpad=leather('#202629',.75);
  mesh(g,carving,porcelain);

  // An oversized bomber with raised patch panels, knitted ribbing and zipper hardware.
  column(g,canvas,[[1.145,.011,.013],[1.169,.450,.298],[1.249,.619,.365],[1.365,.683,.413],[1.557,.691,.421],[1.727,.685,.412],[1.873,.625,.351],[1.988,.572,.343],[2.083,.455,.302],[2.169,.261,.248],[2.19,.095,.104]],{
    detail:112,rings:57,modify(p,a,t){
      const fall=Math.sin(Math.PI*t)**1.35;
      const bend=(.019*Math.sin(a*15+t*5)+.013*Math.sin(a*7-t*6))*fall;
      p.x+=Math.sin(a)*bend;p.z+=Math.cos(a)*bend;
      p.y+=.044*Math.cos(a-.79)*fall;
    },
  });
  ribKnit(g,knitted,[0,1.157,0],[[0,.481,.298],[.027,.574,.343],[.108,.635,.387],[.167,.651,.380]],{ribs:62});
  ribKnit(g,knitted,[0,2.048,.009],[[0,.333,.281],[.037,.275,.248],[.113,.238,.222],[.142,.229,.211]],{ribs:45});
  for (const side of [-1,1]) {
    const a=side<0?.037:-.031;
    limb(g,inset,[[side*.429,1.972+a,-.036,.144],[side*.551,1.909+a,-.020,.222],[side*.691,1.787+a,.034,.215],[side*.755,1.676+a,.076,.177],[side*.777,1.655+a,.078,.137]],38,24);
    limb(g,knitted,[[side*.726,1.719+a,.071,.154],[side*.764,1.668+a,.079,.184],[side*.787,1.635+a,.088,.151]],22,24);
    path(g,edge,[[side*.424,1.972+a,.195],[side*.581,1.885+a,.220],[side*.723,1.752+a,.191]],.0115,25,9);
    seams(g,thread,[[side*.439,1.983+a,.203],[side*.584,1.893+a,.235],[side*.717,1.774+a,.197]],16,.0044);
    const pocket = joint(g,[side*.403,1.53,.343],[0,side*.244,side*-.21]);
    box(pocket,knitted,[0,0,0],[.066,.301,.054],.020);
    path(pocket,edge,[[side*.037,-.128,.031],[side*.036,0,.033],[side*.036,.127,.031]],.011,22,8);
    shape(g,knitted,(s)=>polygon(s,[[side*.035,.080],[side*.208,.128],[side*.376,.030],[side*.228,-.130]]),[0,2.034,.262],{depth:.037,bevel:.023});
    seams(g,thread,[[side*.125,2.086,.317],[side*.212,1.975,.321],[side*.331,2.057,.289]],16,.0052);
  }
  const zipper=[[0,1.354,.403],[0,1.604,.444],[0,1.824,.405],[0,2.073,.292]];
  path(g,knitted,zipper,.031,42,10);
  const travel=curve(zipper);
  for(let i=0;i<22;i++){
    const p=travel.getPointAt(i/23);
    box(g,needle,[i%2?.014:-.014,p.y,p.z+.029],[.036,.015,.014],.004,2).rotation.z=i%2?.18:-.18;
  }
  const slider=joint(g,[.021,1.831,.446],[.13,.20,-.24]);
  box(slider,bright,[0,0,0],[.075,.118,.036],.022,3);
  box(slider,knitted,[0,-.012,.021],[.028,.053,.012],.009,2);
  const patch=joint(g,[.422,1.797,.329],[.04,.342,.18]);
  box(patch,knitted,[0,0,0],[.195,.121,.041],.023);
  rosette(patch,enamel,[-.035,0,.03],.042,.46,.008);
  for (const y of [-.018,.015]) box(patch,thread,[.043,y,.029],[.051,.012,.005],.003);
  const wrist=joint(g,[.413,1.389,.607],[.32,1.20,.125]);
  ring(wrist,chrome,[0,0,0],.096,.019);
  ring(wrist,bright,[0,0,.042],.093,.011);

  for(const side of [-1,1]){
    eye(g,[side*.249-.018,3.102+side*.021,.473],[.278,.382,.434],[0,side*.106,-side*.067],eyes,{gaze:.108,lidEnd:1.677,lean:-side*.056,irisScale:.91});
    limb(g,crease,[[side*.078,3.387,.580,.010],[side*.218,3.454,.566,.035],[side*.373,3.476,.532,.042],[side*.516,3.436,.462,.010]],30,14);

  }
  chain(g,bright,curve([
    [-.552,2.069,.160],[-.476,1.969,.305],[-.310,1.852,.422],[-.011,1.781,.453],[.269,1.831,.425],[.477,1.951,.314],[.575,2.062,.172],
    [.561,2.092,-.035],[.383,2.098,-.220],[.123,2.091,-.320],[-.165,2.086,-.307],[-.412,2.083,-.193],[-.564,2.091,-.020],
  ],true),44,.063,.66);
  ring(g,bright,[.02,1.762,.475],.052,.014);
  const badge=cubanCharm(g,bright,enamel,[.027,1.669,.492],[[0,.118],[.086,.027],[.038,-.100],[-.044,-.099],[-.085,.022]]);
  badge.rotation.set(.13,.074,.14);
  rosette(badge,bright,[0,.003,.071],.046,.42,.009);

  // Machined earcups and a padded band, with each cup's geometry aligned to the head.
  path(g,cuff,[[-.974,3.423,-.074],[-.995,3.739,-.079],[-.786,4.013,-.095],[-.416,4.167,-.111],[-.054,4.226,-.109],[.395,4.177,-.091],[.767,4.025,-.075],[.967,3.738,-.052],[.970,3.423,-.033]],.071,86,16);
  path(g,chrome,[[-.979,3.548,-.128],[-.948,3.827,-.134],[-.726,4.043,-.165],[-.361,4.205,-.151],[-.044,4.256,-.154],[.408,4.204,-.132],[.772,4.049,-.121],[.950,3.827,-.095],[.978,3.551,-.072]],.018,72,9);
  path(g,padded,[[-.818,3.957,-.071],[-.612,4.083,-.070],[-.320,4.179,-.063],[-.028,4.209,-.066],[.360,4.161,-.052],[.690,4.061,-.047],[.834,3.959,-.042]],.072,73,14);
  for (const side of [-1,1]) {
    const h=joint(g,[side*.878,3.397,-.053],[.163,side*.092,-side*Math.PI/2]);
    h.scale.set(1.10,1,.870);
    lathe(h,earpad,[[0,-.083],[.189,-.078],[.248,-.050],[.271,-.018],[.278,.017],[.265,.052],[.253,.069],[.225,.074],[0,.074]],80);
    lathe(h,cuff,[[0,.045],[.239,.045],[.267,.071],[.280,.111],[.277,.164],[.261,.206],[.225,.229],[0,.233]],80);
    lathe(h,chrome,[[0,.209],[.206,.209],[.232,.223],[.235,.238],[.212,.251],[0,.253]],80);
    lathe(h,padded,[[0,.245],[.194,.245],[.207,.253],[.207,.273],[.185,.286],[0,.291]],80);
    ring(h,enamel,[0,.289,0],.140,.010,true);
    const plate=joint(h,[0,.295,0],[-Math.PI/2,0,0]);
    rosette(plate,chrome,[0,0,.003],.094,.42,.010);
    for(const a of [-Math.PI/4,Math.PI/4,Math.PI*1.25,Math.PI*.75]) ball(h,chrome,[.178*Math.sin(a),.285,.178*Math.cos(a)],[.010,.008,.010]);
  }
  return batch(g);
}

export const characterMakers = [spongebob, patrick, squidward];
