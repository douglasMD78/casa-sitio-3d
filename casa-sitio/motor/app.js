// Casa do Sítio — motor da maquete.
// Este arquivo junta tudo: carrega os dados, monta a cena, cuida da câmera, do toque,
// das camadas, das luzes, da ficha e do modo de edição.
// REGRA DO PROJETO: para mudar a casa, edite os arquivos em /dados. Não edite o motor.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { U, EIXO, num, cm, metros, resolver, matrizLocal } from './base.js';
import { Materiais } from './materiais.js';
import { Montagem, Lote, faceY, fundir } from './montagem.js';
import { malhaCasa, facesParedes, aberturasDaSala } from './paredes.js';
import { matrizAbertura, construirAbertura } from './esquadrias.js';
import { TIPOS, tipoDe, materialPrincipal } from './catalogo.js';
import { validar } from './validar.js';
import * as UI from './ui.js';
import { lerJSONTolerante, higienizar, combinar, pareceArquivoInteiro, vocabularioDe } from './protecao.js';

const $ = s => document.querySelector(s);
const ACENTO = 0x2f6f5e;
const LADOS = ['fundos', 'frente', 'esquerda', 'direita'];

// ---------- estado ----------
const P = { casa: null, mats: null, malha: null, dados: {}, originais: {}, res: {}, detalhe: {}, cascaSala: {}, aberturas: [], problemas: [], servidor: false,
  forroDe(id) { const s = this.malha.porId[id]; return s && s.aberto ? this.casa.peDireito : num(((this.dados[id] || {}).forro || {}).altura, this.casa.peDireito); } };
const E = { foco: null, ids: [], visao: 'completa', cam: { ...UI.VISOES.completa.cam }, paredes: 'auto', noite: false, ref: true, editar: false, sel: null, pessoa: false, luz: {}, fichaMin: false };
P.notas = {}; P.instantaneo = {}; P.vocab = null; P.catalogoEquipamentos = { categorias: {} };
window.CASA = { P, E };                      // para inspeção e testes (as funções entram no fim do arquivo)

// ---------- cena ----------
const tela = $('#tela');
const renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.autoUpdate = false;
const cena = new THREE.Scene(); cena.background = new THREE.Color(0xe9eee6);
const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 220);
camera.position.set(8, 22, 26);
const controles = new OrbitControls(camera, tela);
Object.assign(controles, { enableDamping: true, dampingFactor: 0.1, maxPolarAngle: Math.PI / 2 - 0.03, minDistance: 0.35, maxDistance: 70, screenSpacePanning: false, zoomToCursor: true });
const hemi = new THREE.HemisphereLight(0xfbfcff, 0xbdb9ae, 0.52); cena.add(hemi);
const sol = new THREE.DirectionalLight(0xfffaf1, 1.85); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.03; cena.add(sol, sol.target);
try { const pm = new THREE.PMREMGenerator(renderer); cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; cena.environmentIntensity = 0.22; pm.dispose(); } catch (e) { console.warn('Sem ambiente de reflexo:', e); }

const raiz = new THREE.Group(); raiz.scale.setScalar(U); cena.add(raiz);
const G = {};
for (const n of ['chao', 'pisos', 'baixas', 'altas', 'salas', 'varandaBaixa', 'varandaAlta', 'blocos', 'pontos', 'esquadrias', 'arcos', 'detalhes', 'pessoa', 'selecao', 'ref']) { G[n] = new THREE.Group(); G[n].name = n; raiz.add(G[n]); }
const matArco = new THREE.LineBasicMaterial({ color: 0x7c8a82 });
const matSel = new THREE.LineBasicMaterial({ color: ACENTO, depthTest: false, transparent: true });
const matCota = new THREE.LineBasicMaterial({ color: 0xc8412c, depthTest: false, transparent: true });
const geoAresta = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
const geoCubo = new THREE.BoxGeometry(1, 1, 1);
const matBloco = new THREE.MeshStandardMaterial({ roughness: 0.85 });

function limpar(g) {
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse(o => { if (o.geometry && o.geometry.userData.descartavel) o.geometry.dispose(); if (o.material && o.material.userData && o.material.userData.descartavel) o.material.dispose(); if (o.isInstancedMesh) o.dispose(); });
  }
}

// ---------- quadro a quadro (só desenha quando algo muda) ----------
let pedido = false, sombraSuja = true, tween = null;
const animando = new Set();
function pedir() { if (!pedido) { pedido = true; requestAnimationFrame(quadro); } }
function quadro(t) {
  pedido = false;
  if (tween) {
    const k = Math.min(1, (t - tween.t0) / tween.dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, e); controles.target.lerpVectors(tween.a0, tween.a1, e);
    if (k >= 1) tween = null;
    pedir();
  }
  if (animando.size) {
    for (const a of animando) { a.v += (a.alvo - a.v) * 0.2; if (Math.abs(a.alvo - a.v) < 0.004) { a.v = a.alvo; animando.delete(a); } a.aplicar(a.v); }
    sombraSuja = true; pedir();
  }
  controles.update();
  atualizarLados();
  if (sombraSuja) { renderer.shadowMap.needsUpdate = true; sombraSuja = false; }
  renderer.render(cena, camera);
  posicionarRotulos();
}
controles.addEventListener('change', pedir);
controles.addEventListener('start', () => { tween = null; });

// Área da tela coberta pelos painéis: a maquete é centralizada no espaço livre.
let livre = { fw: 1, fh: 1 };
function margens() {
  const W = tela.clientWidth || 1, H = tela.clientHeight || 1, caixa = id => { const el = $(id); return el && !el.hidden ? el.getBoundingClientRect() : null; };
  const topo = caixa('#topo'), lista = caixa('#lista'), ficha = caixa('#ficha');
  let l = 0, r = 0, t = topo ? topo.bottom : 0, b = 0;
  if (W > 900) { if (lista) l = lista.right; if (ficha && ficha.height > 80) r = W - ficha.left; }
  else if (ficha) b = H - ficha.top;
  camera.setViewOffset(W, H, -(l - r) / 2, -(t - b) / 2, W, H);
  livre = { fw: Math.max(0.3, (W - l - r) / W), fh: Math.max(0.3, (H - t - b) / H) };
}
function redimensionar() {
  const w = tela.clientWidth || 1, h = tela.clientHeight || 1;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 640 ? 50 : 42; margens(); camera.updateProjectionMatrix(); pedir();
}
new ResizeObserver(redimensionar).observe(tela);

