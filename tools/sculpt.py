"""Bake the hand-authored clay surfaces to glTF. Clothes and hardware are built in Three.js.

    python -m pip install -r tools/requirements-sculpt.txt
    python tools/sculpt.py /tmp/bottom-drop-meshes
    npx -p @gltf-transform/cli gltf-transform meshopt /tmp/bottom-drop-meshes/sponge.glb public/models/sponge.glb --level medium

Repeat the last command for star.glb and squid.glb. No Python is used by the website.
"""
import argparse
import json
import struct
from pathlib import Path

import fast_simplification
import numpy as np
from scipy.interpolate import CubicSpline, PchipInterpolator
from scipy.ndimage import map_coordinates
from skimage.measure import marching_cubes


def norm(*args):
    return np.sqrt(sum(a*a for a in args))


def mix(a, b, k):
    """Polynomial smooth minimum for fusing clay, with a finite blend radius."""
    return np.minimum(a, b) - np.maximum(0, k - np.abs(a-b))**2 / (4*k) if k else np.minimum(a, b)


def egg(x, y, z, c, r):
    q = [(v-center)/radius for v, center, radius in zip((x, y, z), c, r)]
    a, b = norm(*q), norm(*(v/radius for v, radius in zip(q, r)))
    return np.where(b > .00001, a * (a-1) / np.maximum(b, .00001), -min(r))


def rise(a, b, v):
    t = np.clip((v-a)/(b-a), 0, 1)
    return t*t*(3-2*t)


class Clay:
    def __init__(self, lo, hi, step):
        self.lo = np.array(lo, dtype=np.float32)
        self.step = step
        self.axes = [np.arange(a, b+step, step, dtype=np.float32) for a, b in zip(lo, hi)]
        self.distance = np.full(tuple(len(a) for a in self.axes), 3, dtype=np.float32)

    def stamp(self, fn, low=None, high=None, *, blend=0, carve=False):
        indexes = tuple(slice(None) if low is None else slice(
            max(0, np.searchsorted(axis, l)), min(len(axis), np.searchsorted(axis, h, side='right')),
        ) for axis, l, h in zip(self.axes, low or (0,)*3, high or (0,)*3))
        coords = np.ix_(*(axis[s] for axis, s in zip(self.axes, indexes)))
        old = self.distance[indexes]
        new = fn(*coords)
        old[:] = -mix(-old, new, blend) if carve else mix(old, new, blend)

    def oval(self, c, r, *, blend=.03, carve=False):
        pad = .06 + 2*blend
        low, high = [v-radius-pad for v, radius in zip(c, r)], [v+radius+pad for v, radius in zip(c, r)]
        self.stamp(lambda x,y,z: egg(x,y,z,c,r), low, high, blend=blend, carve=carve)

    def tube(self, controls, *, blend=.045, carve=False):
        # Intersect the motion of a round sculpting tool along a prescribed spline.
        controls = np.array(controls, dtype=np.float32)
        t = np.arange(len(controls))
        u = np.linspace(0, t[-1], (len(t)-1)*7 + 1)
        xyz = CubicSpline(t, controls[:,:3], axis=0, bc_type='natural')(u)
        radii = PchipInterpolator(t, controls[:,3])(u)
        maxrad = np.max(radii) + blend*2 + .085
        bounds = [(np.min(xyz, axis=0)-maxrad).tolist(), (np.max(xyz, axis=0)+maxrad).tolist()]

        def swept(x,y,z):
            axes = (x,y,z)
            local = np.full(tuple(a.size for a in axes), 2, dtype=np.float32)
            dims = [a.ravel() for a in axes]
            pad = 2*blend + .065
            for a,b,r1,r2 in zip(xyz[:-1],xyz[1:],radii[:-1],radii[1:]):
                r = max(r1,r2) + pad
                box = tuple(slice(np.searchsorted(ax, min(aa,bb)-r), np.searchsorted(ax, max(aa,bb)+r)) for ax,aa,bb in zip(dims,a,b))
                q = [v-aa for v,aa in zip(np.ix_(*(ax[s] for ax,s in zip(dims,box))),a)]
                delta = b-a
                w = np.clip(sum(v*k for v,k in zip(q,delta)) / max(delta@delta, .000001), 0, 1)
                d = norm(*(v-w*k for v,k in zip(q,delta))) - (r1 + (r2-r1)*w)
                np.minimum(local[box], d, out=local[box])
            return local

        self.stamp(swept, *bounds, blend=blend, carve=carve)

    def profile(self, controls):
        points = np.array(controls)
        heights = points[:,0]
        shape = PchipInterpolator(heights, points[:,1:], axis=0, extrapolate=False)

        def surface(x, y, z):
            rx, rz, dx, dz = np.moveaxis(shape(np.clip(y, heights[0], heights[-1])), -1, 0)
            d = (norm((x-dx)/rx, (z-dz)/rz)-1)*np.minimum(rx,rz)
            return np.maximum(d, np.maximum(heights[0]-y, y-heights[-1]))

        self.stamp(surface)

    def ground(self, level):
        np.maximum(self.distance, level-self.axes[1][None,:,None], out=self.distance)

    def extract(self, triangles, tint):
        v, f, _, _ = marching_cubes(self.distance, 0, allow_degenerate=False)
        v, f = fast_simplification.simplify(v, f, target_count=triangles, agg=4)
        v = v.astype(np.float32)

        def sample(delta):
            return map_coordinates(self.distance, (v+delta).T, order=1, mode='nearest')

        d = np.eye(3, dtype=np.float32)
        normal = np.stack([sample(a)-sample(-a) for a in d], axis=1)
        normal /= np.maximum(np.linalg.norm(normal, axis=1, keepdims=True), .00001)
        if np.mean((np.cross(v[f[:,1]]-v[f[:,0]], v[f[:,2]]-v[f[:,0]])*normal[f[:,0]]).sum(axis=1)) < 0:
            f = f[:,[0,2,1]]
        # Diffuse occlusion baked along the normal, notably in eye pockets, pore rims and folds.
        occlusion = np.zeros(len(v), np.float32)
        for reach, weight in [(2.3,.09),(4.8,.12),(9.5,.105),(15,.067)]:
            occlusion += np.clip(1-sample(normal*reach)/(self.step*reach), 0, 1.4)*weight
        v = v*self.step + self.lo
        base = tint(*v.T).astype(np.float32)
        base = np.clip(base * (1-occlusion[:,None]), 0, 1)
        rgba = np.column_stack((np.rint(base*255), np.full(len(v),255))).astype(np.uint8)
        return v, normal, f, rgba


