// Paredes: gera a alvenaria a partir dos retângulos dos cômodos e das aberturas.
// Não existe lista de paredes nos dados: toda faixa de 15 cm em volta de um cômodo
// fechado vira parede, e onde dois cômodos se encostam sem faixa (cozinha/jantar/estar)
// não nasce parede nenhuma. Portas, vãos e janelas recortam a faixa.
import { EIXO, aoLongo, num } from './base.js';
import { faceX, faceY, faceZ } from './montagem.js';

export function retangulos(casa) {
  return casa.comodos.map(c => ({ id: c.id, nome: c.nome, x0: c.x, x1: c.x + c.largura, z0: c.z, z1: c.z + c.profundidade,
    x: c.x, z: c.z, largura: c.largura, profundidade: c.profundidade, aberto: !!c.aberto, conjunto: c.conjunto || null, uso: c.uso, c }));
}

// Retângulo do vão em planta, no sistema da casa.
export function vaoNoMundo(a, casa, s) {
  if (!s || !EIXO[a.parede]) return null;
  const t = casa.espessuraParede, eixo = EIXO[a.parede], total = eixo === 'x' ? s.largura : s.profundidade;
  const ini = aoLongo(a, eixo, total, a.largura);
  if (ini == null || !(a.largura > 0)) return null;
  let r;
  if (a.parede === 'fundos') r = { x0: s.x0 + ini, x1: s.x0 + ini + a.largura, z0: s.z0 - t, z1: s.z0 };
  else if (a.parede === 'frente') r = { x0: s.x0 + ini, x1: s.x0 + ini + a.largura, z0: s.z1, z1: s.z1 + t };
  else if (a.parede === 'esquerda') r = { x0: s.x0 - t, x1: s.x0, z0: s.z0 + ini, z1: s.z0 + ini + a.largura };
  else r = { x0: s.x1, x1: s.x1 + t, z0: s.z0 + ini, z1: s.z0 + ini + a.largura };
  r.y0 = a.tipo === 'janela' ? num(a.peitoril, 90) : 0;
  r.y1 = a.integrado ? 1e6 : r.y0 + num(a.altura, 210);   // integrado: sem parede nenhuma (dois ambientes de um mesmo cômodo)
  r.integrado = !!a.integrado; r.comodo = a.comodo;
  r.ini = ini;
  return r;
}

// Grade de células: cada célula é interior de cômodo, parede ou área externa.
export function malhaCasa(casa) {
  const t = casa.espessuraParede, salas = retangulos(casa), porId = Object.fromEntries(salas.map(s => [s.id, s]));
  const xs = new Set(), zs = new Set();
  for (const s of salas) { const e = s.aberto ? 0 : t; [s.x0 - e, s.x0, s.x1, s.x1 + e].forEach(v => xs.add(v)); [s.z0 - e, s.z0, s.z1, s.z1 + e].forEach(v => zs.add(v)); }
  const vaos = [];
  for (const a of casa.aberturas || []) {
    const s = porId[a.comodo], r = vaoNoMundo(a, casa, s);
    if (!r) { vaos.push({ a, r: null, erro: !s ? `cômodo "${a.comodo}" não existe` : 'posição ou largura inválida' }); continue; }
    vaos.push({ a, r, sala: s });
    [r.x0, r.x1].forEach(v => xs.add(v)); [r.z0, r.z1].forEach(v => zs.add(v));
  }
  const X = [...xs].sort((a, b) => a - b), Z = [...zs].sort((a, b) => a - b), cel = [];
  for (let i = 0; i < X.length - 1; i++) {
    cel.push([]);
    for (let j = 0; j < Z.length - 1; j++) {
      const cx = (X[i] + X[i + 1]) / 2, cz = (Z[j] + Z[j + 1]) / 2;
      const dentro = salas.find(s => cx > s.x0 && cx < s.x1 && cz > s.z0 && cz < s.z1);
      if (dentro) { cel[i].push({ tipo: 'sala', sala: dentro }); continue; }
      const lados = [];
      for (const s of salas) {
        if (s.aberto || !(cx > s.x0 - t && cx < s.x1 + t && cz > s.z0 - t && cz < s.z1 + t)) continue;
        lados.push({ sala: s.id, lado: cz < s.z0 ? 'fundos' : cz > s.z1 ? 'frente' : cx < s.x0 ? 'esquerda' : 'direita' });
      }
      if (!lados.length) { cel[i].push({ tipo: 'fora' }); continue; }
      const v = vaos.find(v => v.r && cx > v.r.x0 && cx < v.r.x1 && cz > v.r.z0 && cz < v.r.z1);
      cel[i].push({ tipo: 'parede', lados, vao: v ? v.r : null });
    }
  }
  return { X, Z, cel, salas, porId, vaos, t };
}