// ---------- dados ----------
async function lerJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: arquivo não encontrado (${r.status})`);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch (e) { throw new Error(`${url}: JSON inválido — ${e.message}`); }
}
const chaveRascunho = id => `casa-sitio/rascunho/${id}`;
function guardar(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* armazenamento indisponível */ } }
function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
const sujo = id => JSON.stringify(P.dados[id]) !== P.originais[id];

function resolverSala(id) {
  const s = P.malha.porId[id], d = P.dados[id] || {}, forro = P.forroDe(id);
  P.res[id] = (Array.isArray(d.pecas) ? d.pecas : []).filter(p => p && typeof p === 'object').map(p => {
    const def = tipoDe(p);
    try { return { p, def, env: def ? resolver(p, s, def, forro) : null }; }
    catch (e) { console.error('Peça', p.id, e); return { p, def: null, env: null, erroDado: e.message }; }   // um dado estranho não derruba o cômodo
  });
}
const pisoDe = id => ((P.dados[id] || {}).acabamentos || {}).piso || P.malha.porId[id].c.piso || 'porcelanato-bege';
function pinturaDe(id, lado) {
  const d = ((P.dados[id] || {}).acabamentos || {}).paredes, base = (P.casa.acabamentos || {}).paredeInterna || 'parede-branca';
  return !d ? base : typeof d === 'string' ? d : d[lado] || d.padrao || base;
}

// ---------- casca: pisos, paredes, varanda ----------
function matFace(f) {
  const ac = P.casa.acabamentos || {};
  switch (f.classe) {
    case 'pele': return pinturaDe(f.sala, f.ladoPele);
    case 'fachada': return ac.fachada || 'fachada-verde';
    case 'topo': case 'planta': return ac.corte || 'corte-parede';
    case 'soleira': return f.pisoDe ? pisoDe(f.pisoDe) : ac.soleira || 'granito-cinza';
    default: return ac.paredeInterna || 'parede-branca';
  }
}
function lotear(faces, sombra) {
  const lotes = new Map(), g = new THREE.Group();
  for (const f of faces) { const k = matFace(f); let l = lotes.get(k); if (!l) lotes.set(k, (l = new Lote())); l.face(f.pts, f.n); }
  for (const [k, l] of lotes) { const me = l.malha(P.mats.get(k)); me.castShadow = !!sombra; me.receiveShadow = true; g.add(me); }
  return g;
}
function construirCasca() {
  for (const n of ['chao', 'pisos', 'baixas', 'altas', 'salas', 'varandaBaixa', 'varandaAlta']) limpar(G[n]);
  const casa = P.casa, H = casa.peDireito, corte = num(casa.corteMaquete, 110), m = P.malha;
  const X0 = m.X[0], X1 = m.X[m.X.length - 1], Z0 = m.Z[0], Z1 = m.Z[m.Z.length - 1];
  { const l = new Lote(), [pts, n] = faceY(-1.2, X0 - 2500, X1 + 2500, Z0 - 2500, Z1 + 2500, 1); l.face(pts, n); const me = l.malha(P.mats.get('grama')); me.receiveShadow = true; G.chao.add(me); }
  for (const s of m.salas) {
    const l = new Lote(), [pts, n] = faceY(0, s.x0, s.x1, s.z0, s.z1, 1); l.face(pts, n);
    const me = l.malha(P.mats.get(pisoDe(s.id))); me.receiveShadow = true; me.userData.comodo = s.id; G.pisos.add(me);
  }
  const fb = facesParedes(m, corte), fa = facesParedes(m, H);
  G.pisos.add(lotear(fa.filter(f => f.classe === 'soleira' || f.classe === 'planta')));
  const parede = f => f.classe !== 'soleira' && f.classe !== 'planta';
  G.baixas.add(lotear(fb.filter(parede), true));
  G.altas.add(lotear(fa.filter(parede), true));
  P.cascaSala = {};
  for (const s of m.salas) {
    const g = new THREE.Group(), extras = {};
    g.add(lotear(fa.filter(f => (f.classe === 'pele' || f.classe === 'fachada') && f.sala === s.id)));
    for (const lado of LADOS) { extras[lado] = lotear(fa.filter(f => ['vao', 'topo', 'peitoril', 'verga'].includes(f.classe) && f.lados.some(l => l.sala === s.id && l.lado === lado))); g.add(extras[lado]); }
    g.visible = false; G.salas.add(g); P.cascaSala[s.id] = { g, extras };
  }
  const v = casa.varanda;
  if (v && v.pilares) {
    const r = num(v.pilares.diametro, 18) / 2, mat = P.mats.get(v.pilares.material || 'madeira-mel');
    for (const [x, z] of v.pilares.posicoes || []) for (const [grupo, h] of [[G.varandaBaixa, corte], [G.varandaAlta, H]]) {
      const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), mat); me.geometry.userData.descartavel = true; me.position.set(x, h / 2, z); me.castShadow = me.receiveShadow = true; grupo.add(me);
    }
    const vg = v.vigas || {}, ha = num(vg.altura, 20), la = num(vg.largura, 12);
    for (const [xa, za, xb, zb] of vg.trechos || []) {
      const me = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(xb - xa) + la, ha, Math.abs(zb - za) + la), P.mats.get(vg.material || 'madeira-mel'));
      me.geometry.userData.descartavel = true; me.position.set((xa + xb) / 2, H - ha / 2, (za + zb) / 2); me.castShadow = true; G.varandaAlta.add(me);
    }
  }
}

// ---------- portas, vãos e janelas ----------
function construirEsquadrias() {
  limpar(G.esquadrias); limpar(G.arcos); P.aberturas = [];
  const t = P.casa.espessuraParede, ladosDe = {};
  for (const s of P.malha.salas) for (const ab of aberturasDaSala(P.malha, s)) (ladosDe[ab.a.id] = ladosDe[ab.a.id] || []).push({ sala: s.id, lado: ab.parede });
  for (const v of P.malha.vaos) {
    if (!v.r) continue;
    const a = v.a, g = new THREE.Group(), mx = matrizAbertura(a, v.r, v.sala);
    g.matrixAutoUpdate = false; g.matrix.copy(mx); g.matrixWorldNeedsUpdate = true;
    const M = new Montagem({ mats: P.mats }, g);
    let arcos = [];
    try { arcos = construirAbertura(M, a, a.largura, t); fundir(g); } catch (e) { console.error('Abertura', a.id, e); }
    g.userData = { abertura: a, acoes: M.acoes };
    G.esquadrias.add(g);
    for (const pts of arcos) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map(([x, z]) => new THREE.Vector3(x, 0.9, z))); geo.userData.descartavel = true;
      const ln = new THREE.Line(geo, matArco); ln.matrixAutoUpdate = false; ln.matrix.copy(mx); ln.matrixWorldNeedsUpdate = true; G.arcos.add(ln);
    }
    P.aberturas.push({ a, r: v.r, g, lados: ladosDe[a.id] || [{ sala: a.comodo, lado: a.parede }] });
  }
}

// ---------- visão geral: blocos simples e pontos técnicos ----------
let discoTex = null;
function texturaDisco() {
  if (discoTex) return discoTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
  return (discoTex = new THREE.CanvasTexture(c));
}
const COR_CAMADA = { eletrica: 0xc8412c, iluminacao: 0xd99a1c, hidraulica: 0x2f6fb0 };
function construirBlocos() {
  limpar(G.blocos); limpar(G.pontos);
  const itens = [], pts = { eletrica: [], iluminacao: [], hidraulica: [] };
  for (const s of P.malha.salas) for (const r of P.res[s.id] || []) {
    if (!r.def || !r.env) continue;
    const e = r.env;
    if (r.def.camada === 'moveis' && r.def.colide) itens.push({ s, r });
    else if (pts[r.def.camada]) pts[r.def.camada].push(s.x + (e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, s.z + (e.z0 + e.z1) / 2);
  }
  if (itens.length) {
    const im = new THREE.InstancedMesh(geoCubo, matBloco, itens.length), mx = new THREE.Matrix4(), cor = new THREE.Color();
    itens.forEach(({ s, r }, i) => { const e = r.env; mx.makeScale(e.x1 - e.x0, e.y1 - e.y0, e.z1 - e.z0).setPosition(s.x + (e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, s.z + (e.z0 + e.z1) / 2); im.setMatrixAt(i, mx); im.setColorAt(i, cor.set(P.mats.corDe(materialPrincipal(r.p, r.def)))); });
    im.castShadow = im.receiveShadow = true; G.blocos.add(im);
  }
  for (const [cam, arr] of Object.entries(pts)) {
    if (!arr.length) continue;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.userData.descartavel = true;
    const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 11, sizeAttenuation: false, color: COR_CAMADA[cam], map: texturaDisco(), alphaTest: 0.4, transparent: true }));
    p.material.userData.descartavel = true; p.userData.camada = cam; G.pontos.add(p);
  }
}

// ---------- detalhe do cômodo ----------
function construirDetalhe(id) {
  const velho = P.detalhe[id];
  if (velho) { for (const pg of velho.pecas) for (const a of pg.userData.acoes) animando.delete(a); G.detalhes.remove(velho.g); limpar(velho.g); }
  const s = P.malha.porId[id], forro = P.forroDe(id), g = new THREE.Group(), pecas = [];
  let falhou = false;
  for (const r of P.res[id] || []) {
    if (!r.def || !r.env) continue;
    const pg = new THREE.Group(); pg.matrixAutoUpdate = false; pg.matrix.copy(matrizLocal(r.env, s)); pg.matrixWorldNeedsUpdate = true;
    const M = new Montagem({ mats: P.mats }, pg);
    r.erroConstrucao = null;
    try { r.def.construir(M, r.p, r.env); fundir(pg); }
    catch (e) {                                                    // peça que não monta vira um bloco vermelho no lugar dela, e o resto do cômodo segue
      console.warn('Peça', r.p.id, 'não pôde ser desenhada:', e.message); r.erroConstrucao = e.message; falhou = true;
      limpar(pg); M.acoes.length = 0; M.luzes.length = 0;
      try { M.cx(0, r.env.L, 0, r.env.A, 0, r.env.P, '#d9534f'); } catch (e2) { /* sem bloco */ }
    }
    pg.userData = { peca: r.p, comodo: id, camada: r.def.camada, r, acoes: M.acoes, luzes: M.luzes };
    g.add(pg); pecas.push(pg);
  }
  let forroBaixo = null, forroCima = null;
  if (!s.aberto) {
    const fd = (P.dados[id] || {}).forro || {};
    const l = new Lote(), [pts, n] = faceY(forro, s.x0, s.x1, s.z0, s.z1, -1); l.face(pts, n);
    forroBaixo = l.malha(P.mats.get(fd.material || 'forro-branco')); g.add(forroBaixo);
    const l2 = new Lote(), [p2, n2] = faceY(forro, s.x0, s.x1, s.z0, s.z1, 1); l2.face(p2, n2);
    forroCima = l2.malha(new THREE.MeshBasicMaterial({ color: 0x9fb6c9, transparent: true, opacity: 0.32, depthWrite: false })); forroCima.material.userData.descartavel = true; g.add(forroCima);
  }
  g.visible = false; G.detalhes.add(g);
  P.detalhe[id] = { g, pecas, forroBaixo, forroCima };
  if (falhou) queueMicrotask(() => { P.problemas = conferir(); atualizarUI(); });
}

// ---------- o que aparece ----------
const conjuntoDe = id => { const s = P.malha.porId[id]; return s && s.conjunto ? P.malha.salas.filter(q => q.conjunto === s.conjunto).map(q => q.id) : [id]; };
function atualizarVisibilidade() {
  desenharEixos(); G.ref.visible = !!E.foco && E.ref; if (!E.foco) { elFixa.hidden = true; elSonda.hidden = true; }
  const emSala = !!E.foco, modo = E.paredes, temVaranda = E.ids.some(i => P.malha.porId[i].aberto);
  G.baixas.visible = !emSala && modo === 'auto';
  G.altas.visible = !emSala && modo === 'inteiras';
  G.varandaBaixa.visible = !emSala && modo !== 'inteiras';
  G.varandaAlta.visible = (emSala && temVaranda) || (!emSala && modo === 'inteiras');
  for (const id in P.cascaSala) P.cascaSala[id].g.visible = emSala && E.ids.includes(id) && modo !== 'ocultas';
  G.blocos.visible = !emSala && !!E.cam.moveis;
  for (const p of G.pontos.children) p.visible = !emSala && !!E.cam[p.userData.camada];
  for (const id in P.detalhe) {
    const d = P.detalhe[id], on = emSala && E.ids.includes(id);
    d.g.visible = on;
    if (!on) continue;
    for (const pg of d.pecas) pg.visible = !!E.cam[pg.userData.camada];
    if (d.forroCima) d.forroCima.visible = !!E.cam.forro;
  }
  if (!emSala) for (const ab of P.aberturas) ab.g.visible = modo === 'inteiras';
  G.pessoa.visible = emSala && E.pessoa;
  aplicarLuzes();
  sombraSuja = true; pedir();
}
// Paredes entre a câmera e o cômodo somem sozinhas (as faces internas só existem do lado de dentro).
// Aqui escondemos também o topo e as laterais dos vãos dessas paredes, e as esquadrias delas.
const v3 = new THREE.Vector3();
function atualizarLados() {
  if (!E.foco) return;
  const cx = camera.position.x / U, cz = camera.position.z / U, vis = {};
  for (const id of E.ids) {
    const s = P.malha.porId[id], cs = P.cascaSala[id];
    vis[id] = { fundos: cz > s.z0, frente: cz < s.z1, esquerda: cx > s.x0, direita: cx < s.x1 };
    for (const lado of LADOS) cs.extras[lado].visible = vis[id][lado];
  }
  for (const ab of P.aberturas) { const ls = ab.lados.filter(l => vis[l.sala]); ab.g.visible = E.paredes !== 'ocultas' && ls.length > 0 && ls.some(l => vis[l.sala][l.lado]); }
}

// ---------- luzes ----------
const luzLigada = p => E.luz[p.id] ?? (p.ligada !== false);
function aplicarLuzes() {
  const n = E.noite;
  hemi.intensity = n ? 0.07 : 0.52; sol.intensity = n ? 0 : 1.85; cena.environmentIntensity = n ? 0.02 : 0.22;
  cena.background.set(n ? 0x14181a : 0xe9eee6);
  document.body.classList.toggle('noite', n);
  for (const id of E.ids) {
    const d = P.detalhe[id]; if (!d) continue;
    for (const pg of d.pecas) {
      const ls = pg.userData.luzes; if (!ls.length) continue;
      const on = luzLigada(pg.userData.peca) && pg.visible;
      for (const l of ls) { l.luz.intensity = on ? l.base * (n ? 1 : 0.12) : 0; for (const m of l.emissivos) m.emissiveIntensity = on ? (n ? 2.4 : 0.9) : 0; }
    }
  }
  pedir();
}

// ---------- câmera ----------
function limites() {
  const ss = E.foco ? E.ids.map(i => P.malha.porId[i]) : null, m = P.malha;
  if (!ss) return { x0: m.X[0], x1: m.X[m.X.length - 1], z0: m.Z[0], z1: m.Z[m.Z.length - 1] };
  return { x0: Math.min(...ss.map(s => s.x0)), x1: Math.max(...ss.map(s => s.x1)), z0: Math.min(...ss.map(s => s.z0)), z1: Math.max(...ss.map(s => s.z1)) };
}
// Lado de onde se enxerga melhor o cômodo: a parede com menos móveis encostados.
// Devolve a direção da câmera em planta [x, z]: vem do lado mais livre, puxando um pouco
// para o segundo lado mais livre, para ver de frente o que está nas paredes cheias.
const VETOR = { frente: [0, 1], fundos: [0, -1], esquerda: [-1, 0], direita: [1, 0] };
function direcaoCamera() {
  if (!E.foco) return [0.3, 1];
  const pref = ((P.dados[E.foco] || {}).camera || {}).de;
  const s = P.malha.porId[E.foco], peso = { frente: 0, direita: 0.01, esquerda: 0.02, fundos: 0.03 };
  if (E.ids.length === 1) for (const r of P.res[E.foco] || []) {
    if (!r.def || !r.def.colide || !r.env) continue;
    const e = r.env, k = e.A > 120 ? 2 : 1;
    if (e.z0 < 6) peso.fundos += (e.x1 - e.x0) * k; if (s.profundidade - e.z1 < 6) peso.frente += (e.x1 - e.x0) * k;
    if (e.x0 < 6) peso.esquerda += (e.z1 - e.z0) * k; if (s.largura - e.x1 < 6) peso.direita += (e.z1 - e.z0) * k;
  }
  const ordem = Object.entries(peso).sort((a, b) => a[1] - b[1]).map(e => e[0]);
  const a = EIXO[pref] ? pref : ordem[0], b = ordem.find(l => EIXO[l] !== EIXO[a]);
  return [VETOR[a][0] + VETOR[b][0] * 0.38, VETOR[a][1] + VETOR[b][1] * 0.38];
}
function enquadrar(vista, instantaneo) {
  const b = limites(), cx = ((b.x0 + b.x1) / 2) * U, cz = ((b.z0 + b.z1) / 2) * U, w = (b.x1 - b.x0) * U, d = (b.z1 - b.z0) * U;
  const alt = E.foco ? Math.max(...E.ids.map(i => P.forroDe(i))) * U : 1.1;
  const alvo = new THREE.Vector3(cx, E.foco ? alt * 0.4 : 0.4, cz), raio = (Math.hypot(w, d, E.foco ? alt : 0) / 2) * (E.foco ? 1 : 0.86) + 0.2;
  margens(); camera.updateProjectionMatrix();
  const tv = Math.tan((camera.fov * Math.PI) / 360), fv = 2 * Math.atan(tv * livre.fh), fh = 2 * Math.atan(tv * camera.aspect * livre.fw), dist = raio / Math.sin(Math.min(fv, fh) / 2);
  const dir = direcaoCamera(), el = (E.foco ? 50 : 54) * (Math.PI / 180), n = Math.hypot(dir[0], dir[1]);
  const pos = vista === 'cima' ? new THREE.Vector3(cx, alvo.y + dist * 0.92, cz + 0.01)
    : new THREE.Vector3(cx + (dir[0] / n) * Math.cos(el) * dist, alvo.y + Math.sin(el) * dist, cz + (dir[1] / n) * Math.cos(el) * dist);
  // o sol vem do lado da câmera, um pouco de lado, para iluminar as faces que estão à vista
  const sx = dir[0] / n, sz = dir[1] / n; sol.position.set(cx + (sx * 0.5 - sz * 0.75) * raio, raio * 1.9 + 5, cz + (sz * 0.5 + sx * 0.75) * raio); sol.target.position.set(cx, 0, cz);
  Object.assign(sol.shadow.camera, { left: -raio - 1, right: raio + 1, top: raio + 1, bottom: -raio - 1, near: 0.5, far: raio * 4 + 20 }); sol.shadow.camera.updateProjectionMatrix();
  sombraSuja = true;
  if (instantaneo) { camera.position.copy(pos); controles.target.copy(alvo); tween = null; }
  else tween = { t0: performance.now(), dur: 750, p0: camera.position.clone(), p1: pos, a0: controles.target.clone(), a1: alvo };
  pedir();
}

function focar(id, o = {}) {
  if (id && !P.malha.porId[id]) id = null;
  E.foco = id || null; E.ids = id ? conjuntoDe(id) : []; E.sel = null;
  for (const i of E.ids) if (!P.detalhe[i]) construirDetalhe(i);
  posicionarPessoa(); atualizarVisibilidade(); desenharSelecao(); refazerRotulos(); enquadrar(o.vista, o.instantaneo); atualizarUI();
}

// ---------- pessoa em escala ----------
function posicionarPessoa() {
  limpar(G.pessoa);
  if (!E.foco) return;
  const s = P.malha.porId[E.foco], d = (P.dados[E.foco] || {}).pessoa || {}, alt = num(d.altura, num((P.casa.pessoa || {}).altura, 165));
  const x = s.x + (typeof d.daEsquerda === 'number' ? d.daEsquerda : typeof d.daDireita === 'number' ? s.largura - d.daDireita : s.largura / 2);
  const z = s.z + (typeof d.dosFundos === 'number' ? d.dosFundos : typeof d.daFrente === 'number' ? s.profundidade - d.daFrente : s.profundidade / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8ea59c, roughness: 0.85 }); mat.userData.descartavel = true;
  const corpo = new THREE.Mesh(new THREE.CylinderGeometry(13, 16, alt - 25, 20), mat), cab = new THREE.Mesh(new THREE.SphereGeometry(11.5, 20, 14), mat);
  corpo.geometry.userData.descartavel = cab.geometry.userData.descartavel = true;
  corpo.position.set(x, (alt - 25) / 2, z); cab.position.set(x, alt - 11.5, z); corpo.castShadow = cab.castShadow = true;
  G.pessoa.add(corpo, cab); G.pessoa.userData = { x, z, alt };
}

// ---------- rótulos ----------
const elRot = $('#rotulos');
let rotulos = [], rotSel = [];
function novoRotulo(html, x, y, z, cls, lista = rotulos) {
  const el = document.createElement('div'); el.className = 'rot ' + (cls || ''); el.innerHTML = html; elRot.appendChild(el);
  const c = cls || '', pr = c.includes('cota') ? 0 : c.includes('par') || c.includes('orig') ? 3 : c.includes('tec') ? 1 : c.includes('sala') ? 2 : c.includes('cod') ? 3 : 4;
  lista.push({ el, v: new THREE.Vector3(x * U, y * U, z * U), pr, w: el.offsetWidth, h: el.offsetHeight });
}
const curto = id => String(id).split('-').pop();
const raioRot = new THREE.Raycaster();
function refazerRotulos() {
  for (const r of rotulos) r.el.remove();
  rotulos = [];
  const m = P.malha;
  if (!E.foco) {
    for (const s of m.salas) novoRotulo(`${UI.esc(s.nome)}<small>${metros(s.largura)} × ${metros(s.profundidade)}</small>`, (s.x0 + s.x1) / 2, 30, (s.z0 + s.z1) / 2, 'sala');
    if (E.cam.etiquetas) for (const ab of P.aberturas) novoRotulo(`${UI.esc(ab.a.id)} <small>${cm(ab.a.largura)}×${cm(num(ab.a.altura, 210))}</small>`, (ab.r.x0 + ab.r.x1) / 2, Math.min(ab.r.y0 + 20, 130), (ab.r.z0 + ab.r.z1) / 2, 'cod');
  } else {
    for (const s of m.salas) if (!E.ids.includes(s.id)) novoRotulo(UI.esc(s.nome), (s.x0 + s.x1) / 2, 2, (s.z0 + s.z1) / 2, 'ctx');
    if (E.cam.etiquetas) {
      for (const id of E.ids) { const s = m.porId[id];
        for (const r of P.res[id] || []) { if (!r.def || !r.env || !r.def.etiqueta || !E.cam[r.def.camada] || !r.p.id) continue; const e = r.env; novoRotulo(UI.esc(curto(r.p.id)), s.x + (e.x0 + e.x1) / 2, e.y1 + 7, s.z + (e.z0 + e.z1) / 2, 'tec ' + r.def.camada); }
        if (E.cam.forro && !s.aberto) novoRotulo(`Forro ${metros(P.forroDe(id))} m`, (s.x0 + s.x1) / 2, P.forroDe(id), (s.z0 + s.z1) / 2, 'cod');
      }
      for (const ab of P.aberturas) if (ab.lados.some(l => E.ids.includes(l.sala))) novoRotulo(UI.esc(ab.a.id), (ab.r.x0 + ab.r.x1) / 2, ab.r.y1 + 10, (ab.r.z0 + ab.r.z1) / 2, 'cod');
    }
    if (E.ref) for (const id of E.ids) {                              // referência: nome de cada parede e origem das coordenadas
      const s = m.porId[id], mx = (s.x0 + s.x1) / 2, mz = (s.z0 + s.z1) / 2, q = 14;
      const curtoDemais = Math.min(s.largura, s.profundidade) < 130;
      for (const [nome, x, z] of [['fundos', mx, s.z0 + q], ['frente', mx, s.z1 - q], ['esquerda', s.x0 + q, mz], ['direita', s.x1 - q, mz]]) novoRotulo(curtoDemais ? nome.slice(0, 3) + '.' : nome, x, 3, z, 'par');
      novoRotulo('0', s.x0 + 6, 4, s.z0 + 6, 'orig');
    }
    if (E.pessoa && G.pessoa.userData.alt) novoRotulo(`Pessoa ${metros(G.pessoa.userData.alt)} m`, G.pessoa.userData.x, G.pessoa.userData.alt + 12, G.pessoa.userData.z, 'cod');
  }
  pedir();
}
function posicionarRotulos() {
  const w = tela.clientWidth / 2, h = tela.clientHeight / 2, postos = [], peles = E.foco && E.paredes !== 'ocultas' ? E.ids.map(i => P.cascaSala[i].g.children[0]) : [];
  // os mais importantes primeiro; quem bater em um já colocado fica escondido
  for (const r of rotSel.concat(rotulos).sort((a, b) => a.pr - b.pr)) {
    v3.copy(r.v).project(camera);
    let ok = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
    const x = v3.x * w + w, y = -v3.y * h + h;
    if (ok && r.pr === 4 && peles.length) {            // nome de cômodo vizinho escondido por uma parede não aparece
      const dist = camera.position.distanceTo(r.v); raioRot.set(camera.position, v3.copy(r.v).sub(camera.position).normalize()); raioRot.far = dist - 0.1;
      if (raioRot.intersectObjects(peles, true).length) ok = false;
    }
    if (ok) for (const q of postos) if (Math.abs(x - q.x) < (r.w + q.w) / 2 + 2 && Math.abs(y - q.y) < (r.h + q.h) / 2 + 2) { ok = false; break; }
    r.el.style.display = ok ? '' : 'none';
    if (ok) { postos.push({ x, y, w: r.w, h: r.h }); r.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`; }
  }
}