def lip_stamp(y0, z0, span, height, depth, arch, slant):
    def groove(x,y,z):
        u = x/span
        dy = y-y0 - arch*np.minimum(u*u, 1.4) - slant*u
        dz = z-z0 + .028*np.minimum(u*u,1.2)
        return egg(x,dy,dz,(0,0,0),(span,height,depth))
    return groove


def mouth_tint(groove, x, y, z, edge_z, dark, width):
    near_cut = 1-rise(.008,.062,np.abs(groove(x,y,z)))
    amount = near_cut * (1-rise(edge_z-width,edge_z+.018,z))
    return 1-amount[:,None]*(1-np.array(dark)[None,:])


def hand(clay, at, direction, curled=.03, spread=1):
    x,y,z = at
    clay.oval((x,y,z), (.161,.098,.093), blend=.072)
    for a, length in [(.069, .193), (.012, .229), (-.056,.206)]:
        h = y + a*spread
        clay.tube([(x+.031*direction,h,z+.025,.048),
                   (x+(length-.074)*direction,h+.006,z+.058,.051),
                   (x+length*direction,h-.022,z+.054+curled,.042),
                   (x+(length+.004)*direction,h-.043,z+.021+curled,.027)], blend=.028)
    clay.tube([(x-direction*.089,y+.063,z+.012,.051),
               (x-direction*.058,y+.111,z+.051,.052),
               (x+direction*.056,y+.104,z+.071,.041),
               (x+direction*.09,y+.087,z+.071,.02)],blend=.034)