function menos(S, N) {
  let out = S.map(s => [...s]);
  for (const [c, d] of N) {
    const nx = [];
    for (const [a, b] of out) { if (d <= a || c >= b) nx.push([a, b]); else { if (c > a) nx.push([a, c]); if (d < b) nx.push([d, b]); } }
    out = nx;
  }
  return out.filter(([a, b]) => b - a > 0.01);
}
const solidos = (c, H) => (!c.vao ? [[0, H]] : [[0, Math.min(c.vao.y0, H)], [Math.min(c.vao.y1, H), H]].filter(([a, b]) => b - a > 0.01));

// Faces visíveis da alvenaria até a altura H.
// classe: pele (face para dentro de um cômodo), fachada, vao (lateral do vão),
//         topo (corte da parede), peitoril, verga, soleira.
export function facesParedes(m, H) {
  const { X, Z, cel } = m, faces = [], FORA = { tipo: 'fora' };
  for (let i = 0; i < cel.length; i++) for (let j = 0; j < cel[i].length; j++) {
    const c = cel[i][j];
    if (c.tipo !== 'parede') continue;
    const S = solidos(c, H), x0 = X[i], x1 = X[i + 1], z0 = Z[j], z1 = Z[j + 1];
    const viz = [[1, 0, (a, b) => faceX(x1, z0, z1, a, b, 1)], [-1, 0, (a, b) => faceX(x0, z0, z1, a, b, -1)],
                 [0, 1, (a, b) => faceZ(z1, x0, x1, a, b, 1)], [0, -1, (a, b) => faceZ(z0, x0, x1, a, b, -1)]];
    for (const [di, dj, f] of viz) {
      const nb = (cel[i + di] && cel[i + di][j + dj]) || FORA;
      const classe = nb.tipo === 'sala' ? (nb.sala.aberto ? 'fachada' : 'pele') : nb.tipo === 'fora' ? 'fachada' : 'vao';
      const sala = nb.tipo === 'sala' ? nb.sala.id : null;
      const ladoPele = sala ? (c.lados.find(l => l.sala === sala) || {}).lado : null;
      for (const [a, b] of menos(S, nb.tipo === 'parede' ? solidos(nb, H) : [])) { const [pts, n] = f(a, b); faces.push({ pts, n, classe, sala, ladoPele, lados: c.lados }); }
    }
    for (const [a, b] of S) {
      const [pts, n] = faceY(b, x0, x1, z0, z1, 1);
      faces.push({ pts, n, classe: b >= H - 0.01 ? 'topo' : 'peitoril', sala: null, lados: c.lados });
      if (a > 0.01) { const [p2, n2] = faceY(a, x0, x1, z0, z1, -1); faces.push({ pts: p2, n: n2, classe: 'verga', sala: null, lados: c.lados }); }
    }
    if (c.vao && c.vao.y0 <= 0.01) { const [pts, n] = faceY(0, x0, x1, z0, z1, 1); faces.push({ pts, n, classe: 'soleira', sala: null, lados: c.lados, pisoDe: c.vao.integrado ? c.vao.comodo : null }); }
    else { const [pts, n] = faceY(0.4, x0, x1, z0, z1, 1); faces.push({ pts, n, classe: 'planta', sala: null, lados: c.lados }); }   // traço da parede no piso
  }
  return faces;
}

// Aberturas que tocam um cômodo, nas coordenadas do próprio cômodo (para conferência).
export function aberturasDaSala(m, s) {
  const out = [], e = 0.1;
  for (const v of m.vaos) {
    const r = v.r; if (!r) continue;
    const emX = r.x1 > s.x0 + e && r.x0 < s.x1 - e, emZ = r.z1 > s.z0 + e && r.z0 < s.z1 - e;
    let parede = null;
    if (Math.abs(r.z1 - s.z0) < e && emX) parede = 'fundos';
    else if (Math.abs(r.z0 - s.z1) < e && emX) parede = 'frente';
    else if (Math.abs(r.x1 - s.x0) < e && emZ) parede = 'esquerda';
    else if (Math.abs(r.x0 - s.x1) < e && emZ) parede = 'direita';
    if (!parede) continue;
    const ax = EIXO[parede] === 'x';
    out.push({ a: v.a, parede, s0: ax ? r.x0 - s.x0 : r.z0 - s.z0, s1: ax ? r.x1 - s.x0 : r.z1 - s.z0, y0: r.y0, y1: r.y1 });
  }
  return out;
}