// ---------- seleção, folgas e cotas ----------
const achar = sel => (sel && sel.tipo === 'peca' ? (P.res[sel.comodo] || []).find(r => r.p.id === sel.id) : null);
const grupoDa = sel => (sel && sel.tipo === 'peca' && P.detalhe[sel.comodo] ? P.detalhe[sel.comodo].pecas.find(g => g.userData.peca.id === sel.id) : sel && sel.tipo === 'abertura' ? (P.aberturas.find(a => a.a.id === sel.id) || {}).g : null);
function folgasDe(id, r) {
  const s = P.malha.porId[id], e = r.env, W = s.largura, D = s.profundidade, out = [];
  if (r.def.ponto || r.def.fixacao === 'teto' || r.def.fixacao === 'pontoPiso') return out;
  const outros = (P.res[id] || []).filter(q => q !== r && q.def && q.def.colide && q.env && q.p.dentroDe !== r.p.id && r.p.dentroDe !== q.p.id && q.p.sobre !== r.p.id && r.p.sobre !== q.p.id && q.env.y0 < e.y1 - 0.5 && q.env.y1 > e.y0 + 0.5);
  const emZ = q => q.env.z0 < e.z1 - 0.5 && q.env.z1 > e.z0 + 0.5, emX = q => q.env.x0 < e.x1 - 0.5 && q.env.x1 > e.x0 + 0.5;
  const busca = (filtro, borda, melhor, base, nome) => { let lim = base, quem = nome; for (const q of outros) if (filtro(q)) { const b = borda(q); if (melhor(b, lim)) { lim = b; quem = q.p.id; } } return { lim, quem }; };
  const a = busca(q => emZ(q) && q.env.x1 <= e.x0 + 0.5, q => q.env.x1, (b, l) => b > l, 0, 'parede esquerda');
  const b = busca(q => emZ(q) && q.env.x0 >= e.x1 - 0.5, q => q.env.x0, (v, l) => v < l, W, 'parede direita');
  const c = busca(q => emX(q) && q.env.z1 <= e.z0 + 0.5, q => q.env.z1, (v, l) => v > l, 0, 'parede dos fundos');
  const d = busca(q => emX(q) && q.env.z0 >= e.z1 - 0.5, q => q.env.z0, (v, l) => v < l, D, 'parede da frente');
  const zc = (e.z0 + e.z1) / 2, xc = (e.x0 + e.x1) / 2;
  out.push({ lado: 'Esquerda', dist: e.x0 - a.lim, quem: a.quem, p0: [a.lim, zc], p1: [e.x0, zc] }, { lado: 'Direita', dist: b.lim - e.x1, quem: b.quem, p0: [e.x1, zc], p1: [b.lim, zc] },
    { lado: 'Fundos', dist: e.z0 - c.lim, quem: c.quem, p0: [xc, c.lim], p1: [xc, e.z0] }, { lado: 'Frente', dist: d.lim - e.z1, quem: d.quem, p0: [xc, e.z1], p1: [xc, d.lim] });
  return out.filter(f => f.dist > 0.5);
}
function desenharSelecao() {
  limpar(G.selecao); for (const r of rotSel) r.el.remove(); rotSel = [];
  const r = achar(E.sel);
  if (r && r.env) {
    const s = P.malha.porId[E.sel.comodo], e = r.env, cx = s.x + (e.x0 + e.x1) / 2, cz = s.z + (e.z0 + e.z1) / 2;
    const cubo = new THREE.LineSegments(geoAresta, matSel); cubo.renderOrder = 20;
    cubo.scale.set(e.x1 - e.x0 + 1, e.y1 - e.y0 + 1, e.z1 - e.z0 + 1); cubo.position.set(cx, (e.y0 + e.y1) / 2, cz); G.selecao.add(cubo);
    const pts = [], linha = (a, b) => pts.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
    if (r.def.ponto && EIXO[r.p.parede]) {
      // tomada, interruptor, ponto: distância do eixo até os dois cantos da parede e até o piso
      const ax = EIXO[r.p.parede] === 'x', y = (e.y0 + e.y1) / 2, tot = ax ? s.largura : s.profundidade, c = ax ? (e.x0 + e.x1) / 2 : (e.z0 + e.z1) / 2;
      const fixo = { fundos: 1, frente: s.profundidade - 1, esquerda: 1, direita: s.largura - 1 }[r.p.parede], pt = v => (ax ? [s.x + v, y, s.z + fixo] : [s.x + fixo, y, s.z + v]);
      linha(pt(0), pt(c)); linha(pt(c), pt(tot));
      const base = pt(c); linha([base[0], 0, base[2]], base);
      const m1 = pt(c / 2), m2 = pt((c + tot) / 2);
      novoRotulo(cm(c), m1[0], m1[1], m1[2], 'cota', rotSel); novoRotulo(cm(tot - c), m2[0], m2[1], m2[2], 'cota', rotSel); novoRotulo(cm(y), base[0], y / 2, base[2], 'cota', rotSel);
    } else {
      const y = Math.max(2, e.y0 + 2);
      for (const f of folgasDe(E.sel.comodo, r)) { linha([s.x + f.p0[0], y, s.z + f.p0[1]], [s.x + f.p1[0], y, s.z + f.p1[1]]); novoRotulo(cm(f.dist), s.x + (f.p0[0] + f.p1[0]) / 2, y, s.z + (f.p0[1] + f.p1[1]) / 2, 'cota', rotSel); }
    }
    if (pts.length) { const geo = new THREE.BufferGeometry().setFromPoints(pts); geo.userData.descartavel = true; const ln = new THREE.LineSegments(geo, matCota); ln.renderOrder = 21; G.selecao.add(ln); }
  } else if (E.sel && E.sel.tipo === 'abertura') {
    const ab = P.aberturas.find(a => a.a.id === E.sel.id);
    if (ab) { const cubo = new THREE.LineSegments(geoAresta, matSel); cubo.renderOrder = 20; cubo.scale.set(ab.r.x1 - ab.r.x0 + 2, ab.r.y1 - ab.r.y0 + 2, ab.r.z1 - ab.r.z0 + 2); cubo.position.set((ab.r.x0 + ab.r.x1) / 2, (ab.r.y0 + ab.r.y1) / 2, (ab.r.z0 + ab.r.z1) / 2); G.selecao.add(cubo); }
  }
  pedir();
}
function selecionar(sel) { E.sel = sel; if (sel) E.fichaMin = false; desenharSelecao(); atualizarUI(); }