def sponge():
    s = Clay((-1.55,.99,-.88),(1.56,4.2,1.38),.0145)

    def block(x,y,z):
        u = np.clip((y-2.756)/1.24, -1.08, 1.10)
        px = (x - .029*u)/(.951+.108*u)
        px -= np.sign(px)*(.031*np.sin(8.9*y+.7)+.016*np.cos(15.8*y))*np.minimum(np.abs(px)/1.20,1.25)**5
        py = y-2.756 - np.sign(u)*(.043*np.sin(8.6*x+.45)+.014*np.cos(14.1*x+.4))*np.abs(u)**5
        pz = z - .009*u - .029*np.maximum(0, 1-(x/1.30)**2)*np.exp(-((y-2.78)/1.33)**2)
        rx,ry,rz = np.abs(px)-1.035,np.abs(py)-1.050,np.abs(pz)-.361
        return norm(np.maximum(rx,0),np.maximum(ry,0),np.maximum(rz,0)) + np.minimum(np.maximum(np.maximum(rx,ry),rz),0) - .186

    s.stamp(block)
    # Rolled cheek corners, soft muzzle and a continuous, upturned nose.
    s.oval((-.756,2.633,.501),(.206,.152,.179), blend=.082)
    s.oval(( .767,2.677,.503),(.202,.150,.183), blend=.082)
    s.oval(( .015,2.496,.530),(.601,.153,.104), blend=.063)
    s.oval(( .026,2.269,.513),(.331,.142,.089), blend=.042)
    s.tube([(-.010,2.881,.547,.102),(.029,2.826,.696,.113),(.112,2.804,.834,.135),(.223,2.834,1.001,.157),(.289,2.908,1.056,.126),(.318,2.933,1.061,.055)],blend=.068)
    smile = lip_stamp(2.377,.617,.810,.122,.155,.214,.032)
    s.stamp(smile,(-.88,2.17,.40),(.90,2.81,.88),blend=.018,carve=True)
    for x,y,z,rx,ry,rz in [
        (-.925,3.627,.574,.154,.181,.139),(-1.025,3.23,.559,.075,.091,.076),
        (.991,3.663,.565,.127,.159,.125),(1.048,3.285,.552,.077,.105,.080),
        (-.940,2.27,.545,.105,.117,.105),(-.773,1.965,.532,.135,.154,.113),
        (.948,2.29,.551,.148,.169,.139),(.811,1.96,.543,.070,.104,.077),
        (.290,3.821,.569,.091,.081,.110),(-.342,3.79,.564,.063,.074,.062),
        (-1.15,3.59,.195,.157,.219,.194),(-1.17,3.23,-.251,.143,.144,.128),
        (-1.105,2.971,.086,.165,.180,.186),(-1.09,2.487,-.203,.147,.152,.133),
        (-1.029,2.17,.174,.096,.135,.107),(-1.017,1.847,-.113,.146,.152,.180),
        (1.271,3.534,-.021,.172,.209,.179),(1.224,3.084,.141,.147,.160,.140),
        (1.179,2.724,-.242,.148,.185,.137),(1.164,2.357,.131,.173,.181,.138),
        (1.08,1.935,-.128,.148,.132,.132),(-.823,3.53,-.553,.186,.181,.140),
        (.691,3.629,-.541,.123,.124,.104),(.236,3.318,-.559,.165,.157,.142),
        (-.692,2.974,-.547,.099,.119,.128),(.771,2.849,-.551,.193,.202,.142),
        (-.367,2.523,-.552,.182,.216,.142),(.299,2.13,-.55,.135,.145,.108),
        (-.733,1.96,-.544,.121,.108,.115),(.66,1.75,-.49,.109,.12,.123),
    ]:
        s.oval((x,y,z),(rx,ry,rz),blend=.018,carve=True)
    for side in [-1,1]:
        for p in [(side*.819,2.687+side*.028,.677), (side*.890,2.649+side*.025,.650), (side*.760,2.708+side*.028,.673)]:
            s.oval(p,(.019,.026,.018), blend=.006, carve=True)
    # Fuse hands and arms here; the clothing is fitted to this pose in Three.js.
    s.tube([(1.045,1.708,.076,.102),(1.174,1.532,.204,.101),(1.27,1.253,.392,.106),(1.238,1.204,.552,.112),(.989,1.281,.685,.109),(.423,1.432,.739,.091),(-.264,1.616,.716,.082),(-.606,1.684,.691,.075)],blend=.031)
    s.tube([(-1.066,1.708,.086,.103),(-1.201,1.465,.248,.103),(-1.289,1.210,.469,.108),(-1.138,1.228,.702,.119),(-.698,1.390,.836,.104),(-.104,1.598,.887,.099),(.36,1.798,.807,.090),(.619,1.835,.741,.077)],blend=.024)
    hand(s,(-.639,1.697,.714),-1,spread=.82)
    hand(s,(.665,1.817,.750),1,spread=.88)

    def tint(x,y,z):
        d = .016*np.sin(x*17+z*8)*np.cos(y*19-x*6) + .016*np.cos(x*6-y*9)*np.sin(z*12+y*8)
        low = .049*(1-rise(1.6,3.6,y))
        blush = np.exp(-((abs(x)-.795)/.219)**2 - ((y-2.65)/.162)**2)*rise(.35,.67,z)
        base = np.stack([.994+d-.35*low, .991+d-low-.10*blush, .942+d-1.1*low-.16*blush], axis=1)
        return base*mouth_tint(smile,x,y,z,.558,(.081,.035,.099),.085)

    return s.extract(39900,tint)


