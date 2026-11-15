// Base: unidades, convenções de posição e conversão "dado da peça" -> caixa no cômodo.
// Tudo nos dados é em CENTÍMETROS. O 3D trabalha em metros (U = 0,01).
//
// Eixos da casa (iguais aos da planta, com a rua embaixo):
//   X cresce da ESQUERDA para a DIREITA   (de quem olha da rua para a casa)
//   Z cresce dos FUNDOS para a FRENTE     (frente = rua)
//   Y cresce do piso para cima
import * as THREE from 'three';

export const U = 0.01;
export const EIXO = { fundos: 'x', frente: 'x', esquerda: 'z', direita: 'z' };
export const OPOSTA = { fundos: 'frente', frente: 'fundos', esquerda: 'direita', direita: 'esquerda' };
export const NOME_PAREDE = { fundos: 'fundos', frente: 'frente', esquerda: 'esquerda', direita: 'direita' };

export const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const arred = (v, c = 1) => Math.round(v * 10 ** c) / 10 ** c;
export const cm = v => String(arred(v, 1)).replace('.', ',');
export const metros = v => (v / 100).toFixed(2).replace('.', ',');

// Gerador aleatório com semente (mesmo resultado em todo carregamento).
export function semente(texto) {
  let h = 2166136261;
  for (const c of String(texto)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  let s = h >>> 0;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Posição ao longo de um eixo do cômodo.
// eixo 'x' usa daEsquerda / daDireita; eixo 'z' usa dosFundos / daFrente.
// Devolve o início da peça. Se centro=true, a medida vai até o EIXO (centro) da peça.
export function aoLongo(o, eixo, total, tam, centro = false) {
  const [k0, k1] = eixo === 'x' ? ['daEsquerda', 'daDireita'] : ['dosFundos', 'daFrente'];
  if (typeof o[k0] === 'number') return centro ? o[k0] - tam / 2 : o[k0];
  if (typeof o[k1] === 'number') return centro ? total - o[k1] - tam / 2 : total - o[k1] - tam;
  return null;
}

// Posição de uma parte DENTRO de uma peça (cuba, divisória...), medida a partir
// da ponta inicial da peça na ordem da planta (esquerda ou fundos).
export function naPeca(o, L, w, centro = false) {
  const a = o.doInicio ?? o.daEsquerda ?? o.dosFundos;
  const b = o.doFim ?? o.daDireita ?? o.daFrente;
  if (typeof a === 'number') return centro ? a - w / 2 : a;
  if (typeof b === 'number') return centro ? L - b - w / 2 : L - b - w;
  return (L - w) / 2;
}
export const pontaFinal = v => v === 'direita' || v === 'frente' || v === 'fim';

// Resolve a peça: devolve a caixa que ela ocupa no cômodo (cm) e o "frame".
//   frame = parede em que as costas da peça encostam (define para onde ela olha).
//   L = comprimento ao longo da parede, P = profundidade, A = altura.
export function resolver(p, sala, def, forro) {
  const W = sala.largura, D = sala.profundidade, erros = [];
  const dm = def.dimensoes ? def.dimensoes(p, { forro }) : {};
  const L = num(p.largura, num(p.comprimento, num(dm.largura, 60)));
  const P = num(p.profundidade, num(dm.profundidade, 60));
  const A = num(p.altura, num(dm.altura, 90));
  const fix = def.fixacao || 'livre';
  let frame = 'fundos', x0, z0, xe, ze, y0;

  if (fix === 'teto' || fix === 'pontoPiso') {
    xe = L; ze = P;
    x0 = aoLongo(p, 'x', W, xe, true); z0 = aoLongo(p, 'z', D, ze, true);
    if (x0 == null) { erros.push('falta daEsquerda ou daDireita'); x0 = (W - xe) / 2; }
    if (z0 == null) { erros.push('falta dosFundos ou daFrente'); z0 = (D - ze) / 2; }
    y0 = fix === 'teto' ? forro - A : 0;
  } else if (p.parede) {
    frame = EIXO[p.parede] ? p.parede : 'fundos';
    if (!EIXO[p.parede]) erros.push(`parede "${p.parede}" não existe (use fundos, frente, esquerda ou direita)`);
    const eixo = EIXO[frame], total = eixo === 'x' ? W : D;
    let s = aoLongo(p, eixo, total, L, !!def.ponto);
    if (s == null) { erros.push(eixo === 'x' ? 'falta daEsquerda ou daDireita' : 'falta dosFundos ou daFrente'); s = (total - L) / 2; }
    const af = num(p.afastamento, 0);
    if (eixo === 'x') { xe = L; ze = P; x0 = s; z0 = frame === 'fundos' ? af : D - af - P; }
    else { xe = P; ze = L; z0 = s; x0 = frame === 'esquerda' ? af : W - af - P; }
    const dp = def.doPisoFixo ? num(dm.doPiso, 0) : num(p.doPiso, num(dm.doPiso, 0));
    y0 = def.ponto ? dp - A / 2 : dp;
  } else {
    if (fix === 'parede') erros.push('falta "parede"');
    const fp = OPOSTA[p.frentePara] ? p.frentePara : 'frente';
    frame = OPOSTA[fp];
    if (EIXO[frame] === 'x') { xe = L; ze = P; } else { xe = P; ze = L; }
    x0 = aoLongo(p, 'x', W, xe); z0 = aoLongo(p, 'z', D, ze);
    if (x0 == null) { erros.push('falta daEsquerda ou daDireita'); x0 = (W - xe) / 2; }
    if (z0 == null) { erros.push('falta dosFundos ou daFrente'); z0 = (D - ze) / 2; }
    y0 = num(p.doPiso, num(dm.doPiso, 0));
  }
  return { frame, L, P, A, x0, x1: x0 + xe, z0, z1: z0 + ze, y0, y1: y0 + A, erros };
}

// Matriz que leva o sistema local da peça (cm) para o sistema da casa (cm).
// Local: x = ao longo da peça na ordem da planta; y = para cima; z = das costas para a frente.
export function matrizLocal(env, sala) {
  let ox, oz, ax, az;
  switch (env.frame) {
    case 'frente':   ox = env.x0; oz = env.z1; ax = [1, 0]; az = [0, -1]; break;
    case 'esquerda': ox = env.x0; oz = env.z0; ax = [0, 1]; az = [1, 0]; break;
    case 'direita':  ox = env.x1; oz = env.z0; ax = [0, 1]; az = [-1, 0]; break;
    default:         ox = env.x0; oz = env.z0; ax = [1, 0]; az = [0, 1];
  }
  return new THREE.Matrix4().set(
    ax[0], 0, az[0], sala.x + ox,
    0, 1, 0, env.y0,
    ax[1], 0, az[1], sala.z + oz,
    0, 0, 0, 1);
}

// Cor de luz a partir da temperatura em Kelvin (aproximação suficiente para visualização).
export function corTemperatura(k) {
  const t = clamp(num(k, 3000), 2200, 6500);
  const pts = [[2200, 0xffb878], [2700, 0xffcf9a], [3000, 0xffdab0], [4000, 0xfff0dc], [5000, 0xfffaf3], [6500, 0xf1f5ff]];
  for (let i = 0; i < pts.length - 1; i++) {
    if (t <= pts[i + 1][0]) {
      const f = (t - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
      return new THREE.Color(pts[i][1]).lerp(new THREE.Color(pts[i + 1][1]), f);
    }
  }
  return new THREE.Color(0xffffff);
}