function acionar(a) { a.alvo = a.alvo ? 0 : 1; animando.add(a); pedir(); }
function alternarLuz(ids, forcar) {
  const acha = i => E.ids.map(c => (P.res[c] || []).find(q => q.p.id === i)).find(Boolean);
  const todas = ids.every(i => { const r = acha(i); return r ? luzLigada(r.p) : false; });
  for (const i of ids) E.luz[i] = forcar ?? !todas;
  aplicarLuzes();
}

// toque / clique
const raio = new THREE.Raycaster(), ndc = new THREE.Vector2();
let toque = null;
tela.addEventListener('pointerdown', e => { toque = { x: e.clientX, y: e.clientY, t: performance.now() }; });
tela.addEventListener('pointerup', e => {
  if (!toque) return;
  const d = Math.hypot(e.clientX - toque.x, e.clientY - toque.y), dt = performance.now() - toque.t; toque = null;
  if (d > 7 || dt > 700) return;
  const b = tela.getBoundingClientRect();
  ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); raio.setFromCamera(ndc, camera);
  if (!E.foco) { const hit = raio.intersectObjects(G.pisos.children.filter(o => o.userData.comodo), false)[0]; if (hit) focar(hit.object.userData.comodo); return; }
  const alvos = []; for (const id of E.ids) for (const pg of P.detalhe[id].pecas) if (pg.visible) alvos.push(pg);
  for (const ab of P.aberturas) if (ab.g.visible) alvos.push(ab.g);
  for (const hit of raio.intersectObjects(alvos, true)) {
    let o = hit.object; while (o && !(o.userData.peca || o.userData.abertura)) o = o.parent;
    if (!o) continue;
    if (o.userData.abertura) { for (const a of o.userData.acoes) acionar(a); selecionar({ tipo: 'abertura', id: o.userData.abertura.id }); return; }
    const p = o.userData.peca;
    if (!E.editar) { if (p.tipo === 'interruptor' && (p.comanda || []).length) alternarLuz(p.comanda); else if (o.userData.luzes.length) alternarLuz([p.id]); }
    selecionar({ tipo: 'peca', comodo: o.userData.comodo, id: p.id }); return;
  }
  selecionar(null);
});