def star():
    s = Clay((-1.48,.38,-.95),(1.54,3.87,1.0),.015)
    s.profile([
       (.65,.03,.045,.012,0),(.83,.759,.487,.027,-.025), (1.05,.984,.639,.041,-.018),
       (1.30,1.051,.697,.033,-.024),(1.54,1.073,.726,.010,-.023),(1.72,1.023,.688,-.027,-.026),
       (1.96,.886,.618,-.061,-.020),(2.19,.706,.538,-.053,-.006),(2.45,.575,.469,-.044,.005),
       (2.68,.478,.419,-.051,.004),(2.89,.394,.359,-.073,.000),(3.115,.321,.294,-.111,-.027),
       (3.309,.245,.241,-.159,-.057),(3.486,.153,.158,-.215,-.077),(3.613,.081,.088,-.277,-.077),
       (3.666,.046,.054,-.313,-.063),(3.687,.015,.025,-.335,-.057),
    ])
    s.tube([(-.550,2.125,-.080,.252),(-.808,1.939,-.020,.256),(-1.033,1.648,.106,.210),(-1.032,1.402,.246,.150),(-.929,1.274,.434,.113),(-.802,1.302,.509,.066)],blend=.098)
    s.tube([(.579,2.047,-.113,.245),(.832,1.851,-.116,.244),(1.067,1.617,-.023,.197),(1.161,1.656,.174,.161),(1.105,1.882,.361,.141),(.929,2.124,.437,.109),(.727,2.398,.490,.087),(.622,2.531,.452,.076)],blend=.111)
    s.oval((.584,2.547,.469),(.122,.110,.098),blend=.059)
    s.tube([(.553,2.509,.512,.041),(.473,2.515,.558,.047),(.432,2.548,.554,.042),(.450,2.577,.541,.022)],blend=.023)
    s.tube([(.602,2.582,.494,.049),(.551,2.654,.497,.046),(.497,2.669,.503,.039),(.456,2.629,.521,.027)],blend=.027)
    s.tube([(.665,2.574,.461,.048),(.625,2.648,.440,.049),(.573,2.673,.453,.034)],blend=.029)
    s.tube([(-.575,.90,-.038,.188),(-.604,.677,.006,.179),(-.625,.452,.069,.140)],blend=.062)
    s.tube([(.531,.90,.044,.182),(.552,.664,.075,.169),(.545,.430,.127,.131)],blend=.064)
    s.oval((-.342,2.349,.461),(.148,.128,.126),blend=.073)
    s.oval(( .350,2.372,.451),(.150,.121,.122),blend=.065)
    smile = lip_stamp(2.323,.529,.454,.080,.115,.105,.039)
    s.stamp(smile,(-.54,2.10,.33),(.56,2.55,.745),blend=.017,carve=True)
    s.oval((-.002,1.462,.710),(.095,.066,.084),blend=.016,carve=True)
    for x,y,z,r in [(-.399,1.684,.639,.014),(-.47,1.619,.636,.019),(.442,1.556,.651,.018),(.471,1.626,.637,.015),(-.386,2.404,.550,.013),(.411,2.425,.528,.015),(-.346,2.433,.555,.014),(.375,2.383,.563,.017)]:
        s.oval((x,y,z),(r,r,.014),blend=.004,carve=True)

    def tint(x,y,z):
        freckles = .013*np.cos(26*x+8*z)*np.sin(21*y-13*z)
        cheek = np.exp(-((abs(x)-.372)/.149)**2-((y-2.37)/.2)**2)*rise(.36,.61,z)
        side = np.clip((abs(x)-.71)*.17,0,.12)
        alt = np.stack([.988+freckles-.4*side,.931+freckles-.19*cheek-side,.903+freckles-.125*cheek-side],axis=1)
        return alt*mouth_tint(smile,x,y,z,.513,(.081,.038,.049),.075)

    return s.extract(34600,tint)


