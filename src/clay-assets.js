import { Float32BufferAttribute } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

// Meshopt keeps the baked sculpture small. Apply glTF's quantization transform once,
// before attaching the surfaces to the live, rotatable figure and its wardrobe.
export async function loadClay() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  return Promise.all(['sponge', 'star', 'squid'].map(async (name) => {
    const { scene } = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
    scene.updateMatrixWorld(true);
    const source = scene.getObjectByProperty('isMesh', true);
    if (!source?.geometry) throw new Error(`Missing clay surface: ${name}`);
    const { geometry } = source;
    for (const [key, attribute] of Object.entries(geometry.attributes)) {
      if (!attribute.normalized && attribute.array instanceof Float32Array && !attribute.isInterleavedBufferAttribute) continue;
      const values = new Float32Array(attribute.count * attribute.itemSize);
      for (let i = 0; i < attribute.count; i++) {
        for (let k = 0; k < attribute.itemSize; k++) values[i * attribute.itemSize + k] = attribute.getComponent(i, k);
      }
      geometry.setAttribute(key, new Float32BufferAttribute(values, attribute.itemSize));
    }
    geometry.applyMatrix4(source.matrixWorld);
    source.material?.dispose();
    return geometry;
  }));
}