// ---------- referência: o que está sob o cursor, em medidas que servem para o pedido ----------
// O cálculo é geométrico (raio contra o piso e as quatro paredes do cômodo), sem varrer a malha das paredes.
// Só as peças passam pelo raycaster. Roda no máximo uma vez por quadro e nunca durante o arrasto da câmera.
const elSonda = $('#sonda'), elFixa = $('#sondaFixa'), ARTIGO = { fundos: 'dos fundos', frente: 'da frente', esquerda: 'esquerda', direita: 'direita' };
const matRef = new THREE.LineBasicMaterial({ color: 0x1f6fd6, depthTest: false, transparent: true });
const geoRef = new THREE.BufferGeometry(); geoRef.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
const linRef = new THREE.LineSegments(geoRef, matRef); linRef.renderOrder = 22; linRef.frustumCulled = false; linRef.visible = false; G.ref.add(linRef);
const eixos = new THREE.Group(); G.ref.add(eixos);
function desenharEixos() {
  limpar(eixos);
  if (!E.foco || !E.ref) return;
  for (const id of E.ids) {
    const s = P.malha.porId[id], c = 45, o = [s.x0 + 1, 1, s.z0 + 1];
    for (const [cor, d] of [[0xd0402c, [c, 0, 0]], [0x2f9e57, [0, c, 0]], [0x1f6fd6, [0, 0, c]]]) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...o), new THREE.Vector3(o[0] + d[0], o[1] + d[1], o[2] + d[2])]); g.userData.descartavel = true;
      const mt = new THREE.LineBasicMaterial({ color: cor, depthTest: false, transparent: true }); mt.userData.descartavel = true;
      const l = new THREE.Line(g, mt); l.renderOrder = 19; eixos.add(l);
    }
  }
}
const r1 = v => Math.round(v);
function lerPonto(px, py) {
  if (!E.foco) return null;
  const b = tela.getBoundingClientRect();
  ndc.set(((px - b.left) / b.width) * 2 - 1, -((py - b.top) / b.height) * 2 + 1); raio.setFromCamera(ndc, camera);
  const o = raio.ray.origin, d = raio.ray.direction, ox = o.x / U, oy = o.y / U, oz = o.z / U;
  let melhor = null;
  const tenta = (t, dados) => { if (t > 0.5 && (!melhor || t < melhor.t)) melhor = { t, ...dados }; };
  for (const id of E.ids) {
    const s = P.malha.porId[id], H = P.forroDe(id);
    if (d.y < -1e-6) { const t = -oy / d.y, x = ox + d.x * t, z = oz + d.z * t; if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) tenta(t, { tipo: 'piso', s, x: x - s.x0, y: 0, z: z - s.z0 }); }
    if (s.aberto) continue;
    const abs = aberturasDaSala(P.malha, s);
    for (const [parede, eixo, plano, entra] of [['fundos', 'z', s.z0, d.z < 0], ['frente', 'z', s.z1, d.z > 0], ['esquerda', 'x', s.x0, d.x < 0], ['direita', 'x', s.x1, d.x > 0]]) {
      if (!entra) continue;
      const t = eixo === 'z' ? (plano - oz) / d.z : (plano - ox) / d.x, x = ox + d.x * t - s.x0, y = oy + d.y * t, z = oz + d.z * t - s.z0;
      const ao = eixo === 'z' ? x : z, tot = eixo === 'z' ? s.largura : s.profundidade;
      if (y < 0 || y > H || ao < 0 || ao > tot) continue;
      const ab = abs.find(a => a.parede === parede && ao >= a.s0 && ao <= a.s1 && y >= a.y0 && y <= a.y1);
      if (ab && ab.a.integrado) continue;                       // não há parede ali: o raio segue para o outro trecho do cômodo
      tenta(t, { tipo: 'parede', s, parede, x: eixo === 'z' ? x : (parede === 'esquerda' ? 0 : s.largura), y, z: eixo === 'x' ? z : (parede === 'fundos' ? 0 : s.profundidade), ao, tot, ab: ab ? ab.a : null });
    }
  }
  const alvos = []; for (const id of E.ids) for (const pg of P.detalhe[id].pecas) if (pg.visible) alvos.push(pg);
  const hit = raio.intersectObjects(alvos, true)[0];
  if (hit && (!melhor || hit.distance / U < melhor.t + 0.5)) {
    let g = hit.object; while (g && !g.userData.peca) g = g.parent;
    if (g) { const r = g.userData.r, s = P.malha.porId[g.userData.comodo]; melhor = { t: hit.distance / U, tipo: 'peca', s, r, x: hit.point.x / U - s.x0, y: hit.point.y / U, z: hit.point.z / U - s.z0 }; }
  }
  if (!melhor) return null;
  const m = melhor, s = m.s, W = s.largura, D = s.profundidade, X = r1(m.x), Y = r1(m.y), Z = r1(m.z), sx = s.x0, sz = s.z0, ref = { ...m, guias: [] };
  const xyz = `X ${X} · Y ${Y} · Z ${Z}`;
  const perto = (v, tot, a, bb) => (v <= tot - v ? [r1(v), a, r1(tot - v), bb] : [r1(tot - v), bb, r1(v), a]);
  if (m.tipo === 'parede') {
    const eX = EIXO[m.parede] === 'x', [n1, l1, n2, l2] = perto(m.ao, m.tot, eX ? 'da esquerda' : 'dos fundos', eX ? 'da direita' : 'da frente');
    ref.titulo = `Parede ${ARTIGO[m.parede]}${m.ab ? ` · ${m.ab.tipo === 'janela' ? 'janela' : m.ab.tipo === 'porta' ? 'porta' : 'vão'} ${m.ab.id}` : ''}`;
    ref.linhas = [`<b>${n1}</b> ${l1} · ${n2} ${l2}`, `<b>${Y}</b> do piso`, xyz];
    ref.copia = `na parede ${ARTIGO[m.parede]} do cômodo ${s.nome}, a ${n1} cm ${l1} e ${Y} cm do piso`;
    ref.json = `"parede": "${m.parede}", "${{ 'da esquerda': 'daEsquerda', 'da direita': 'daDireita', 'dos fundos': 'dosFundos', 'da frente': 'daFrente' }[l1]}": ${n1}, "doPiso": ${Y}`;
    const wx = sx + m.x, wz = sz + m.z, fim = l1 === 'da esquerda' || l1 === 'dos fundos' ? 0 : m.tot, e = 1.5;
    const px2 = eX ? [sx + fim, m.y, wz + (m.parede === 'fundos' ? e : -e)] : [wx + (m.parede === 'esquerda' ? e : -e), m.y, sz + fim];
    const aqui = eX ? [wx, m.y, wz + (m.parede === 'fundos' ? e : -e)] : [wx + (m.parede === 'esquerda' ? e : -e), m.y, wz];
    ref.guias = [[aqui, px2], [aqui, [aqui[0], 0, aqui[2]]]];
  } else if (m.tipo === 'piso') {
    const [a1, la, a2, lb] = perto(m.x, W, 'da esquerda', 'da direita'), [c1, lc, c2, ld] = perto(m.z, D, 'dos fundos', 'da frente');
    ref.titulo = `Piso · ${s.nome}`;
    ref.linhas = [`<b>${a1}</b> ${la} · ${a2} ${lb}`, `<b>${c1}</b> ${lc} · ${c2} ${ld}`, xyz];
    ref.copia = `no piso do cômodo ${s.nome}, a ${a1} cm da parede ${la.slice(3)} e ${c1} cm da parede ${lc.replace(/^d[ao]s? /, lc.startsWith('dos') ? 'dos ' : 'da ')}`;
    const chave = { 'da esquerda': 'daEsquerda', 'da direita': 'daDireita', 'dos fundos': 'dosFundos', 'da frente': 'daFrente' };
    ref.json = `"${chave[la]}": ${a1}, "${chave[lc]}": ${c1}`;
    const aqui = [sx + m.x, 1.5, sz + m.z];
    ref.guias = [[aqui, [la === 'da esquerda' ? sx : sx + W, 1.5, aqui[2]]], [aqui, [aqui[0], 1.5, lc === 'dos fundos' ? sz : sz + D]]];
  } else {
    const p = m.r.p, e = m.r.env, def = m.r.def;
    ref.titulo = `${p.id} · ${def.rotulo || p.tipo}`;
    ref.linhas = [def.ponto ? `eixo a <b>${r1((e.y0 + e.y1) / 2)}</b> do piso` : `<b>${cm(e.L)} × ${cm(e.P)} × ${cm(e.A)}</b> cm (L × P × A)`,
      `${p.parede ? 'parede ' + ARTIGO[p.parede] + ' · ' : ''}base a ${cm(e.y0)} · topo a ${cm(e.y1)}`, `neste ponto: ${xyz}`];
    ref.copia = `a peça ${p.id} (${def.rotulo || p.tipo}${p.nome ? ', ' + p.nome : ''}) do cômodo ${s.nome}`;
    ref.json = `"id": "${p.id}"`;
  }
  return ref;
}
let sondaPend = null, sondaAtual = null;
function mostrarSonda(ref, px, py) {
  sondaAtual = ref;
  const pos = geoRef.attributes.position; let n = 0;
  if (ref) for (const [a, b2] of ref.guias) { pos.setXYZ(n++, ...a); pos.setXYZ(n++, ...b2); }
  for (let i = n; i < 8; i++) pos.setXYZ(i, 0, -9999, 0);
  pos.needsUpdate = true; linRef.visible = !!ref && n > 0;
  if (!ref) { elSonda.hidden = true; pedir(); return; }
  elSonda.innerHTML = `<strong>${UI.esc(ref.titulo)}</strong>${ref.linhas.map(l => `<span>${l}</span>`).join('')}<em>duplo clique fixa · C copia</em>`;
  elSonda.hidden = false;
  const b = tela.getBoundingClientRect(), w = elSonda.offsetWidth, h = elSonda.offsetHeight;
  elSonda.style.transform = `translate(${Math.min(px - b.left + 16, b.width - w - 8).toFixed(0)}px,${Math.max(8, Math.min(py - b.top + 18, b.height - h - 8)).toFixed(0)}px)`;
  pedir();
}
function fixarSonda(ref, px, py) {
  if (!ref) return;
  elFixa.innerHTML = `<strong>${UI.esc(ref.titulo)}</strong>${ref.linhas.map(l => `<span>${l}</span>`).join('')}<code>${UI.esc(ref.json)}</code>
    <div class="botoes"><button class="primario" data-acao="ref-pedido">Pôr no pedido da IA</button><button data-acao="ref-copiar">Copiar</button><button data-acao="ref-fechar">Fechar</button></div>`;
  elFixa.hidden = false; elFixa.ref = ref;
  const b = tela.getBoundingClientRect(), w = elFixa.offsetWidth, h = elFixa.offsetHeight;
  elFixa.style.transform = `translate(${Math.max(8, Math.min(px - b.left + 14, b.width - w - 8)).toFixed(0)}px,${Math.max(8, Math.min(py - b.top + 14, b.height - h - 8)).toFixed(0)}px)`;
  elSonda.hidden = true;
}
const textoRef = ref => `${ref.copia}  [${ref.json}]`;
tela.addEventListener('pointermove', e => {
  if (!E.ref || !E.foco || e.pointerType !== 'mouse' || e.buttons) { if (!elSonda.hidden) mostrarSonda(null); return; }
  const novo = !sondaPend; sondaPend = { x: e.clientX, y: e.clientY };
  if (novo) requestAnimationFrame(() => { const q = sondaPend; sondaPend = null; if (q && E.ref && E.foco) mostrarSonda(lerPonto(q.x, q.y), q.x, q.y); });
});
tela.addEventListener('pointerleave', () => { sondaPend = null; mostrarSonda(null); });
tela.addEventListener('dblclick', e => { if (E.ref && E.foco) fixarSonda(lerPonto(e.clientX, e.clientY), e.clientX, e.clientY); });
// toque ou caneta: segurar parado por meio segundo fixa a referência
let segura = null;
tela.addEventListener('pointerdown', e => { clearTimeout(segura); if (e.pointerType === 'mouse' || !E.ref || !E.foco) return; const x = e.clientX, y = e.clientY; segura = setTimeout(() => { if (toque && Math.hypot(toque.x - x, toque.y - y) < 8) { const ref = lerPonto(x, y); mostrarSonda(ref, x, y); fixarSonda(ref, x, y); toque = null; } }, 520); });
for (const ev of ['pointerup', 'pointercancel']) tela.addEventListener(ev, () => clearTimeout(segura));
tela.addEventListener('pointermove', e => { if (segura && toque && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) > 8) clearTimeout(segura); });
controles.addEventListener('start', () => { elFixa.hidden = true; });