def squid():
    s = Clay((-1.52,-.18,-.93),(1.41,4.29,1.39),.0154)
    s.profile([
        (1.771,.105,.115,0,-.013), (1.918,.183,.178,0,-.004),(2.155,.194,.201,-.011,.014),
        (2.386,.263,.259,-.013,.014),(2.554,.367,.331,-.027,.028),(2.719,.477,.380,-.033,.019),
        (2.906,.575,.437,-.018,.009),(3.103,.643,.512,-.009,-.016),(3.306,.787,.594,-.023,-.044),
        (3.518,.900,.674,-.025,-.065),(3.701,.870,.663,-.036,-.073),(3.865,.713,.561,-.048,-.071),
        (3.997,.465,.389,-.044,-.060),(4.065,.225,.206,-.066,-.053),(4.092,.011,.024,-.073,-.051),
    ])
    for side in [-1,1]:
        s.oval((side*.258-.023,3.342,.446),(.302,.105,.147),blend=.053)
        s.oval((side*.280,2.792,.338),(.235,.151,.135),blend=.067)
    s.tube([(.016,3.131,.449,.100),(.024,3.011,.605,.127),(.048,2.856,.761,.147),(.068,2.681,.907,.180),(.079,2.511,.959,.206),(.071,2.412,.948,.164),(.062,2.355,.924,.062)],blend=.074)
    frown = lip_stamp(2.573,.365,.418,.053,.094,-.093,.018)
    s.stamp(frown,(-.494,2.412,.211),(.493,2.658,.540),blend=.014,carve=True)
    for x,y,z,r in [(-.63,3.59,.445,.038),(-.51,3.645,.495,.05),(-.44,3.542,.572,.022),(-.27,3.673,.538,.027),(.54,3.584,.468,.041),(.39,3.663,.532,.050),(.348,3.552,.600,.026),(.589,3.50,.431,.028)]:
        s.oval((x,y,z),(r,r*.86,r*.83),blend=.010,carve=True)
    # Held headphone cup on the viewer-left side; the other hand catches the jacket hem.
    s.tube([(-.498,1.975,.010,.106),(-.726,1.725,.084,.104),(-.922,1.692,.159,.100),(-1.045,1.927,.272,.098),(-1.127,2.402,.281,.084),(-1.158,2.876,.197,.072),(-1.140,3.108,.142,.072)],blend=.052)
    s.oval((-1.106,3.188,.118),(.098,.165,.104),blend=.049)
    for i in range(3):
        s.tube([(-1.142+i*.041,3.196,.152+i*.038,.037),(-1.130+i*.044,3.350,.147+i*.040,.041),(-1.103+i*.047,3.460-i*.019,.112+i*.043,.024)],blend=.022)
    s.tube([(-1.121,3.151,.118,.035),(-1.031,3.160,.204,.048),(-.992,3.227,.213,.035)],blend=.023)
    s.tube([(.518,2.005,-.012,.112),(.738,1.775,.069,.102),(.895,1.513,.238,.099),(.831,1.327,.369,.108),(.536,1.334,.612,.103),(.326,1.419,.589,.074)],blend=.048)
    hand(s,(.281,1.443,.604),-1,spread=.8)
    # Four different swept limbs with flattened, planted tips rather than spheres.
    s.tube([(-.376,1.279,-.141,.139),(-.459,.908,-.360,.116),(-.518,.512,-.532,.111),(-.630,.237,-.621,.134),(-.806,.152,-.594,.147),(-1.004,.122,-.481,.132),(-1.057,.126,-.420,.065)],blend=.038)
    s.tube([(.365,1.264,-.106,.134),(.442,.954,-.346,.113),(.543,.554,-.503,.111),(.648,.212,-.556,.134),(.835,.153,-.529,.156),(1.000,.120,-.464,.124),(1.074,.129,-.424,.054)],blend=.043)
    s.tube([(-.290,1.289,.131,.135),(-.458,.921,.238,.127),(-.426,.495,.356,.103),(-.480,.228,.493,.122),(-.635,.155,.706,.163),(-.817,.143,.807,.148),(-.943,.141,.816,.079)],blend=.042)
    s.tube([(.296,1.273,.126,.129),(.435,.947,.224,.124),(.446,.540,.391,.107),(.471,.280,.590,.131),(.630,.176,.790,.174),(.821,.150,.845,.158),(.953,.149,.832,.081)],blend=.048)
    for sign, front in [(-1,.816),(1,.846)]:
        for i in range(3):
            s.oval((sign*(.672+i*.083),.112+i*.007,front+.145+i*.004),(.043-i*.005,.035-i*.003,.046),blend=.007,carve=True)
    s.ground(.008)

    def tint(x,y,z):
        wave = .017*np.sin(22*x+9*z)*np.sin(16*y+7*z)
        top = rise(.33,3.87,y)
        darken = 1-rise(.08,.55,y)
        base = np.stack([.82+.156*top+wave-.10*darken,.90+.081*top+wave-.05*darken,.914+.072*top+wave-.04*darken],axis=1)
        f = 1-(1-rise(.01,.051,np.abs(frown(x,y,z)))) * rise(.07,.26,z) * .67
        return base*f[:,None]

    return s.extract(39600,tint)


