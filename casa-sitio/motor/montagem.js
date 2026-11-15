// Montagem: ferramentas para construir peças com caixas e cilindros, em centímetros.
// Toda peça é desenhada no seu sistema local:
//   x: 0..L  ao longo da peça (ordem da planta: da esquerda p/ direita, ou dos fundos p/ frente)
//   y: 0..A  do pé da peça para cima
//   z: 0..P  das costas (parede) para a frente
import * as THREE from 'three';
import { corTemperatura, num } from './base.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cacheCaixa = new Map(), cacheCil = new Map(), cacheEsf = new Map();

// Caixa com UV em centímetros (a textura repete pelo tamanho real).
export function caixaGeo(w, h, d) {
  const k = `${Math.round(w * 10)}|${Math.round(h * 10)}|${Math.round(d * 10)}`;
  let g = cacheCaixa.get(k);
  if (g) return g;
  g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const n = f * 4 + i; uv.setXY(n, uv.getX(n) * dims[f][0], uv.getY(n) * dims[f][1]); }
  cacheCaixa.set(k, g);
  return g;
}
function cilGeo(rt, rb, h, seg) {
  const k = `${Math.round(rt * 10)}|${Math.round(rb * 10)}|${Math.round(h * 10)}|${seg}`;
  let g = cacheCil.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); g.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? h : 2 * Math.PI * rt); }); cacheCil.set(k, g); }
  return g;
}
function esfGeo(r) { const k = Math.round(r * 10); let g = cacheEsf.get(k); if (!g) { g = new THREE.SphereGeometry(r, 18, 12); cacheEsf.set(k, g); } return g; }

export class Montagem {
  constructor(ctx, grupo, raiz) {
    this.ctx = ctx; this.g = grupo;
    this.raiz = raiz || this;
    if (!raiz) { this.acoes = []; this.luzes = []; }
  }
  mat(m) { return this.ctx.mats.get(m); }
  // Caixa pelos limites: x0..x1, y0..y1, z0..z1
  cx(x0, x1, y0, y1, z0, z1, mat, o = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    if (!(w > 0.01 && h > 0.01 && d > 0.01)) return null;
    const me = new THREE.Mesh(caixaGeo(w, h, d), this.mat(mat));
    me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    me.castShadow = o.sombra !== false; me.receiveShadow = true;
    this.g.add(me);
    return me;
  }
  // Cilindro em pé: centro (x, z), base em y0, altura h, raio r (rTopo opcional para cone)
  cil(x, z, y0, h, r, mat, o = {}) {
    const me = new THREE.Mesh(cilGeo(o.rTopo ?? r, r, h, o.seg || 20), this.mat(mat));
    me.position.set(x, y0 + h / 2, z); me.castShadow = o.sombra !== false; me.receiveShadow = true;
    this.g.add(me);
    return me;
  }
  // Cilindro deitado, com o eixo apontando para a frente (z): centro (x, y), de z0 até z0+c
  cilZ(x, y, z0, c, r, mat, o = {}) {
    const me = new THREE.Mesh(cilGeo(r, r, c, o.seg || 20), this.mat(mat));
    me.rotation.x = Math.PI / 2; me.position.set(x, y, z0 + c / 2); me.castShadow = o.sombra !== false; me.receiveShadow = true;
    this.g.add(me);
    return me;
  }
  // Cilindro deitado ao longo de x
  cilX(x0, c, y, z, r, mat, o = {}) {
    const me = new THREE.Mesh(cilGeo(r, r, c, o.seg || 16), this.mat(mat));
    me.rotation.z = Math.PI / 2; me.position.set(x0 + c / 2, y, z); me.castShadow = o.sombra !== false; me.receiveShadow = true;
    this.g.add(me);
    return me;
  }
  esfera(x, y, z, r, mat, o = {}) {
    const me = new THREE.Mesh(esfGeo(r), this.mat(mat));
    me.position.set(x, y, z); if (o.escala) me.scale.set(...o.escala);
    me.castShadow = o.sombra !== false; me.receiveShadow = true;
    this.g.add(me);
    return me;
  }
  // Subgrupo com origem própria (para portas e gavetas que se movem).
  sub(x = 0, y = 0, z = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); this.g.add(g);
    return new Montagem(this.ctx, g, this.raiz);
  }
  // Registra algo que abre/fecha. aplicar(v) recebe 0 (fechado) a 1 (aberto).
  acao(rotulo, aplicar, aberto = false) {
    const a = { rotulo, aplicar, v: aberto ? 1 : 0, alvo: aberto ? 1 : 0 };
    aplicar(a.v); this.raiz.acoes.push(a);
    return a;
  }
  // Material que "acende" (um por luminária, para ligar e desligar separadamente).
  emissivo(k) {
    const cor = corTemperatura(k);
    const m = new THREE.MeshStandardMaterial({ color: 0xf6f3ea, emissive: cor, emissiveIntensity: 0, roughness: 0.6 });
    m.userData.descartavel = true;
    return m;
  }
  // Fonte de luz. tipo: 'ponto' (para todos os lados) ou 'foco' (cone para baixo).
  luz(o) {
    const cor = corTemperatura(o.temperatura);
    const lm = num(o.potencia, 10) * 90;
    let l, base;
    if (o.tipo === 'foco') {
      base = lm / 55;
      l = new THREE.SpotLight(cor, 0, 0, (num(o.abertura, 80) * Math.PI) / 360, 0.7, 2);
      l.position.set(o.x, o.y, o.z); l.target.position.set(o.x, o.y - 100, o.z);
      this.g.add(l.target);
    } else {
      base = lm / 150;
      l = new THREE.PointLight(cor, 0, 0, 2);
      l.position.set(o.x, o.y, o.z);
    }
    this.g.add(l);
    this.raiz.luzes.push({ luz: l, base, emissivos: o.emissivos || [] });
    return l;
  }
}