// ---------- conferência (nunca derruba a página) ----------
function conferir() {
  let lista;
  try { lista = validar(P); } catch (e) { console.error(e); lista = [{ nivel: 'erro', comodo: null, id: null, msg: 'A conferência automática falhou: ' + e.message }]; }
  for (const [id, notas] of Object.entries(P.notas)) for (const n of notas)
    lista.push({ nivel: n.nivel === 'conserto' ? 'aviso' : n.nivel, comodo: id, id: n.id, msg: (n.nivel === 'conserto' ? 'Corrigido ao abrir (salve para gravar): ' : '') + (n.id ? n.id + ': ' : '') + n.msg });
  for (const id of Object.keys(P.res)) for (const r of P.res[id]) if (r.erroDado) lista.push({ nivel: 'erro', comodo: id, id: r.p.id, msg: `${r.p.id || 'Peça'}: dado inválido (${r.erroDado}).` });
  const ordem = { erro: 0, aviso: 1, info: 2 };
  return lista.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

// ---------- desfazer / refazer ----------
const pilha = [], refeitos = []; let gravando = true;
function registrar(id) {
  const agora = JSON.stringify(P.dados[id]);
  if (gravando && P.instantaneo[id] !== undefined && agora !== P.instantaneo[id]) { pilha.push({ id, json: P.instantaneo[id] }); if (pilha.length > 100) pilha.shift(); refeitos.length = 0; }
  P.instantaneo[id] = agora;
}
function desfazer(volta) {
  const de = volta ? pilha : refeitos, para = volta ? refeitos : pilha, it = de.pop();
  if (!it) { aviso(volta ? 'Nada para desfazer.' : 'Nada para refazer.'); return; }
  para.push({ id: it.id, json: JSON.stringify(P.dados[it.id]) });
  P.dados[it.id] = JSON.parse(it.json); E.sel = null;
  gravando = false; try { aposEdicao(it.id, true); } finally { gravando = true; }
  if (E.foco !== it.id && !E.ids.includes(it.id)) focar(it.id);
  aviso(`${volta ? 'Desfeito' : 'Refeito'} em ${P.malha.porId[it.id].nome}.`);
}

// ---------- edição ----------
function aposEdicao(id, casca) {
  registrar(id);
  resolverSala(id);
  if (casca) { construirCasca(); }
  construirDetalhe(id); construirBlocos(); P.problemas = conferir();
  guardar(chaveRascunho(id), sujo(id) ? JSON.stringify(P.dados[id]) : null);
  posicionarPessoa(); atualizarVisibilidade(); desenharSelecao(); refazerRotulos(); atualizarUI();
}
function pecaSel() { const r = achar(E.sel); return r ? r.p : null; }
function alteracoes(id) {
  const out = [], antes = JSON.parse(P.originais[id] || '{}'), agora = P.dados[id] || {}, mapa = l => Object.fromEntries((l || []).filter(p => p && p.id).map(p => [p.id, p]));
  const a = mapa(antes.pecas), b = mapa(agora.pecas), txt = v => (v === undefined ? '(sem valor)' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  for (const k of Object.keys(b)) {
    if (!a[k]) { out.push(`+ ${k} (${b[k].tipo}) adicionada`); continue; }
    for (const c of new Set([...Object.keys(a[k]), ...Object.keys(b[k])])) if (JSON.stringify(a[k][c]) !== JSON.stringify(b[k][c])) out.push(`${k}.${c}: ${txt(a[k][c])} → ${txt(b[k][c])}`);
  }
  for (const k of Object.keys(a)) if (!b[k]) out.push(`− ${k} removida`);
  for (const c of ['forro', 'acabamentos', 'pessoa', 'camera']) if (JSON.stringify(antes[c]) !== JSON.stringify(agora[c])) out.push(`${c}: ${txt(antes[c])} → ${txt(agora[c])}`);
  return out;
}
function paraPublicar(id) {
  const d = JSON.parse(JSON.stringify(P.dados[id])), antes = JSON.parse(P.originais[id] || '{}'), n = parseInt(antes.revisao, 10);
  d.revisao = String(Number.isFinite(n) ? n + 1 : 1).padStart(2, '0'); d.data = new Date().toISOString().slice(0, 10);
  return JSON.stringify(d, null, 2) + '\n';
}
function aviso(txt, ms = 3200) { const el = $('#aviso'); el.textContent = txt; el.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => el.classList.remove('on'), ms); }
function idLivre(base) { const usados = new Set(Object.values(P.dados).flatMap(d => (d.pecas || []).map(p => p.id))); if (!usados.has(base)) return base; let n = 2; while (usados.has(`${base}-${n}`)) n++; return `${base}-${n}`; }

async function salvarNoServidor(id, forcar) {
  let senha = ''; try { senha = sessionStorage.getItem('casa-sitio/senha') || ''; } catch (e) { /* sem sessão */ }
  if (!senha) { senha = window.prompt('Senha de edição do servidor:') || ''; if (!senha) return; }
  const corpo = paraPublicar(id);
  try {
    const r = await fetch(`api/comodo/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-senha': senha, 'x-revisao-base': String(JSON.parse(P.originais[id] || '{}').revisao ?? ''), ...(forcar ? { 'x-forcar': '1' } : {}) }, body: corpo });
    if (r.status === 409) { if (window.confirm((await r.text()) + '\n\nGravar a sua versão por cima? (a outra fica guardada no histórico)')) return salvarNoServidor(id, true); return; }
    if (r.status === 401) { try { sessionStorage.removeItem('casa-sitio/senha'); } catch (e) { /* */ } aviso('Senha incorreta.'); return; }
    if (!r.ok) throw new Error((await r.text()) || r.status);
    try { sessionStorage.setItem('casa-sitio/senha', senha); } catch (e) { /* */ }
    P.dados[id] = JSON.parse(corpo); P.originais[id] = JSON.stringify(P.dados[id]); guardar(chaveRascunho(id), null); P.notas[id] = [];
    aposEdicao(id); aviso(`Salvo no servidor: ${id}.json (rev. ${P.dados[id].revisao}).`);
  } catch (e) { aviso('Não foi possível salvar: ' + e.message, 6000); }
}
// Nova textura a partir de uma foto: reduz a imagem no aparelho, envia ao servidor e cria o material.
const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
function refazerTudo() {
  construirCasca(); construirEsquadrias(); construirBlocos();
  for (const id of Object.keys(P.detalhe)) construirDetalhe(id);
  P.problemas = conferir();
  $('#lista-materiais').innerHTML = Object.keys(P.mats.defs).map(k => `<option value="${UI.esc(k)}">`).join('');
  atualizarVisibilidade(); desenharSelecao(); refazerRotulos(); atualizarUI();
}
async function enviarTextura() {
  const arq = ($('#texArq').files || [])[0], nome = slug($('#texNome').value), lg = parseFloat($('#texL').value) || 60, al = parseFloat($('#texA').value) || lg;
  if (!arq) return aviso('Escolha a foto do material.');
  if (nome.length < 2) return aviso('Dê um nome ao material (ex.: granito-verde-ubatuba).');
  if (P.mats.defs[nome] && !P.mats.defs[nome].imagem) return aviso(`Já existe o material "${nome}" (sem foto). Use outro nome.`, 5000);
  let img;
  try { img = await createImageBitmap(arq); } catch (e) { return aviso('Não consegui ler esta imagem. Use JPG ou PNG.', 5000); }
  const k = Math.min(1, 1024 / Math.max(img.width, img.height)), c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const um = document.createElement('canvas'); um.width = um.height = 1; const gu = um.getContext('2d'); gu.drawImage(c, 0, 0, 1, 1);
  const d = gu.getImageData(0, 0, 1, 1).data, cor = '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
  if (!blob) return aviso('Não consegui preparar a imagem.');
  let def = { cor, imagem: `texturas/${nome}.jpg`, tamanho: [lg, al], rugosidade: 0.4 };
  if (P.servidor) {
    let senha = ''; try { senha = sessionStorage.getItem('casa-sitio/senha') || ''; } catch (e) { /* sem sessão */ }
    if (!senha) { senha = window.prompt('Senha de edição do servidor:') || ''; if (!senha) return; }
    try {
      const r = await fetch(`api/textura?nome=${encodeURIComponent(nome)}&largura=${lg}&altura=${al}&cor=${encodeURIComponent(cor)}`, { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-senha': senha }, body: blob });
      if (r.status === 401) { try { sessionStorage.removeItem('casa-sitio/senha'); } catch (e) { /* */ } return aviso('Senha incorreta.'); }
      if (!r.ok) throw new Error((await r.text()) || r.status);
      try { sessionStorage.setItem('casa-sitio/senha', senha); } catch (e) { /* */ }
      def = (await r.json()).def || def;
      P.mats.defs[nome] = { ...def, imagem: def.imagem + '?v=' + Date.now() };          // força o navegador a buscar a foto nova
      aviso(`Material "${nome}" criado. Use esse nome no campo de material de qualquer peça.`, 6000);
    } catch (e) { return aviso('Não foi possível enviar: ' + e.message, 6000); }
  } else {
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `${nome}.jpg`; document.body.appendChild(a); a.click(); a.remove();
    const linha = `  ${JSON.stringify(nome)}: ${JSON.stringify(def)},`;
    try { await navigator.clipboard.writeText(linha); } catch (e) { /* sem área de transferência */ }
    P.mats.defs[nome] = { ...def, imagem: url };                                          // vale só neste aparelho até publicar
    aviso(`Foto ${nome}.jpg baixada: envie para texturas/ e cole a linha copiada em dados/materiais.json.`, 9000);
  }
  P.mats.cache.delete(nome); P.mats.faltando.delete(nome);
  $('#texArq').value = ''; $('#texNome').value = ''; fecharPaineis();
  refazerTudo();
}
function baixar(id) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([paraPublicar(id)], { type: 'application/json' })); a.download = `${id}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  aviso(`Arquivo ${id}.json baixado. Envie para dados/comodos/ no servidor.`, 5000);
}

// ---------- interface ----------
function contagem() {
  const c = {};
  for (const s of P.malha.salas) c[s.id] = { pecas: (P.res[s.id] || []).length, erros: 0, avisos: 0 };
  for (const p of P.problemas) if (p.comodo && c[p.comodo]) { if (p.nivel === 'erro') c[p.comodo].erros++; else if (p.nivel === 'aviso') c[p.comodo].avisos++; }
  return c;
}
function atualizarUI() {
  const m = P.malha, s = E.foco ? m.porId[E.foco] : null, nomes = Object.fromEntries(m.salas.map(q => [q.id, q.nome]));
  $('#tProjeto').textContent = `${P.casa.projeto} · rev. ${P.casa.revisao}`;
  $('#tLocal').textContent = s ? (E.ids.length > 1 ? E.ids.map(i => nomes[i]).join(' + ') : s.nome) : 'Casa inteira';
  $('#lista').innerHTML = UI.listaComodos(m.salas, E.foco, contagem());
  $('#pCamadas').innerHTML = UI.painelCamadas(E);
  $('#pConf').innerHTML = UI.painelConferencia(P.problemas, nomes);
  const er = P.problemas.filter(p => p.nivel === 'erro').length, av = P.problemas.filter(p => p.nivel === 'aviso').length;
  $('#nConf').textContent = er + av ? String(er + av) : ''; $('#nConf').className = er ? 'erro' : av ? 'aviso' : '';
  $('#btNoite').classList.toggle('ativo', E.noite); $('#btEditar').classList.toggle('ativo', E.editar); $('#btRef').classList.toggle('ativo', E.ref); $('#btCasa').classList.toggle('ativo', !E.foco);
  document.body.classList.toggle('editando', E.editar);
  // ficha
  let h;
  const r = achar(E.sel);
  if (r && r.env) {
    const pg = grupoDa(E.sel), ud = pg ? pg.userData : { acoes: [], luzes: [] };
    h = UI.fichaPeca({ p: r.p, r, sala: m.porId[E.sel.comodo], acoes: ud.acoes, luz: ud.luzes.length ? luzLigada(r.p) : null, problemas: P.problemas.filter(p => p.id === r.p.id), editar: E.editar, folgas: folgasDe(E.sel.comodo, r), inventario: P.catalogoEquipamentos.categorias[r.p.categoriaInventario] });
  } else if (E.sel && E.sel.tipo === 'abertura') {
    const ab = P.aberturas.find(a => a.a.id === E.sel.id);
    h = ab ? UI.fichaAbertura({ a: ab.a, acoes: ab.g.userData.acoes, salas: m.porId }) : '';
  } else if (s) {
    h = E.ids.map(id => UI.fichaComodo({ sala: m.porId[id], dados: P.dados[id] || {}, res: P.res[id] || [], forro: P.forroDe(id), problemas: P.problemas.filter(p => p.comodo === id), editar: E.editar && id === E.foco, sujo: sujo(id), alteracoes: sujo(id) ? alteracoes(id) : [], servidor: P.servidor })).join('<hr>');
  } else h = UI.fichaCasa({ casa: P.casa, salas: m.salas, total: Object.values(P.res).reduce((t, l) => t + l.length, 0), problemas: P.problemas, editar: E.editar, servidor: P.servidor });
  $('#fichaCorpo').innerHTML = h;
  $('#ficha').classList.toggle('min', E.fichaMin); margens(); camera.updateProjectionMatrix();
  $('#fichaMin').textContent = E.fichaMin ? 'Abrir' : 'Fechar';
  const partes = [E.foco || '', E.visao !== 'completa' ? E.visao : ''].filter(Boolean);
  try { history.replaceState(null, '', partes.length ? '#' + partes.join('/') : location.pathname + location.search); } catch (e) { /* */ }
}
function fecharPaineis() { for (const id of ['#pCamadas', '#pConf', '#pTex', '#pIA']) $(id).hidden = true; document.body.classList.remove('menu'); }

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-acao]');
  if (!b) { if (!ev.target.closest('.flutuante') && !ev.target.closest('#topo')) fecharPaineis(); return; }
  const acao = b.dataset.acao, id = b.dataset.id, sel = E.sel, com = sel && sel.tipo === 'peca' ? sel.comodo : E.foco, p = pecaSel();
  switch (acao) {
    case 'menu': document.body.classList.toggle('menu'); break;
    case 'casa': fecharPaineis(); focar(null); break;
    case 'comodo': fecharPaineis(); focar(id); break;
    case 'cima': enquadrar(b.classList.toggle('ativo') ? 'cima' : null); break;
    case 'recentrar': enquadrar(); break;
    case 'abrir-camadas': { const el = $('#pCamadas'), aberto = !el.hidden; fecharPaineis(); el.hidden = aberto; break; }
    case 'conferencia': { const el = $('#pConf'), aberto = !el.hidden; fecharPaineis(); el.hidden = aberto; break; }
    case 'visao': E.visao = id; E.cam = { ...UI.VISOES[id].cam }; atualizarVisibilidade(); refazerRotulos(); atualizarUI(); break;
    case 'camada': E.cam[id] = E.cam[id] ? 0 : 1; E.visao = 'personalizada'; atualizarVisibilidade(); refazerRotulos(); atualizarUI(); break;
    case 'paredes': E.paredes = id; atualizarVisibilidade(); atualizarUI(); break;
    case 'pessoa': E.pessoa = !E.pessoa; atualizarVisibilidade(); refazerRotulos(); atualizarUI(); break;
    case 'noite': E.noite = !E.noite; aplicarLuzes(); atualizarUI(); break;
    case 'editar': E.editar = !E.editar; E.fichaMin = false; atualizarUI(); if (E.editar) aviso('Modo de edição: toque numa peça e altere as medidas.'); break;
    case 'ficha-min': E.fichaMin = !E.fichaMin; atualizarUI(); break;
    case 'ir': fecharPaineis(); if (b.dataset.comodo) { if (E.foco !== b.dataset.comodo && !E.ids.includes(b.dataset.comodo)) focar(b.dataset.comodo); if (id) selecionar({ tipo: 'peca', comodo: b.dataset.comodo, id }); } break;
    case 'trocar-equipamento': {
      if (!p || !p.categoriaInventario) break;
      const categoria = P.catalogoEquipamentos.categorias[p.categoriaInventario];
      const escolhido = categoria && categoria.modelos.find(m => m.id === $('#inventarioModelo')?.value);
      if (!escolhido) { aviso('Modelo não encontrado no inventário.'); break; }
      p.modelo = escolhido.modelo;
      p.largura = escolhido.largura; p.profundidade = escolhido.profundidade; p.altura = escolhido.altura;
      p.nome = escolhido.nome; p.aberto = false;
      p.status = 'proposta';
      aposEdicao(com);
      aviso(`Equipamento alterado: ${escolhido.nome}. Confira as folgas e a abertura da tampa/porta.`);
      break;
    }
    case 'acionar': { const g = grupoDa(sel); if (g) { acionar(g.userData.acoes[+b.dataset.i]); atualizarUI(); } break; }
    case 'luz': if (p) { alternarLuz([p.id]); atualizarUI(); } break;
    case 'interruptor': if (p) { if ((p.comanda || []).length) alternarLuz(p.comanda); else aviso('Este interruptor ainda não comanda nenhuma luz ("comanda").'); atualizarUI(); } break;
    case 'passo': if (p) { p[b.dataset.k] = Math.round((num(p[b.dataset.k], 0) + (+b.dataset.d) * (ev.shiftKey ? 5 : 1)) * 10) / 10; aposEdicao(com); } break;
    case 'rem-campo': if (p) { delete p[b.dataset.k]; aposEdicao(com); } break;
    case 'add-campo': { const k = $('#novoK').value.trim(), v = $('#novoV').value.trim(); if (!p || !k) break; let val = v; try { val = JSON.parse(v); } catch (e) { /* texto */ } p[k] = val; aposEdicao(com); break; }
    case 'duplicar': if (p) { const c = JSON.parse(JSON.stringify(p)); c.id = idLivre(p.id); for (const k of ['daEsquerda', 'daDireita', 'dosFundos', 'daFrente']) if (typeof c[k] === 'number') { c[k] += 10; break; } c.status = 'proposta'; P.dados[com].pecas.push(c); aposEdicao(com); selecionar({ tipo: 'peca', comodo: com, id: c.id }); } break;
    case 'remover': if (p) { P.dados[com].pecas = P.dados[com].pecas.filter(q => q !== p); E.sel = null; aposEdicao(com); } break;
    case 'add-peca': {
      const tipo = $('#novoTipo').value, def = TIPOS[tipo], s = P.malha.porId[E.foco]; let nid = $('#novoId').value.trim();
      if (!def || !s) break;
      if (!nid) { aviso('Informe um ID para a peça (ex.: COZ-ILHA).'); break; }
      nid = idLivre(nid);
      const dm = def.dimensoes ? def.dimensoes({}, { forro: P.forroDe(E.foco) }) : {}, nova = { id: nid, tipo };
      if (def.fixacao === 'parede') { nova.parede = 'fundos'; nova.daEsquerda = Math.round(s.largura / 2); if (!def.doPisoFixo) nova.doPiso = num(dm.doPiso, 0); }
      else if (def.fixacao === 'teto' || def.fixacao === 'pontoPiso') { nova.daEsquerda = Math.round(s.largura / 2); nova.dosFundos = Math.round(s.profundidade / 2); }
      else { nova.daEsquerda = 20; nova.dosFundos = 20; nova.frentePara = 'frente'; }
      if (!def.ponto && def.fixacao !== 'teto' && def.fixacao !== 'pontoPiso') { nova.largura = num(dm.largura, 60); nova.profundidade = num(dm.profundidade, 60); if (!def.doPisoFixo) nova.altura = num(dm.altura, 90); }
      nova.status = 'proposta';
      if (!Array.isArray(P.dados[E.foco].pecas)) P.dados[E.foco].pecas = [];
      P.dados[E.foco].pecas.push(nova); aposEdicao(E.foco); selecionar({ tipo: 'peca', comodo: E.foco, id: nid }); break; }
    case 'abrir-ia': { const el = $('#pIA'), aberto = !el.hidden; fecharPaineis(); el.hidden = aberto; $('#iaOnde').textContent = E.foco ? P.malha.porId[E.foco].nome : 'nenhum cômodo aberto'; break; }
    case 'ia-copiar': iaCopiarPedido(); break;
    case 'ia-conferir': iaConferir(); break;
    case 'ia-aplicar': iaAplicar(id); break;
    case 'ia-copiar-erros': iaCopiarErros(); break;
    case 'ref': E.ref = !E.ref; if (!E.ref) { mostrarSonda(null); elFixa.hidden = true; } desenharEixos(); refazerRotulos(); atualizarUI(); aviso(E.ref ? 'Referência ligada: passe o mouse nas paredes, no piso e nas peças.' : 'Referência desligada.'); break;
    case 'ref-fechar': elFixa.hidden = true; mostrarSonda(null); break;
    case 'ref-copiar': if (elFixa.ref) copiar(textoRef(elFixa.ref), 'Referência copiada.'); break;
    case 'ref-pedido': if (elFixa.ref) { const t = $('#iaPedido'); t.value = (t.value.trim() ? t.value.trim() + '\n' : '') + '- ' + textoRef(elFixa.ref) + ': '; fecharPaineis(); $('#pIA').hidden = false; $('#iaOnde').textContent = P.malha.porId[E.foco].nome; elFixa.hidden = true; t.focus(); t.setSelectionRange(t.value.length, t.value.length); } break;
    case 'desfazer': desfazer(true); break;
    case 'refazer': desfazer(false); break;
    case 'enviar-textura': enviarTextura(); break;
    case 'fechar-paineis': fecharPaineis(); break;
    case 'abrir-textura': fecharPaineis(); $('#pTex').hidden = false; $('#btTex').textContent = P.servidor ? 'Criar material' : 'Preparar material';
      $('#texObs').innerHTML = P.servidor ? 'A foto é reduzida e gravada em <code>texturas/</code>. O material entra em <code>materiais.json</code> e pode ser usado em qualquer peça pelo nome.' : 'Sem o servidor de edição, a foto reduzida é baixada e a linha para o <code>materiais.json</code> é copiada, para você publicar à mão.'; break;
    case 'salvar': salvarNoServidor(E.foco); break;
    case 'baixar': baixar(E.foco); break;
    case 'copiar': { const txt = `Alterações em ${E.foco} (a partir da rev. ${JSON.parse(P.originais[E.foco] || '{}').revisao || '—'}):\n` + alteracoes(E.foco).join('\n'); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => aviso('Alterações copiadas.'), () => aviso('Não foi possível copiar neste navegador.')); break; }
    case 'descartar': P.dados[E.foco] = JSON.parse(P.originais[E.foco]); E.sel = null; aposEdicao(E.foco, true); aviso('Alterações descartadas.'); break;
  }
});
$('#ficha').addEventListener('change', ev => {
  const k = ev.target.dataset.k, p = pecaSel();
  if (!k || !p) return;
  let v;
  if (ev.target.type === 'checkbox') v = ev.target.checked;
  else if (ev.target.type === 'number') { v = parseFloat(ev.target.value); if (!Number.isFinite(v)) return; }
  else if (ev.target.dataset.json) { try { v = JSON.parse(ev.target.value); } catch (e) { aviso('JSON inválido neste campo: ' + e.message, 5000); return; } }
  else v = ev.target.value;
  p[k] = v; aposEdicao(E.sel.comodo, false);
});
window.addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
  const k = e.key.toLowerCase();
  if (k === 'c' && !e.ctrlKey && !e.metaKey && sondaAtual && !elSonda.hidden) { copiar(textoRef(sondaAtual), 'Referência copiada.'); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); desfazer(!e.shiftKey); }
  else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); desfazer(false); }
});
window.addEventListener('keydown', e => { if (e.key === 'Escape') { if (E.sel) selecionar(null); else if (E.foco) focar(null); } });
window.addEventListener('hashchange', () => { const [c] = location.hash.slice(1).split('/'); if ((c || null) !== E.foco) focar(c || null); });