def glb(path, name, arrays):
    positions, normals, faces, color = arrays
    views, accessors, data = [], [], bytearray()

    def pack(array, kind, fmt, target, normalized=False, extrema=False):
        arr = np.ascontiguousarray(array)
        payload = arr.tobytes()
        idx = len(views)
        views.append({'buffer':0,'byteOffset':len(data),'byteLength':len(payload),'target':target})
        data.extend(payload)
        data.extend(b'\0' * (-len(data)%4))
        value = {'bufferView':idx,'componentType':fmt,'count':len(arr),'type':kind}
        if normalized:
            value['normalized'] = True
        if extrema:
            value.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
        accessors.append(value)
        return idx

    attrs = {'POSITION':pack(positions.astype('<f4'),'VEC3',5126,34962,extrema=True),
             'NORMAL':pack(normals.astype('<f4'),'VEC3',5126,34962),
             'COLOR_0':pack(color,'VEC4',5121,34962,normalized=True)}
    indices = pack(faces.ravel().astype('<u2'),'SCALAR',5123,34963)
    document = {'asset':{'version':'2.0','generator':'Bottom Drop clay surface baker'},
        'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':name}],
        'meshes':[{'name':name,'primitives':[{'attributes':attrs,'indices':indices}]}],
        'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(data)}]}
    js = json.dumps(document,separators=(',',':')).encode()
    js += b' ' * (-len(js)%4)
    path.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(js)+len(data)) + struct.pack('<I4s',len(js),b'JSON') + js + struct.pack('<I4s',len(data),b'BIN\0') + data)
    print(f'{name}: {len(positions):,} vertices, {len(faces):,} triangles, {path.stat().st_size/1024:.0f} KiB')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output',type=Path)
    parser.add_argument('models',nargs='*')
    args = parser.parse_args()
    args.output.mkdir(parents=True,exist_ok=True)
    sculpts = {'sponge':sponge,'star':star,'squid':squid}
    for name in args.models or sculpts:
        glb(args.output/f'{name}.glb',name,sculpts[name]())
