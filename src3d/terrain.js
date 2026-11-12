// The ground: lawn, wild grass, the gravel path, the pond bed, and stepping stones.
import * as THREE from 'three';
import { terrainHeight, pondEdge, distToPath, HOUSE, BRIDGE, groundY } from './world.js';
import { seeded } from './textures.js';
import { scatter } from './models.js';

const mix = (a, b, t) => a.clone().lerp(b, Math.min(1, Math.max(0, t)));

export function createTerrain(scene, models) {
  const size = 190, seg = 220;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colours = new Float32Array(pos.count * 3), blend = new Float32Array(pos.count * 2);
  // photographed ground: lawn, forest floor and gravel, mixed per vertex; the colour only tints it
  const lawn = new THREE.Color(1.0, 1.0, 0.95), wild = new THREE.Color(0.8, 0.86, 0.72),
    bed = new THREE.Color(0.5, 0.66, 0.6), mud = new THREE.Color(0.62, 0.58, 0.48);
  const r = seeded(5), sat = (v) => Math.min(1, Math.max(0, v));
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    const far = Math.hypot(x, z - 2), e = pondEdge(x, z);
    let c = mix(lawn, wild, (far - 13) / 10 + (r() - 0.5) * 0.25);
    c = mix(c, mud, 1 - (e - 1.0) / 0.1);
    c = mix(c, bed, 1 - (e - 0.72) / 0.25);
    c.multiplyScalar(0.92 + r() * 0.16);
    colours.set([c.r, c.g, c.b], i * 3);
    const forest = sat((far - 17) / 12 + (r() - 0.5) * 0.5);
    const gravel = Math.max(sat(1 - (distToPath(x, z) - 0.75) / 0.6), sat(1 - (e - 1.0) / 0.12));
    blend.set([forest, gravel], i * 2);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.setAttribute('blend', new THREE.BufferAttribute(blend, 2));
  geo.computeVertexNormals();
  const lawnMap = models.ground.lawn, lawnNor = models.ground.lawnNormal;
  lawnMap.repeat.set(70, 70); lawnNor.repeat.set(70, 70);
  const extra = { tForest: { value: models.ground.forest }, tGravel: { value: models.ground.gravel } };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: lawnMap, normalMap: lawnNor, roughness: 1 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, extra);
    shader.vertexShader = 'attribute vec2 blend;\nvarying vec2 vBlend;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBlend = blend;');
    shader.fragmentShader = 'uniform sampler2D tForest, tGravel;\nvarying vec2 vBlend;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
      // two scales of each photo, so the tiling does not show
      vec4 cLawn = mix(texture2D(map, vMapUv), texture2D(map, vMapUv * 0.23 + 0.4), 0.45);
      cLawn.rgb = mix(cLawn.rgb, dot(cLawn.rgb, vec3(0.3, 0.6, 0.1)) * vec3(0.95, 1.5, 0.5), 0.72);   // a watered lawn, not autumn
      vec4 cForest = mix(texture2D(tForest, vMapUv * 0.6), texture2D(tForest, vMapUv * 0.17 + 0.3), 0.4);
      vec4 cGravel = texture2D(tGravel, vMapUv * 1.4);
      diffuseColor *= mix(mix(cLawn, cForest, vBlend.x), cGravel, vBlend.y);`);
  };
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  scene.add(ground);

  // stepping stones: porch steps to the bridge, and on from the bridge toward the front
  const stones = [];
  const lay = (from, to, n) => { for (let i = 0; i <= n; i++) stones.push([from[0] + (to[0] - from[0]) * i / n, from[1] + (to[1] - from[1]) * i / n]); };
  const stepsZ = HOUSE.z + HOUSE.d / 2 + HOUSE.porch + 1.6;
  lay([HOUSE.x + 0.55, stepsZ], [BRIDGE.a[0] + 0.2, BRIDGE.a[1] - 0.9], 6);
  lay([BRIDGE.b[0] + 0.6, BRIDGE.b[1] + 0.9], [9.5, 9], 5);
  lay([9, 10], [4, 14.5], 5);
  // flat scanned rocks, sunk into the lawn
  const flat = stones.map(([x, z]) => {
    const jx = x + (r() - 0.5) * 0.3, jz = z + (r() - 0.5) * 0.3, k = 0.42 + r() * 0.16;
    return { x: jx, y: groundY(jx, jz) - 0.03, z: jz, s: k, sy: k * 0.22, ry: r() * 6.28 };
  });
  const kinds = [models.rock[1], models.rock[2], models.rock[5]];
  kinds.forEach((v, n) => scatter(scene, v, flat.filter((_, i) => i % kinds.length === n)));

  return { ground };
}