// ---------- editar com IA: pedido pronto, colagem conferida, aplicação segura ----------
const APELIDOS_TIPO = ['ilha', 'balcao', 'guarda-roupa', 'aparador', 'torre', 'nicho'];
function ctxHigiene(idSala) {
  const usados = new Set();
  if (idSala) for (const [k, d] of Object.entries(P.dados)) if (k !== idSala) for (const q of d.pecas || []) if (q && q.id) usados.add(q.id);
  return { tipos: [...Object.keys(TIPOS), ...APELIDOS_TIPO], vocabulario: P.vocab, usados: idSala ? usados : null };
}
// Testa um cômodo hipotético sem mexer na maquete: devolve só os problemas que NÃO existiam antes.
function simular(id, novo) {
  const atual = P.dados[id], antes = new Set(P.problemas.filter(q => q.comodo === id).map(q => q.msg)), notas = P.notas[id];
  let probs = [];
  try {
    P.dados[id] = novo; P.notas[id] = []; resolverSala(id);
    const s = P.malha.porId[id];
    for (const r of P.res[id]) {                                    // ensaio de desenho: pega peça que quebraria ao montar
      if (!r.def || !r.env) continue;
      const g = new THREE.Group();
      try { r.def.construir(new Montagem({ mats: P.mats }, g), r.p, r.env); } catch (e) { r.erroConstrucao = e.message; }
      limpar(g);
    }
    probs = conferir().filter(q => q.comodo === id && !antes.has(q.msg));
    void s;
  } catch (e) { probs = [{ nivel: 'erro', comodo: id, id: null, msg: 'Este conteúdo quebraria o cômodo: ' + e.message }]; }
  finally { P.dados[id] = atual; P.notas[id] = notas; resolverSala(id); }
  return probs;
}
let ia = null;
function iaConferir() {
  const el = $('#iaResultado'), texto = $('#iaTexto').value;
  ia = null;
  let lido;
  try { lido = lerJSONTolerante(texto); } catch (e) { el.innerHTML = `<p class="alerta erro">${UI.esc(e.message)}</p><div class="botoes"><button data-acao="ia-copiar-erros">Copiar erro para a IA</button></div>`; ia = { erros: [e.message] }; return; }
  const bruto = lido.dado, citado = bruto && !Array.isArray(bruto) && typeof bruto.comodo === 'string' ? bruto.comodo : null;
  const id = citado && P.malha.porId[citado] ? citado : E.foco;
  if (!id) { el.innerHTML = '<p class="alerta erro">Abra um cômodo antes de conferir, ou inclua "comodo" no JSON.</p>'; return; }
  const avisoSala = citado && !P.malha.porId[citado] ? `O JSON cita o cômodo "${citado}", que não existe. Usei ${P.malha.porId[id].nome}.` : null;
  const ctx = ctxHigiene(id); ctx.reservados = new Set(); ctx.fixarComodo = false;
  const h = higienizar(bruto, id, ctx), inteiro = pareceArquivoInteiro(bruto, h.dado);
  const sim = {};
  for (const modo of inteiro ? ['mesclar', 'substituir'] : ['mesclar']) { const c = combinar(P.dados[id], h.dado, modo); sim[modo] = { ...c, probs: simular(id, c.novo) }; }
  const m = sim.mesclar, consertos = [...lido.consertos, ...h.notas.filter(n => n.nivel === 'conserto').map(n => (n.id ? n.id + ': ' : '') + n.msg)], notasRuins = h.notas.filter(n => n.nivel !== 'conserto');
  const erros = [...notasRuins.filter(n => n.nivel === 'erro').map(n => (n.id ? n.id + ': ' : '') + n.msg), ...m.probs.filter(q => q.nivel === 'erro').map(q => q.msg)];
  const avisos = [...(avisoSala ? [avisoSala] : []), ...notasRuins.filter(n => n.nivel === 'aviso').map(n => (n.id ? n.id + ': ' : '') + n.msg), ...m.probs.filter(q => q.nivel === 'aviso').map(q => q.msg)];
  ia = { id, sim, erros, avisos, inteiro };
  const lista = (itens, cls) => (itens.length ? `<ul class="alt ${cls || ''}">${itens.slice(0, 30).map(t => `<li>${UI.esc(t)}</li>`).join('')}${itens.length > 30 ? `<li>… e mais ${itens.length - 30}</li>` : ''}</ul>` : '');
  const r = m.resumo, vazio = !r.novas.length && !r.trocadas.length && !r.removidas.length && !(inteiro && sim.substituir.resumo.removidas.length);
  let hh = `<h4>${UI.esc(P.malha.porId[id].nome)}</h4>`;
  hh += `<p class="alerta ${erros.length ? 'erro' : avisos.length ? 'aviso' : ''}">${erros.length ? `${erros.length} erro(s): corrija antes de aplicar.` : avisos.length ? `Sem erros, com ${avisos.length} aviso(s).` : 'Sem erros e sem avisos.'}</p>`;
  hh += `<p class="obs"><b>${r.novas.length}</b> peça(s) nova(s)${r.novas.length ? ': ' + UI.esc(r.novas.join(', ')) : ''} · <b>${r.trocadas.length}</b> alterada(s)${r.trocadas.length ? ': ' + UI.esc(r.trocadas.join(', ')) : ''}${r.removidas.length ? ` · <b>${r.removidas.length}</b> removida(s): ${UI.esc(r.removidas.join(', '))}` : ''}</p>`;
  if (erros.length) hh += '<h4>Erros</h4>' + lista(erros);
  if (avisos.length) hh += '<h4>Avisos</h4>' + lista(avisos);
  if (consertos.length) hh += `<h4>Corrigido automaticamente (${consertos.length})</h4>` + lista(consertos);
  const sumidas = inteiro ? sim.substituir.resumo.removidas : [];
  if (sumidas.length) hh += `<p class="alerta aviso">A resposta não traz ${sumidas.length} peça(s) que existem hoje: ${UI.esc(sumidas.join(', '))}. A IA pode ter esquecido. <b>Mesclar</b> mantém essas peças; <b>Substituir</b> apaga.</p>`;
  hh += '<div class="botoes">';
  if (vazio) hh += '<span class="obs">Nada muda em relação ao que já está na maquete.</span>';
  else {
    hh += `<button class="${erros.length ? '' : 'primario'}" data-acao="ia-aplicar" data-id="mesclar">${sumidas.length ? 'Mesclar (mantém as atuais)' : erros.length ? 'Aplicar mesmo com erros' : 'Aplicar na maquete'}</button>`;
    if (sumidas.length) hh += `<button class="perigo" data-acao="ia-aplicar" data-id="substituir">Substituir (apaga ${sumidas.length})</button>`;
  }
  if (erros.length || avisos.length) hh += '<button data-acao="ia-copiar-erros">Copiar problemas para a IA</button>';
  hh += '</div>';
  el.innerHTML = hh;
}
function iaAplicar(modo) {
  if (!ia || !ia.sim || !ia.sim[modo]) return;
  const id = ia.id;
  P.dados[id] = ia.sim[modo].novo; E.sel = null; E.editar = true;
  aposEdicao(id, true);
  if (E.foco !== id && !E.ids.includes(id)) focar(id);
  $('#iaResultado').innerHTML = `<p class="alerta">Aplicado em ${UI.esc(P.malha.porId[id].nome)}. Confira na maquete. Ainda não foi salvo: use <b>Salvar no servidor</b> na ficha do cômodo, ou <b>Desfazer</b> (Ctrl+Z) se não gostou.</p><div class="botoes"><button data-acao="desfazer">Desfazer</button></div>`;
  ia = null;
}
const copiar = (txt, ok) => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => aviso(ok), () => { const t = $('#iaTexto'); t.value = txt; t.select(); aviso('Não consegui copiar sozinho: o texto está na caixa de resposta, copie com Ctrl+C.', 6000); });
let guiaIA = null;
async function iaCopiarPedido() {
  const id = E.foco;
  if (!id) { aviso('Abra um cômodo primeiro.'); return; }
  if (guiaIA == null) { try { const r = await fetch('LEIA-ME-IA.md', { cache: 'no-store' }); guiaIA = r.ok ? await r.text() : ''; } catch (e) { guiaIA = ''; } }
  const s = P.malha.porId[id], d = P.dados[id], abs = aberturasDaSala(P.malha, s);
  const linhasAb = abs.map(a => `- ${a.a.id} (${a.a.tipo}) na parede ${a.parede}: de ${cm(a.s0)} a ${cm(a.s1)} cm, medido a partir ${EIXO[a.parede] === 'x' ? 'da esquerda' : 'dos fundos'}; do piso ${cm(a.y0)} até ${cm(Math.min(a.y1, P.casa.peDireito))} cm`);
  const probs = P.problemas.filter(q => q.comodo === id && q.nivel !== 'info').map(q => `- [${q.nivel}] ${q.msg}`);
  const txt = [
    'Você vai editar a maquete 3D da minha casa. Siga o GUIA no fim desta mensagem à risca.',
    '',
    'COMO RESPONDER (obrigatório):',
    '1. Se faltar qualquer medida, parede ou posição, NÃO escreva JSON: faça as perguntas numeradas, cada uma com uma sugestão.',
    '2. Quando tiver tudo, responda SOMENTE com um bloco JSON neste formato, sem texto antes ou depois:',
    `{ "comodo": "${id}", "modo": "mesclar", "pecas": [ ...só as peças NOVAS ou ALTERADAS, cada uma completa... ], "remover": [ ...ids a apagar, se houver... ] }`,
    '3. Não repita peças que não mudaram. Não mude ids existentes. Tudo em centímetros.',
    '',
    `CÔMODO: ${s.nome} (id "${id}")`,
    `- Largura (esquerda–direita): ${cm(s.largura)} cm · Profundidade (fundos–frente): ${cm(s.profundidade)} cm · Forro: ${cm(P.forroDe(id))} cm`,
    `- Prefixo dos ids: ${(d.pecas || []).map(q => String(q.id).split('-')[0])[0] || id.toUpperCase().slice(0, 3)}-`,
    '',
    'PORTAS, JANELAS E VÃOS DESTE CÔMODO (não coloque nada na frente):',
    linhasAb.length ? linhasAb.join('\n') : '- nenhuma',
    '',
    'TIPOS DE PEÇA QUE EXISTEM: ' + [...Object.keys(TIPOS), ...APELIDOS_TIPO].join(', '),
    'MATERIAIS QUE EXISTEM: ' + Object.keys(P.mats.defs).join(', '),
    '',
    'PROBLEMAS QUE A CONFERÊNCIA ACUSA HOJE:',
    probs.length ? probs.join('\n') : '- nenhum',
    '',
    'ARQUIVO ATUAL DO CÔMODO:',
    JSON.stringify(d, null, 1),
    '',
    'O QUE EU QUERO:',
    $('#iaPedido').value.trim() || '(escreva aqui o seu pedido)',
    '',
    '================ GUIA ================',
    guiaIA || 'Posição: use daEsquerda OU daDireita, e dosFundos OU daFrente. Peça encostada usa "parede" (fundos, frente, esquerda, direita). doPiso = altura do piso até a base (ou até o centro, em tomadas e pontos).',
  ].join('\n');
  copiar(txt, guiaIA ? 'Pedido copiado, com o guia e o cômodo atual. Cole na IA.' : 'Pedido copiado (sem o guia completo: LEIA-ME-IA.md não está acessível).');
}
function iaCopiarErros() {
  if (!ia) return;
  const linhas = [...(ia.erros || []).map(t => '- ERRO: ' + t), ...(ia.avisos || []).map(t => '- AVISO: ' + t)];
  copiar('Sua resposta teve os problemas abaixo ao ser testada na maquete. Corrija e devolva de novo SOMENTE o bloco JSON, no mesmo formato ("modo": "mesclar", só peças novas ou alteradas). Se para corrigir faltar alguma medida, pergunte.\n' + linhas.join('\n'), 'Problemas copiados. Cole na IA para ela corrigir.');
}