// Lote: junta muitas faces planas numa malha só (usado nas paredes e pisos).
export class Lote {
  constructor() { this.p = []; this.n = []; this.uv = []; }
  // pts: 4 cantos em sentido anti-horário vistos de fora; n: normal
  face(pts, n) {
    const [a, b, c, d] = pts, u = v => (Math.abs(n[1]) > 0.5 ? [v[0], v[2]] : Math.abs(n[0]) > 0.5 ? [v[2], v[1]] : [v[0], v[1]]);
    for (const v of [a, b, c, a, c, d]) { this.p.push(v[0], v[1], v[2]); this.n.push(n[0], n[1], n[2]); const t = u(v); this.uv.push(t[0], t[1]); }
  }
  get vazio() { return this.p.length === 0; }
  malha(material) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.userData.descartavel = true;
    return new THREE.Mesh(g, material);
  }
}
// Cantos de uma face alinhada aos eixos. dir = +1 ou -1 (lado para onde a face olha).
export const faceX = (x, z0, z1, y0, y1, dir) => dir > 0
  ? [[[x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1]], [1, 0, 0]]
  : [[[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]], [-1, 0, 0]];
export const faceZ = (z, x0, x1, y0, y1, dir) => dir > 0
  ? [[[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], [0, 0, 1]]
  : [[[x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z]], [0, 0, -1]];
export const faceY = (y, x0, x1, z0, z1, dir) => dir > 0
  ? [[[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0]]
  : [[[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], [0, -1, 0]];

// Funde, dentro de cada grupo, as malhas que usam o mesmo material numa malha só.
// Não muda a aparência; reduz muito o trabalho da placa de vídeo (importante no celular).
// Portas e gavetas ficam em subgrupos próprios e continuam se movendo.
export function fundir(g) {
  const porMaterial = new Map();
  for (const c of [...g.children]) {
    if (c.isMesh) { const k = c.material.uuid + (c.castShadow ? 's' : 'n'); if (!porMaterial.has(k)) porMaterial.set(k, []); porMaterial.get(k).push(c); }
    else if (c.isGroup) fundir(c);
  }
  for (const lista of porMaterial.values()) {
    if (lista.length < 2) continue;
    const geos = lista.map(m => { m.updateMatrix(); return m.geometry.clone().applyMatrix4(m.matrix); });
    let geo = null;
    try { geo = mergeGeometries(geos, false); } catch (e) { geo = null; }
    geos.forEach(x => x.dispose());
    if (!geo) continue;
    geo.userData.descartavel = true;
    const me = new THREE.Mesh(geo, lista[0].material); me.castShadow = lista[0].castShadow; me.receiveShadow = true;
    for (const m of lista) g.remove(m);
    g.add(me);
  }
}
