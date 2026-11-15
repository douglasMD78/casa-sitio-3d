// Esquadrias: portas, vãos e janelas.
// Sistema local da abertura (cm):
//   x: 0..largura ao longo da parede (ordem da planta)
//   y: 0 no pé do vão (piso para portas, peitoril para janelas)
//   z: 0 na face da parede do lado do cômodo "dono"; z = espessura do outro lado.
import * as THREE from 'three';
import { num, pontaFinal } from './base.js';

export function matrizAbertura(a, r, s) {
  let ox, oz, ax, az;
  switch (a.parede) {
    case 'fundos':   ox = r.x0; oz = s.z0; ax = [1, 0]; az = [0, -1]; break;
    case 'frente':   ox = r.x0; oz = s.z1; ax = [1, 0]; az = [0, 1]; break;
    case 'esquerda': ox = s.x0; oz = r.z0; ax = [0, 1]; az = [-1, 0]; break;
    default:         ox = s.x1; oz = r.z0; ax = [0, 1]; az = [1, 0];
  }
  return new THREE.Matrix4().set(ax[0], 0, az[0], ox, 0, 1, 0, r.y0, ax[1], 0, az[1], oz, 0, 0, 0, 1);
}

// Para que lado a folha abre: -1 = para dentro do cômodo dono, +1 = para o outro lado.
export const ladoQueAbre = a => (a.abrePara === a.comodo || a.abrePara === 'dentro' ? -1 : 1);
export const comprimentoFolha = a => (a.largura - 6) / (num(a.folhas, 1) >= 2 ? 2 : 1);

function folha(M, comp, dir, alt, a) {
  const m = a.material || 'madeira-mel', x0 = Math.min(0, dir * comp), x1 = Math.max(0, dir * comp), esp = 1.75;
  const modelo = a.modelo || 'lisa';
  if (modelo === 'vidro') {
    const q = 9;
    M.cx(x0, x0 + q, 0.8, alt, -esp, esp, m); M.cx(x1 - q, x1, 0.8, alt, -esp, esp, m);
    M.cx(x0 + q, x1 - q, 0.8, 0.8 + q * 1.6, -esp, esp, m); M.cx(x0 + q, x1 - q, alt - q, alt, -esp, esp, m);
    M.cx(x0 + q, x1 - q, 0.8 + q * 1.6, alt - q, -0.4, 0.4, 'vidro', { sombra: false });
  } else {
    M.cx(x0, x1, 0.8, alt, -esp, esp, m);
    if (modelo === 'almofadada') {
      const b = 9;
      for (const [ya, yb] of [[16, alt * 0.44], [alt * 0.44 + 9, alt - 11]]) for (const s of [-1, 1]) M.cx(x0 + b, x1 - b, ya, yb, s > 0 ? esp : -esp - 0.7, s > 0 ? esp + 0.7 : -esp, m, { sombra: false });
    } else if (modelo === 'ripada') {
      const n = Math.max(3, Math.round(comp / 9));
      for (let i = 0; i < n; i++) { const xa = x0 + (i + 0.2) * (comp / n); for (const s of [-1, 1]) M.cx(xa, xa + (comp / n) * 0.6, 3, alt - 2, s > 0 ? esp : -esp - 0.8, s > 0 ? esp + 0.8 : -esp, m, { sombra: false }); }
    }
  }
  // maçaneta dos dois lados
  const hx = dir * (comp - 6.5);
  M.cilZ(hx, 102, -esp - 4, esp * 2 + 8, 1, 'inox', { seg: 10 });
  for (const s of [-1, 1]) M.cx(Math.min(hx, hx - dir * 11), Math.max(hx, hx - dir * 11), 101.2, 102.8, s > 0 ? esp + 3.2 : -esp - 4.6, s > 0 ? esp + 4.6 : -esp - 3.2, 'inox', { sombra: false });
}