// ---------- início ----------
async function iniciar() {
  const casa = await lerJSON('dados/casa.json'), defsMat = await lerJSON('dados/materiais.json');
  try { P.catalogoEquipamentos = await lerJSON('dados/catalogo-equipamentos.json'); }
  catch (e) { console.warn('Inventário de equipamentos indisponível:', e); }
  P.casa = casa; P.mats = new Materiais(defsMat, () => { P.problemas = conferir(); atualizarUI(); pedir(); });
  P.malha = malhaCasa(casa);
  try { const fontes = await Promise.all(['catalogo.js', 'base.js', 'validar.js'].map(f => fetch('motor/' + f).then(r => (r.ok ? r.text() : '')))); if (fontes[0]) P.vocab = vocabularioDe(...fontes); } catch (e) { P.vocab = null; }
  await Promise.all(casa.comodos.map(async c => {
    let d;
    try {
      const r = await fetch(`dados/comodos/${c.id}.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`arquivo não encontrado (${r.status})`);
      const lido = lerJSONTolerante(await r.text()), h = higienizar(lido.dado, c.id, ctxHigiene());
      d = h.dado; P.notas[c.id] = [...lido.consertos.map(msg => ({ nivel: 'conserto', id: null, msg })), ...h.notas];
    } catch (e) { d = { comodo: c.id, pecas: [], _erro: e.message }; }
    P.originais[c.id] = JSON.stringify(d); P.dados[c.id] = d;
    const rasc = ler(chaveRascunho(c.id));
    if (rasc) { try { const rj = JSON.parse(rasc); if (rj && Array.isArray(rj.pecas)) P.dados[c.id] = rj; else throw 0; } catch (e) { guardar(chaveRascunho(c.id), null); } }
    P.instantaneo[c.id] = JSON.stringify(P.dados[c.id]);
  }));
  try { const r = await fetch('api/estado', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); P.servidor = !!j.edicao; } } catch (e) { P.servidor = false; }
  for (const c of casa.comodos) resolverSala(c.id);
  construirCasca(); construirEsquadrias(); construirBlocos();
  P.problemas = conferir();
  $('#lista-materiais').innerHTML = Object.keys(defsMat).map(k => `<option value="${UI.esc(k)}">`).join('');
  redimensionar();
  const [c, v] = location.hash.slice(1).split('/');
  if (v && UI.VISOES[v]) { E.visao = v; E.cam = { ...UI.VISOES[v].cam }; }
  focar(c && P.malha.porId[c] ? c : null, { instantaneo: true });
  $('#carregando').hidden = true;
  if (Object.keys(P.dados).some(sujo)) aviso('Há alterações locais ainda não publicadas neste aparelho.', 5000);
}
iniciar().catch(e => { console.error(e); $('#carregando').hidden = true; const el = $('#erroFatal'); el.hidden = false; el.querySelector('pre').textContent = e.message; });
Object.assign(window.CASA, { lerPonto, conferir, desfazer, iaConferir, iaAplicar, cena, focar, selecionar, enquadrar, pedir, aposEdicao, camera, controles, renderer });