// Constrói a esquadria. Devolve os pontos do arco de abertura (para o desenho no piso).
export function construirAbertura(M, a, w, t) {
  const h = num(a.altura, a.tipo === 'janela' ? 120 : 210), arcos = [];
  if (a.tipo === 'vao') return arcos;

  if (a.tipo === 'janela') {
    const q = 4, mq = a.material || 'aluminio', modelo = a.modelo || 'correr', zc = t / 2;
    M.cx(0, w, 0, q, zc - 4, zc + 4, mq); M.cx(0, w, h - q, h, zc - 4, zc + 4, mq);
    M.cx(0, q, q, h - q, zc - 4, zc + 4, mq); M.cx(w - q, w, q, h - q, zc - 4, zc + 4, mq);
    M.cx(-2, w + 2, -2.5, 0, -1, t + 3.5, 'granito-cinza');                       // peitoril de pedra
    if (modelo === 'correr') {
      const meio = w / 2;
      M.cx(q, meio + 2, q, h - q, zc - 2.2, zc - 1.6, 'vidro', { sombra: false });
      M.cx(meio - 1.5, meio + 1.5, q, h - q, zc - 2.8, zc - 1, mq);
      const s = M.sub(0, 0, 0);
      s.cx(meio - 2, w - q, q, h - q, zc + 1.6, zc + 2.2, 'vidro', { sombra: false });
      s.cx(meio - 2, meio + 1, q, h - q, zc + 1, zc + 2.8, mq);
      M.acao('Abrir janela', v => { s.g.position.x = -(meio - q - 2) * v; }, a.estado === 'aberta');
    } else if (modelo === 'basculante') {
      M.cx(q, w - q, q, h - q, zc - 0.3, zc + 0.3, 'vidro', { sombra: false });
      for (let i = 1; i < 3; i++) M.cx(q, w - q, q + ((h - 2 * q) * i) / 3 - 0.7, q + ((h - 2 * q) * i) / 3 + 0.7, zc - 1.5, zc + 1.5, mq);
    } else if (modelo === 'veneziana') {
      const n = Math.round((h - 2 * q) / 6);
      for (let i = 0; i < n; i++) { const y = q + i * ((h - 2 * q) / n); M.cx(q, w - q, y + 0.6, y + 4.2, zc - 0.8, zc + 0.8, a.material || 'madeira-mel'); }
      M.cx(w / 2 - 1.5, w / 2 + 1.5, q, h - q, zc - 1.6, zc + 1.6, a.material || 'madeira-mel');
    } else {
      M.cx(q, w - q, q, h - q, zc - 0.3, zc + 0.3, 'vidro', { sombra: false });
    }
    return arcos;
  }

  // PORTA: batente e guarnição
  const e = 3, mm = a.marco || a.material || 'madeira-mel';
  M.cx(0, e, 0, h, -0.8, t + 0.8, mm); M.cx(w - e, w, 0, h, -0.8, t + 0.8, mm); M.cx(e, w - e, h - e, h, -0.8, t + 0.8, mm);
  for (const [za, zb] of [[-1.6, -0.8], [t + 0.8, t + 1.6]]) { M.cx(-5, 0, 0, h + 5, za, zb, mm, { sombra: false }); M.cx(w, w + 5, 0, h + 5, za, zb, mm, { sombra: false }); M.cx(0, w, h, h + 5, za, zb, mm, { sombra: false }); }
  const aberta = a.estado !== 'fechada';

  if (a.modelo === 'correr') {
    const lado = a.lado === a.comodo || a.lado === 'dentro' ? -1 : 1, zc = lado < 0 ? -4.6 : t + 4.6;
    const dir = pontaFinal(a.correPara) ? 1 : -1, curso = w + 4, comp = w + 10;
    M.cx(dir > 0 ? -5 : -5 - curso, dir > 0 ? w + 5 + curso : w + 5, h + 5, h + 9, zc - 2.4, zc + 2.4, 'metal-preto');   // trilho
    const s = M.sub(-5, 0, zc);
    s.cx(0, comp, 1, h + 4, -1.75, 1.75, a.material || 'madeira-mel');
    for (const k of [-1, 1]) s.cx(dir > 0 ? 6 : comp - 8, dir > 0 ? 8 : comp - 6, 92, 122, k > 0 ? 1.75 : -4, k > 0 ? 4 : -1.75, 'metal-preto', { sombra: false });
    for (const x of [14, comp - 14]) s.cil(x, 0, h + 3, 4, 3, 'metal-preto', { seg: 12, sombra: false });
    M.acao('Abrir porta', v => { s.g.position.x = -5 + dir * curso * v; }, aberta);
    return arcos;
  }

  const sz = ladoQueAbre(a), zf = sz < 0 ? 1.75 : t - 1.75, vao = w - 2 * e, alt = h - e - 0.4;
  const ang = (num(a.angulo, 90) * Math.PI) / 180, mov = [];
  const pivos = num(a.folhas, 1) >= 2 ? [[e, 1, vao / 2 - 0.2], [w - e, -1, vao / 2 - 0.2]] : [pontaFinal(a.dobradica) ? [w - e, -1, vao - 0.4] : [e, 1, vao - 0.4]];
  for (const [px, dir, comp] of pivos) {
    const s = M.sub(px, 0, zf);
    folha(s, comp, dir, alt, a);
    mov.push(v => { s.g.rotation.y = -dir * sz * ang * v; });
    const pts = [[px, zf]];
    for (let i = 14; i >= 0; i--) { const f = (i / 14) * ang; pts.push([px + dir * comp * Math.cos(f), zf + sz * comp * Math.sin(f)]); }
    arcos.push(pts);
  }
  M.acao('Abrir porta', v => mov.forEach(f => f(v)), aberta);
  return arcos;
}
