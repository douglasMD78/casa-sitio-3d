// Catálogo de peças paramétricas.
// Cada peça é registrada com:
//   rotulo     nome amigável
//   camada     moveis | decoracao | eletrica | iluminacao | hidraulica
//   fixacao    livre (padrão) | parede | teto | pontoPiso
//   ponto      true = a posição nos dados vai até o EIXO da peça (tomadas, pontos)
//   colide     true = entra na conferência de sobreposição e de passagens
//   dimensoes  medidas padrão quando o dado não informa
//   construir  desenha a peça no sistema local (ver montagem.js)
import { num, clamp, semente, naPeca, pontaFinal } from './base.js';

export const TIPOS = {};
const APELIDOS = { ilha: 'bancada', 'guarda-roupa': 'armario', torre: 'estante', balcao: 'bancada', aparador: 'armario', nicho: 'prateleiras' };
const reg = (nome, def) => { TIPOS[nome] = { nome, camada: 'moveis', colide: true, fixacao: 'livre', ...def }; };
export const tipoDe = p => (p && (TIPOS[p.tipo] || TIPOS[APELIDOS[p.tipo]])) || null;
// Material principal da peça (cor do bloco simples na visão geral).
export const materialPrincipal = (p, def) => (def.material ? def.material(p) : p.material || p.corpo || (p.tampo && p.tampo.material) || 'mdf-branco');

const GRAOS = ['#cba76a', '#a77d56', '#e7d7a5', '#8b6947', '#d2c5a9', '#b4553c', '#6f8f5a'];

// ---------- partes reaproveitadas ----------
function cesto(M, x0, x1, y0, h, z0, z1) {
  if (x1 - x0 < 8 || h < 6) return;
  M.cx(x0, x1, y0, y0 + h, z0, z1, 'palha');
  M.cx(x0 + 0.8, x1 - 0.8, y0 + h - 1.6, y0 + h + 0.6, z0 - 0.6, z1 + 0.6, 'madeira-clara', { sombra: false });
}
function potes(M, x0, x1, y, zc, r) {
  let x = x0 + 7;
  while (x < x1 - 7) {
    const raio = 4.6 + r() * 1.4, h = 15 + r() * 8;
    M.cil(x, zc, y, h, raio, 'vidro', { sombra: false, seg: 14 });
    M.cil(x, zc, y + 0.6, h * (0.45 + r() * 0.4), raio * 0.86, GRAOS[Math.floor(r() * GRAOS.length)], { sombra: false, seg: 12 });
    M.cil(x, zc, y + h, 1.8, raio + 0.5, 'madeira-clara', { seg: 14 });
    x += raio * 2 + 5 + r() * 6;
  }
}
function caixasDecor(M, x0, x1, y, z0, z1, r) {
  let x = x0 + 4;
  while (x < x1 - 14) { const w = 12 + r() * 14, h = 10 + r() * 14; M.cx(x, x + w, y, y + h, z0 + 3, z1 - 3, ['palha', 'tecido-cru', 'mdf-cinza', 'madeira-clara'][Math.floor(r() * 4)]); x += w + 3 + r() * 6; }
}

function modulosDe(p, L) {
  const ms = Array.isArray(p.modulos) && p.modulos.length ? p.modulos.map(m => ({ ...m })) : [{ tipo: p.base || 'nicho' }];
  const fixo = ms.reduce((s, m) => s + num(m.largura, 0), 0), livres = ms.filter(m => typeof m.largura !== 'number').length;
  const resto = Math.max(0, L - fixo);
  let x = 0;
  for (const m of ms) { const w = typeof m.largura === 'number' ? m.largura : resto / Math.max(1, livres); m.x0 = x; m.x1 = Math.min(L, x + w); x += w; }
  return ms;
}

// Casco modular: usado em bancadas e armários.
// B = limites do casco; o.semTopo quando um tampo cobre; o.y0mundo = altura do pé da peça ao piso.
function corpo(M, p, B, o = {}) {
  const e = num(p.chapa, 1.8), mc = p.corpo || p.material || 'mdf-branco', mf = p.frente || mc, pux = p.puxador || 'barra';
  const alto = (o.y0mundo || 0) > 100, mov = [];
  for (const m of modulosDe(p, B.x1 - B.x0)) {
    const tipo = m.tipo || 'nicho';
    if (tipo === 'vazio') continue;
    const a = B.x0 + m.x0, b = B.x0 + m.x1, fechado = tipo === 'portas' || tipo === 'gavetas';
    const zf = fechado ? B.z1 - 1.9 : B.z1, topo = o.semTopo ? B.y1 : B.y1 - e;
    M.cx(a, a + e, B.y0, B.y1, B.z0, zf, mc); M.cx(b - e, b, B.y0, B.y1, B.z0, zf, mc);
    M.cx(a + e, b - e, B.y0, B.y0 + e, B.z0, zf, mc);
    if (!o.semTopo) M.cx(a + e, b - e, B.y1 - e, B.y1, B.z0, zf, mc);
    if (m.fundo ?? (fechado || p.fundo)) M.cx(a + e, b - e, B.y0 + e, topo, B.z0, B.z0 + 0.6, mc);
    const ia = a + e, ib = b - e, iy0 = B.y0 + e;
    let niv = [];
    if (Array.isArray(m.prateleiras)) niv = m.prateleiras.map(v => v - (o.y0mundo || 0));
    else if (typeof m.prateleiras === 'number') for (let i = 1; i <= m.prateleiras; i++) niv.push(iy0 + ((topo - iy0) * i) / (m.prateleiras + 1));
    else if (tipo === 'portas') niv.push((iy0 + topo) / 2);
    niv = niv.filter(y => y > iy0 + 2 && y < topo - 1).sort((u, v) => u - v);
    for (const y of niv) M.cx(ia, ib, y - e, y, B.z0, zf - (fechado ? 1 : 0), mc);
    const nd = typeof m.divisorias === 'number' ? clamp(Math.round(m.divisorias), 0, 30) : 0, col = nd + 1;
    for (let i = 1; i <= nd; i++) { const x = ia + ((ib - ia) * i) / col; M.cx(x - e / 2, x + e / 2, iy0, topo, B.z0, zf, mc); }
    if (m.cestos && !fechado) {
      const bases = [iy0, ...niv], tetos = [...niv.map(y => y - e), topo];
      bases.forEach((y, k) => {
        if (m.cestos === 'baixo' && k > 0) return;
        for (let c = 0; c < col; c++) cesto(M, ia + ((ib - ia) * c) / col + 3, ia + ((ib - ia) * (c + 1)) / col - 3, y, Math.min(22, tetos[k] - y - 8), B.z0 + 8, zf - 5);
      });
    }
    if (tipo === 'portas') {
      const n = num(m.portas, b - a > 60 ? 2 : 1), ya = B.y0 + 0.3, yb = B.y1 - 0.3;
      const folhas = n >= 2 ? [[a, 1, (b - a) / 2 - 0.3], [b, -1, (b - a) / 2 - 0.3]] : [pontaFinal(m.dobradica) ? [b, -1, b - a - 0.4] : [a, 1, b - a - 0.4]];
      for (const [px, dir, comp] of folhas) {
        const s = M.sub(px, 0, zf);
        s.cx(Math.min(dir * 0.2, dir * comp), Math.max(dir * 0.2, dir * comp), ya, yb, 0.1, 1.9, mf);
        if (pux !== 'nenhum') { const hx = dir * (comp - 4), hy = alto ? ya + 4 : yb - 16; s.cx(hx - 0.6, hx + 0.6, hy, hy + 12, 1.9, 4.2, 'inox', { sombra: false }); }
        mov.push(v => { s.g.rotation.y = -dir * v * 1.75; });
      }
    }
    if (tipo === 'gavetas') {
      const n = clamp(num(m.gavetas, 3), 1, 8), hf = (B.y1 - B.y0) / n;
      for (let k = 0; k < n; k++) {
        const y = B.y0 + k * hf, s = M.sub(0, 0, zf);
        s.cx(a + 0.3, b - 0.3, y + 0.3, y + hf - 0.3, 0.1, 1.9, mf);
        s.cx(ia + 1, ib - 1, y + 2, y + 3, -(zf - B.z0) + 4, 0.1, mc, { sombra: false });
        s.cx(ia + 1, ia + 2.2, y + 3, y + hf - 4, -(zf - B.z0) + 4, 0.1, mc, { sombra: false });
        s.cx(ib - 2.2, ib - 1, y + 3, y + hf - 4, -(zf - B.z0) + 4, 0.1, mc, { sombra: false });
        if (pux !== 'nenhum') s.cx((a + b) / 2 - 7, (a + b) / 2 + 7, y + hf - 6, y + hf - 4.8, 1.9, 4.2, 'inox', { sombra: false });
        mov.push(v => { s.g.position.z = zf + v * Math.min(32, zf - B.z0 - 8) * (0.55 + (0.45 * (k + 1)) / n); });
      }
    }
  }
  if (mov.length) M.acao('Abrir portas e gavetas', v => mov.forEach(f => f(v)), !!p.aberto);
}

// Tampo com recorte de cuba.
function tampo(M, L, y0, y1, z0, z1, mat, cuba) {
  if (!cuba) { M.cx(0, L, y0, y1, z0, z1, mat); return; }
  const w = num(cuba.largura, 50), d = num(cuba.profundidade, 40), x = clamp(naPeca(cuba, L, w), 2, L - w - 2), za = z0 + Math.max(6, (z1 - z0 - d) / 2 + 2), zb = za + d;
  M.cx(0, x, y0, y1, z0, z1, mat); M.cx(x + w, L, y0, y1, z0, z1, mat); M.cx(x, x + w, y0, y1, z0, za, mat); M.cx(x, x + w, y0, y1, zb, z1, mat);
  const f = num(cuba.fundura, 18), mi = cuba.material || 'inox', yb = y1 - f;
  M.cx(x, x + w, yb - 0.6, yb, za, zb, mi); M.cx(x, x + 0.6, yb, y1 - 0.2, za, zb, mi); M.cx(x + w - 0.6, x + w, yb, y1 - 0.2, za, zb, mi);
  M.cx(x, x + w, yb, y1 - 0.2, za, za + 0.6, mi); M.cx(x, x + w, yb, y1 - 0.2, zb - 0.6, zb, mi);
  M.cil(x + w / 2, (za + zb) / 2, yb, 0.4, 2.2, 'metal-preto', { seg: 12, sombra: false });
  if (cuba.torneira !== false) { const tx = x + w / 2, tz = za - 3.2; M.cil(tx, tz, y1, 24, 1.2, 'inox', { seg: 10 }); M.cx(tx - 1, tx + 1, y1 + 22, y1 + 24, tz, tz + 15, 'inox'); M.cil(tx, tz + 14, y1 + 19.5, 2.6, 1, 'inox', { seg: 10 }); }
}

// ---------- MÓVEIS ----------
reg('caixa', { rotulo: 'Caixa (peça genérica)', construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 0, P, p.material || 'mdf-branco'); } });
reg('objeto', { rotulo: 'Objeto decorativo', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 20, profundidade: 20, altura: 20 }),
  construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 0, P, p.material || 'mdf-cinza'); } });

reg('bancada', { rotulo: 'Bancada / ilha', dimensoes: () => ({ largura: 120, profundidade: 60, altura: 90 }),
  material: p => (p.tampo && p.tampo.material) || 'granito-cinza',
  construir(M, p, { L, P, A, y0 }) {
    const t = p.tampo || {}, esp = num(t.espessura, 3), mt = t.material || 'granito-cinza', r = num(p.rodape, 0), rec = num(p.recuo, 0);
    tampo(M, L, A - esp, A, 0, P, mt, p.cuba);
    if (p.cooktop) { const w = num(p.cooktop.largura, 60), d = num(p.cooktop.profundidade, 45), x = naPeca(p.cooktop, L, w), z = (P - d) / 2 + 1; M.cx(x, x + w, A, A + 0.8, z, z + d, 'vidro-escuro', { sombra: false });
      const n = num(p.cooktop.bocas, 4); for (let i = 0; i < n; i++) { const bx = x + w * (n > 4 && i === 4 ? 0.5 : i % 2 ? 0.74 : 0.26), bz = z + d * (n > 4 && i === 4 ? 0.5 : i < 2 ? 0.28 : 0.72); M.cil(bx, bz, A + 0.8, 1.2, i === 4 ? 6.5 : 4.8, 'metal-preto', { seg: 16, sombra: false }); } }
    if (num(p.frontao, 0) > 0) M.cx(0, L, A, A + p.frontao, 0, 2, mt);
    if (r > 0) M.cx(0, L, 0, r, 0, P - rec - 5, p.corRodape || 'mdf-preto');
    if (p.base !== 'aberta') corpo(M, p, { x0: 0, x1: L, y0: r, y1: A - esp, z0: 0, z1: P - rec }, { semTopo: true, y0mundo: y0 });
    else for (const [x, z] of [[3, 3], [L - 9, 3], [3, P - 9], [L - 9, P - 9]]) M.cx(x, x + 6, 0, A - esp, z, z + 6, p.corpo || 'madeira-clara');
  } });

// Ilha de gravação: simulação de volume, marcenaria e equipamentos; não é detalhamento de ventilação.
reg('ilha-gravacao', { rotulo: 'Ilha de apoio / gravação', dimensoes: () => ({ largura: 180, profundidade: 90, altura: 90 }),
  material: p => (p.tampo && p.tampo.material) || 'granito-branco-itaunas',
  construir(M, p, { L, P, A }) {
    const esp = num(p.tampo && p.tampo.espessura, 2), mat = (p.tampo && p.tampo.material) || 'granito-branco-itaunas';
    const rec = num(p.recuo, 30), fim = P - rec, e = 2;
    // Lateral esquerda e direita até o chão; marcenaria de MDF branco com fechamento posterior recuado.
    M.cx(0, e, 0, A - esp, 0, fim, 'mdf-branco');
    M.cx(L - e, L, 0, A - esp, 0, fim, 'mdf-branco');
    M.cx(0, L, 0, 3, 0, fim, 'mdf-branco');
    M.cx(0, L, 3, A - esp, fim - e, fim, 'mdf-branco');
    // Parede frontal da marcenaria voltada à cozinha com nicho central reservado para Fischer.
    const mw = 59.5, mx = (L - mw) / 2, my = 23, mh = 39, mdepth = 55;
    M.cx(0, mx - 0.5, 3, A - esp, 0, e, 'mdf-branco');
    M.cx(mx + mw + 0.5, L, 3, A - esp, 0, e, 'mdf-branco');
    M.cx(mx - 0.5, mx + mw + 0.5, 3, my, 0, e, 'mdf-branco');
    M.cx(mx - 0.5, mx + mw + 0.5, my + mh, A - esp, 0, e, 'mdf-branco');
    // Portas de armário laterais interativas.
    const porta = (x0, x1, lado) => {
      const piv = lado === 'esquerda' ? x0 : x1;
      const obj = M.sub(piv, 0, 0);
      obj.cx(x0 - piv, x1 - piv, 7, A - 5, -1.2, 0, 'mdf-branco');
      obj.cx(x0 - piv + 1, x1 - piv - 1, 10, A - 8, -1.5, -1.2, 'madeira-clara', { sombra: false });
      return v => {obj.g.rotation.y = (lado === 'esquerda' ? -1 : 1) * v * 1.35;};
    };
    const openL = porta(3, mx - 3, 'esquerda'), openR = porta(mx + mw + 3, L - 3, 'direita');
    M.acao('Abrir armários inferiores', v => { openL(v); openR(v); }, !!p.aberto);
    // Mockup exterior Fischer Infinity Touch 25 L preto; instalação exige nicho e chaminé superior aprovados.
    const face = M.sub(mx, my, -2);
    face.cx(0, mw, 0, mh, -0.5, 0.5, '#101114');
    face.cx(3, mw - 3, 5, mh - 6, -0.8, -0.4, '#202329', { sombra: false });
    face.cx(5, mw - 5, mh - 8, mh - 5, -1.8, -0.5, 'inox', { sombra: false });
    face.cx(mw * 0.48, mw * 0.64, mh - 3, mh - 1.8, -0.9, -0.4, '#1e78b3', { sombra: false });
    // Torre retrátil ilustrativa, sobre o tampo e no canto da lateral cozinha.
    const tx = L - 18, tz = 14, torre = M.sub(tx, A - esp, tz);
    torre.cx(0, 9, 0, 2.5, 0, 9, 'metal-preto');
    torre.cx(1, 8, 2.5, 19, 1, 8, 'metal-preto');
    for (const y of [6, 11.5, 17]) torre.cx(2, 7, y - 1.2, y + 1.2, 0.7, 1.2, 'placa-branca', { sombra: false });
    M.acao('Erguer torre de tomadas (ilustrativa)', v => { torre.g.position.y = A - esp - (1-v) * 16; }, false);
    M.cx(0, L, A - esp, A, 0, P, mat);
  }
});

reg('armario', { rotulo: 'Armário', dimensoes: p => ({ largura: 80, profundidade: num(p.doPiso, 0) > 100 ? 35 : 55, altura: num(p.doPiso, 0) > 100 ? 70 : 240 }),
  construir(M, p, { L, P, A, y0 }) {
    const r = y0 < 1 ? num(p.rodape, 0) : 0;
    if (r > 0) M.cx(0, L, 0, r, 0, P - 5, p.corRodape || 'mdf-preto');
    corpo(M, { base: 'portas', fundo: true, ...p }, { x0: 0, x1: L, y0: r, y1: A, z0: 0, z1: P }, { y0mundo: y0 });
  } });

reg('prateleiras', { rotulo: 'Prateleiras de parede', fixacao: 'parede', doPisoFixo: true,
  dimensoes(p) { const n = [...(p.niveis || [150])].sort((a, b) => a - b), e = num(p.chapa, 3); return { profundidade: 30, doPiso: n[0] - e, altura: n[n.length - 1] - n[0] + e }; },
  construir(M, p, { L, P, A, y0 }) {
    const e = num(p.chapa, 3), m = p.material || 'mdf-branco', niv = [...(p.niveis || [150])].sort((a, b) => a - b).map(v => v - y0), r = semente(p.id || 'prat');
    for (const y of niv) M.cx(0, L, y - e, y, 0, P, m);
    if (p.laterais) { M.cx(0, e, 0, A, 0, P, m); M.cx(L - e, L, 0, A, 0, P, m); }
    const div = Array.isArray(p.divisorias) ? p.divisorias : typeof p.divisorias === 'number' ? Array.from({ length: p.divisorias }, (_, i) => (L * (i + 1)) / (p.divisorias + 1)) : [];
    for (const x of div) M.cx(x - e / 2, x + e / 2, 0, A, 0, P, m);
    if (p.decor) {
      const cortes = [0, ...div, L].sort((a, b) => a - b), ultimo = p.laterais ? niv.length - 1 : niv.length;
      for (let k = 0; k < ultimo; k++) for (let c = 0; c < cortes.length - 1; c++) {
        const tipo = p.decor === 'misto' ? (r() < 0.6 ? 'potes' : 'caixas') : p.decor;
        if (tipo === 'caixas') caixasDecor(M, cortes[c] + e, cortes[c + 1] - e, niv[k], 0, P, r); else potes(M, cortes[c] + e, cortes[c + 1] - e, niv[k], P * 0.5, r);
      }
    }
  } });

reg('estante', { rotulo: 'Estante / torre', dimensoes: () => ({ largura: 70, profundidade: 40, altura: 200 }),
  construir(M, p, { L, P, A, y0 }) {
    const e = num(p.chapa, 2.5), m = p.material || 'mdf-branco', niv = (p.niveis || []).map(v => v - y0);
    if (p.laterais !== false) { M.cx(0, e, 0, A, 0, P, m); M.cx(L - e, L, 0, A, 0, P, m); }
    if (p.tampo) M.cx(e, L - e, A - e, A, 0, P, m);
    if (p.fundo) M.cx(e, L - e, 0, A, 0, 0.6, m);
    for (const y of niv) M.cx(e, L - e, y - e, y, 0, P, m);
    for (const it of p.itens || []) {
      const def = tipoDe(it); if (!def) continue;
      const d = def.dimensoes ? def.dimensoes(it, {}) : {}, w = num(it.largura, num(d.largura, 40)), dd = num(it.profundidade, num(d.profundidade, 30)), h = num(it.altura, num(d.altura, 30));
      const y = niv[num(it.nivel, 0)] ?? 0;
      def.construir(M.sub((L - w) / 2, y, Math.max(0, P - dd - 6)), it, { L: w, P: dd, A: h, y0: y0 + y });
    }
  } });

const ELETROS = {
  geladeira: [70, 72, 178, 'eletro-inox'], 'freezer-vertical': [60, 65, 184, 'eletro-branco'], microondas: [48, 36, 27, 'eletro-inox'], forno: [55, 48, 36, 'eletro-preto'],
  airfryer: [30, 36, 34, 'eletro-preto'], fogao: [76, 62, 90, 'eletro-inox'], 'lava-roupas': [60, 65, 100, 'eletro-branco'], 'lavadora-frontal': [60, 65.9, 85, 'eletro-branco'], 'lavadora-superior': [59.1, 66.5, 105.2, 'eletro-branco'], tanquinho: [58, 58, 95, 'eletro-branco'], 'tanquinho-suggar-eco20': [55, 59.5, 95.7, 'eletro-branco'], 'lava-loucas': [60, 60, 82, 'eletro-inox'],
  cafeteira: [22, 30, 34, 'eletro-preto'], liquidificador: [18, 18, 40, 'eletro-preto'], generico: [40, 35, 30, 'eletro-inox'],
};
// Modelo dedicado Midea RM905 (MDRM905MMD463), dimensões externas e portas conforme manual 2026 rev.04.
// Prateleiras/gavetas internas ilustrativas: o fabricante não fornece todas as cotas internas.
// As ações são independentes: duas portas superiores, porta inferior do freezer e três gavetas.
reg('geladeira-midea-rm905', { rotulo: 'Midea RM905 Multidoor 672 L', dimensoes: () => ({ largura: 83.5, profundidade: 71.8, altura: 184.5 }),
  material: () => 'eletro-inox',
  construir(M, p, { L, P, A }) {
    const cor = p.material || 'eletro-inox', frente = P - 2.5, meio = L / 2;
    const pisoFreezer = A * 0.35, topo = A - 2.5, base = 2.5;
    // Corpo e cavidades: fundo, laterais, teto e divisão entre freezer e refrigerador.
    M.cx(0, L, 0, A, 0, 4, cor);
    M.cx(0, 3.5, 2, A, 4, frente, cor); M.cx(L - 3.5, L, 2, A, 4, frente, cor);
    M.cx(3.5, L - 3.5, A - 4, A, 4, frente, 'mdf-branco');
    M.cx(3.5, L - 3.5, pisoFreezer - 2, pisoFreezer + 2, 4, frente, 'mdf-branco');
    M.cx(3.5, L - 3.5, 2, 5, 4, frente, 'mdf-branco');
    // Interior branco, prateleiras de vidro e gavetas.
    M.cx(4, L - 4, pisoFreezer + 3, topo, 4.1, 5, 'mdf-branco', { sombra: false });
    for (const y of [pisoFreezer + 40, pisoFreezer + 60, pisoFreezer + 80, pisoFreezer + 100]) {
      if (y < topo - 4) M.cx(4.5, L - 4.5, y, y + 0.7, 7, frente - 4, 'vidro', { sombra: false });
    }
    // Iluminação interna estilizada.
    M.cx(35, 48, topo - 5, topo - 3.5, 6, 7, '#fff8dc', { sombra: false });
    // Gavetas refrigeradas: duas hortifruti e uma grande (curso ilustrativo).
    const gav = (nome, x0, x1, y, h, z0, z1, curso) => {
      const g = M.sub(0, 0, 0);
      g.cx(x0, x1, y, y + h, z0, z1, 'vidro', { sombra: false });
      g.cx(x0, x1, y, y + 2, z1 - 1, z1 + 0.6, 'mdf-branco', { sombra: false });
      M.acao(nome, v => { g.g.position.z = curso * v; }, false);
    };
    gav('RM905 · gaveta de legumes esquerda', 5, meio - 1, pisoFreezer + 5, 16, 8, frente - 4, 23);
    gav('RM905 · gaveta de legumes direita', meio + 1, L - 5, pisoFreezer + 5, 16, 8, frente - 4, 23);
    gav('RM905 · gaveta extra fria', 5, L - 5, pisoFreezer + 23, 12, 8, frente - 4, 22);
    // Freezer: duas gavetas internas independentes, com ice maker esquemático.
    gav('RM905 · gaveta freezer superior', 5, L - 5, 31, 18, 8, frente - 4, 23);
    gav('RM905 · gaveta freezer inferior', 5, L - 5, 7, 20, 8, frente - 4, 23);
    M.cx(10, 29, 50, 54, 13, 29, 'mdf-branco', { sombra: false });
    // Portas superiores francesas: 2 folhas ~41 cm, dobradiças externas.
    const porta = (nome, lado, x0, x1, y0, y1, angulo, prateleiras) => {
      const eixo = lado === 'esquerda' ? 1.4 : L - 1.4;
      const g = M.sub(eixo, 0, frente);
      g.cx(x0 - eixo, x1 - eixo, y0, y1, 0, 3.4, cor);
      g.cx(x0 - eixo + 1, x1 - eixo - 1, y0 + 1, y1 - 1, 3.4, 3.8, '#9fa7ac', { sombra: false });
      if (prateleiras) {
        for (const y of [y0 + 22, y0 + 48, y0 + 76]) if (y < y1 - 6) {
          g.cx(Math.min(x0 - eixo + 5, x1 - eixo - 5), Math.max(x0 - eixo + 5, x1 - eixo - 5), y, y + 2, -10, 0, 'mdf-branco', { sombra: false });
        }
      }
      M.acao(nome, v => { g.g.rotation.y = (lado === 'esquerda' ? -1 : 1) * angulo * Math.PI / 180 * v; }, false);
    };
    porta('RM905 · porta superior esquerda', 'esquerda', 1.4, meio - 0.5, pisoFreezer + 1.5, topo, 130, true);
    porta('RM905 · porta superior direita', 'direita', meio + 0.5, L - 1.4, pisoFreezer + 1.5, topo, 130, true);
    // Porta inferior única do freezer, abertura lateral ilustrativa; verificar lado da dobradiça na unidade.
    porta('RM905 · porta inferior do freezer', 'esquerda', 1.4, L - 1.4, base, pisoFreezer - 0.7, 110, false);
    M.cx(3, L - 3, 0.5, 2.5, P - 12, P - 3, '#42484d');
    M.cx(meio - 3, meio + 3, pisoFreezer + 17, pisoFreezer + 32, P + 1, P + 1.3, '#656c72', { sombra: false });
  }
});

reg('eletro', { rotulo: 'Eletrodoméstico',
  dimensoes(p) { const e = ELETROS[p.modelo] || ELETROS.generico; return { largura: e[0], profundidade: e[1], altura: e[2] }; },
  material: p => p.material || (ELETROS[p.modelo] || ELETROS.generico)[3],
  construir(M, p, { L, P, A }) {
    const m = p.material || (ELETROS[p.modelo] || ELETROS.generico)[3], fim = pontaFinal(p.dobradica), dir = fim ? -1 : 1;
    switch (p.modelo) {
      case 'geladeira': case 'freezer-vertical': {
        const pe = 2, cz = P - 4.5, mov = [];
        M.cx(0, L, pe, A, 0, cz, m);
        M.cx(2.5, L - 2.5, pe + 3, A - 3, cz - 0.3, cz + 0.05, '#e6eaea', { sombra: false });
        for (let k = 1; k < 5; k++) M.cx(2.5, L - 2.5, pe + ((A - pe) * k) / 5, pe + ((A - pe) * k) / 5 + 0.8, cz - 0.2, cz + 0.2, '#c9d2d4', { sombra: false });
        const partes = p.modelo === 'geladeira' ? [[pe, pe + (A - pe) * 0.66, 0.5, 0.86], [pe + (A - pe) * 0.66 + 0.6, A, 0.12, 0.6]] : [[pe, A, 0.5, 0.86]];
        for (const [ya, yb, ha, hb] of partes) {
          const s = M.sub(fim ? L : 0, 0, cz), hx = dir * (L - 5);
          s.cx(Math.min(0, dir * L), Math.max(0, dir * L), ya, yb, 0.1, 4.5, m);
          s.cx(hx - 1.2, hx + 1.2, ya + (yb - ya) * ha, ya + (yb - ya) * hb, 4.5, 7.2, 'inox', { sombra: false });
          mov.push(v => { s.g.rotation.y = -dir * v * 1.55; });
        }
        M.acao('Abrir porta', v => mov.forEach(f => f(v)), !!p.aberto);
        break; }
      case 'fogao': {
        M.cx(0, L, 4, A - 3, 0, P - 3, m); for (const [x, z] of [[2, 2], [L - 6, 2], [2, P - 9], [L - 6, P - 9]]) M.cx(x, x + 4, 0, 4, z, z + 4, 'metal-preto');
        M.cx(3, L - 3, 14, A - 22, P - 3, P - 1, 'vidro-escuro', { sombra: false }); M.cx(6, L - 6, A - 21, A - 19.4, P - 1, P + 1.4, 'inox', { sombra: false });
        M.cx(0, L, A - 3, A - 1.6, 0, P - 3, 'vidro-escuro');
        const n = L > 70 ? 5 : 4; for (let i = 0; i < n; i++) { const bx = L * (i === 4 ? 0.5 : i % 2 ? 0.78 : 0.22), bz = (P - 3) * (i === 4 ? 0.5 : i < 2 ? 0.28 : 0.72); M.cil(bx, bz, A - 1.6, 1.6, i === 4 ? 7 : 5, 'metal-preto', { seg: 16 }); }
        for (let i = 0; i < n; i++) M.cilZ(L * 0.14 + (i * L * 0.72) / (n - 1), A - 9, P - 3, 3, 1.7, 'metal-preto', { seg: 12, sombra: false });
        break; }
      case 'lavadora-frontal': {
        M.cx(0, L, 1.5, A, 0, P - 2, m);
        M.cx(2, L - 2, A - 13, A - 2.5, P - 2, P - 0.6, '#edf0f1', { sombra: false });
        M.cx(5, L * .38, A - 11, A - 6, P - .6, P, 'vidro-escuro', { sombra: false });
        const cy = (A - 13) / 2 + 3, r = Math.min(L * .32, (A - 15) * .45);
        M.cilZ(L / 2, cy, P - 1.7, 1.1, r + 1.3, 'inox', { seg: 40, sombra: false });
        M.cilZ(L / 2, cy, P - .6, .6, r - 3, 'vidro-escuro', { seg: 40, sombra: false });
        // Porta frontal articulada na lateral esquerda; braço da dobradiça em Y.
        const porta = M.sub(2, 0, P - .2);
        porta.cilZ(L / 2 - 2, cy, 0, 1.5, r, 'inox', { seg: 40, sombra: false });
        porta.cilZ(L / 2 - 2, cy, 1.5, 1, r - 4, 'vidro-escuro', { seg: 40, sombra: false });
        M.acao('Abrir porta frontal', v => { porta.g.rotation.y = -v * 1.75; }, !!p.aberto);
        break; }
      case 'lavadora-superior': case 'tanquinho': case 'tanquinho-suggar-eco20': {
        const tq = p.modelo === 'tanquinho' || p.modelo === 'tanquinho-suggar-eco20';
        M.cx(0, L, tq ? 6 : 2, A - 3, 0, P - 1.5, m);
        M.cx(2, L - 2, A - (tq ? 20 : 14), A - 4, P - 1.5, P - .3, tq ? 'eletro-branco' : '#e4e8e9', { sombra: false });
        if (tq) for (let i = 0; i < 4; i++) M.cx(L * .15 + i * L * .18, L * .24 + i * L * .18, A - 13, A - 9, P - .3, P + .7, 'vidro-escuro', { sombra: false });
        if (p.modelo === 'tanquinho-suggar-eco20') M.cx(0.8, L - 0.8, 14, 18, P - 1, P + 0.5, '#65adb4', { sombra: false });
        const tampa = M.sub(0, A - 3, 4);
        tampa.cx(2, L - 2, 0, 2.5, 0, P - 7, tq ? 'eletro-branco' : '#dfe5e6', { sombra: false });
        tampa.cx(5, L - 5, 2.5, 2.9, 5, P - 14, tq ? 'placa-branca' : 'vidro-escuro', { sombra: false });
        M.acao('Abrir tampa superior', v => { tampa.g.rotation.x = -v * (tq ? 1.25 : 0.61); }, !!p.aberto);
        break; }
      case 'lava-roupas': {
        M.cx(0, L, 2, A, 0, P - 1.5, m); M.cx(2, L - 2, A - 14, A - 3, P - 1.5, P - 0.6, 'vidro-escuro', { sombra: false });
        M.cilZ(L / 2, (A - 14) / 2 + 3, P - 1.5, 1.5, L * 0.3, 'inox', { seg: 28, sombra: false }); M.cilZ(L / 2, (A - 14) / 2 + 3, P - 1, 1.2, L * 0.23, 'vidro-escuro', { seg: 28, sombra: false });
        break; }
      case 'microondas': case 'forno': {
        M.cx(0, L, 1, A, 0, P - 0.8, m); M.cx(1.5, L * 0.74, 3, A - 2, P - 0.8, P - 0.2, 'vidro-escuro', { sombra: false });
        M.cx(L * 0.77, L - 1.5, 3, A - 2, P - 0.8, P - 0.3, '#2a2e30', { sombra: false }); M.cx(L * 0.705, L * 0.73, 4, A - 3, P - 0.2, P + 1.6, 'inox', { sombra: false });
        break; }
      case 'airfryer': {
        M.cx(1, L - 1, 0, A * 0.88, 1, P - 2, m); M.cx(3, L - 3, A * 0.88, A, 3, P - 4, m);
        M.cx(3, L - 3, 3, A * 0.5, P - 2, P - 1, '#22262a', { sombra: false }); M.cx(L / 2 - 4, L / 2 + 4, A * 0.3, A * 0.36, P - 1, P + 3, '#22262a', { sombra: false });
        break; }
      case 'liquidificador': case 'cafeteira': {
        M.cx(1, L - 1, 0, A * 0.32, 1, P - 1, m); M.cil(L / 2, P / 2, A * 0.32, A * 0.6, Math.min(L, P) * 0.36, 'vidro', { sombra: false, seg: 14 }); M.cil(L / 2, P / 2, A * 0.92, A * 0.08, Math.min(L, P) * 0.38, m, { seg: 14 });
        break; }
      default: {
        M.cx(0, L, 0, A, 0, P - 0.8, m); M.cx(L * 0.07, L * 0.93, A * 0.16, A * 0.86, P - 0.8, P - 0.2, m === 'eletro-preto' ? 'inox' : 'vidro-escuro', { sombra: false });
        if (p.modelo === 'lava-loucas') M.cx(L * 0.2, L * 0.8, A - 9, A - 7.6, P - 0.2, P + 2, 'inox', { sombra: false });
      }
    }
  } });

reg('mesa', { rotulo: 'Mesa', dimensoes: () => ({ largura: 160, profundidade: 90, altura: 76 }), material: p => p.tampo || p.material || 'madeira-mel',
  construir(M, p, { L, P, A }) {
    const mt = p.tampo || p.material || 'madeira-mel', me = p.estrutura || mt, e = num(p.espessura, 4);
    if (p.redonda) { M.cil(L / 2, P / 2, A - e, e, Math.min(L, P) / 2, mt, { seg: 40 }); M.cil(L / 2, P / 2, 3, A - e - 3, 5, me); M.cil(L / 2, P / 2, 0, 3, Math.min(L, P) * 0.3, me, { seg: 28 }); return; }
    M.cx(0, L, A - e, A, 0, P, mt);
    if (p.pes === 'central') { M.cx(L / 2 - 30, L / 2 + 30, 0, A - e, P / 2 - 5, P / 2 + 5, me); M.cx(L / 2 - 40, L / 2 + 40, 0, 4, P / 2 - 25, P / 2 + 25, me); }
    else { for (const [x, z] of [[5, 5], [L - 11, 5], [5, P - 11], [L - 11, P - 11]]) M.cx(x, x + 6, 0, A - e, z, z + 6, me); M.cx(8, L - 8, A - e - 7, A - e, 7, 9.5, me, { sombra: false }); M.cx(8, L - 8, A - e - 7, A - e, P - 9.5, P - 7, me, { sombra: false }); }
  } });

reg('cadeira', { rotulo: 'Cadeira', dimensoes: () => ({ largura: 45, profundidade: 48, altura: 90 }), material: p => p.material || 'madeira-mel',
  construir(M, p, { L, P, A }) {
    const m = p.material || 'madeira-mel', as = num(p.assento, 45);
    for (const [x, z] of [[1, 2], [L - 5, 2], [1, P - 6], [L - 5, P - 6]]) M.cx(x, x + 4, 0, z < 5 ? A : as - 4, z, z + 4, m);
    M.cx(0, L, as - 4, as, 2, P, p.estofado || m); M.cx(1, L - 1, A - 26, A - 4, 2.5, 5.5, p.estofado || m);
  } });
reg('banqueta', { rotulo: 'Banqueta', dimensoes: () => ({ largura: 38, profundidade: 38, altura: 70 }), material: p => p.material || 'madeira-mel',
  construir(M, p, { L, P, A }) {
    const m = p.material || 'madeira-mel';
    M.cx(0, L, A - 4, A, 0, P, p.estofado || m);
    for (const [x, z] of [[2, 2], [L - 5, 2], [2, P - 5], [L - 5, P - 5]]) M.cx(x, x + 3, 0, A - 4, z, z + 3, p.estrutura || m);
    M.cx(4, L - 4, A * 0.3, A * 0.3 + 2, 2.5, 4.5, p.estrutura || m, { sombra: false }); M.cx(4, L - 4, A * 0.3, A * 0.3 + 2, P - 4.5, P - 2.5, p.estrutura || m, { sombra: false });
  } });

const CAMAS = { solteiro: [88, 188], casal: [138, 188], queen: [158, 198], king: [193, 203] };
reg('cama', { rotulo: 'Cama', dimensoes(p) { const c = CAMAS[p.tamanho] || CAMAS.casal; return { largura: c[0] + 6, profundidade: c[1] + 8, altura: 55 }; }, material: p => p.roupa || 'tecido-cru',
  construir(M, p, { L, P, A }) {
    const me = p.estrutura || 'madeira-mel', cab = p.cabeceira === false ? null : p.cabeceira || {}, hc = cab ? num(cab.altura, 110) : 0, ec = cab ? num(cab.espessura, 6) : 0;
    if (cab) M.cx(0, L, 0, hc, 0, ec, cab.material || me);
    M.cx(0, L, 8, A - 24, ec, P, me); for (const [x, z] of [[4, ec + 4], [L - 10, ec + 4], [4, P - 10], [L - 10, P - 10]]) M.cx(x, x + 6, 0, 8, z, z + 6, me);
    M.cx(3, L - 3, A - 24, A, ec + 1, P - 3, 'tecido-cru');
    M.cx(2, L - 2, A - 12, A + 1.2, ec + P * 0.3, P - 2, p.roupa || 'tecido-cinza', { sombra: false });
    const np = L > 120 ? 2 : 1, wp = (L - 16) / np - 4;
    for (let i = 0; i < np; i++) M.cx(8 + i * (wp + 8), 8 + i * (wp + 8) + wp, A, A + 11, ec + 6, ec + 44, 'placa-branca');
  } });

reg('sofa', { rotulo: 'Sofá', dimensoes: () => ({ largura: 220, profundidade: 92, altura: 85 }), material: p => p.material || 'tecido-cinza',
  construir(M, p, { L, P, A }) {
    const m = p.material || 'tecido-cinza', br = 16, as = num(p.assento, 42), n = clamp(num(p.lugares, Math.round((L - 2 * br) / 72)), 1, 6), w = (L - 2 * br) / n;
    M.cx(0, L, 6, as - 12, 0, P, m); for (const [x, z] of [[4, 4], [L - 9, 4], [4, P - 9], [L - 9, P - 9]]) M.cx(x, x + 5, 0, 6, z, z + 5, 'metal-preto');
    M.cx(0, L, as - 12, A, 0, 20, m); M.cx(0, br, as - 12, as + 18, 20, P, m); M.cx(L - br, L, as - 12, as + 18, 20, P, m);
    for (let i = 0; i < n; i++) { M.cx(br + i * w + 0.6, br + (i + 1) * w - 0.6, as - 12, as, 20, P - 1, m); M.cx(br + i * w + 1.5, br + (i + 1) * w - 1.5, as, A - 6, 20, 34, m); }
  } });

reg('tapete', { rotulo: 'Tapete', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 200, profundidade: 150, altura: 1 }), material: p => p.material || 'tecido-cru',
  construir(M, p, { L, P }) { M.cx(0, L, 0, 1, 0, P, p.material || 'tecido-cru', { sombra: false }); } });

reg('tv', { rotulo: 'TV', fixacao: 'parede', colide: false, dimensoes: () => ({ largura: 123, profundidade: 5, altura: 71, doPiso: 105 }), material: () => 'vidro-escuro',
  construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 1.5, P, 'metal-preto'); M.cx(1, L - 1, 1, A - 1, P, P + 0.2, 'vidro-escuro', { sombra: false }); M.cx(L * 0.3, L * 0.7, A * 0.3, A * 0.7, 0, 1.5, 'metal-preto'); } });
reg('espelho', { rotulo: 'Espelho', fixacao: 'parede', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 60, profundidade: 2, altura: 80, doPiso: 100 }), material: () => 'espelho',
  construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 0, P - 0.4, p.moldura || 'mdf-preto'); M.cx(1.5, L - 1.5, 1.5, A - 1.5, P - 0.4, P, 'espelho', { sombra: false }); } });
reg('quadro', { rotulo: 'Quadro', fixacao: 'parede', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 60, profundidade: 3, altura: 80, doPiso: 110 }),
  construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 0, P - 0.5, p.moldura || 'madeira-mel'); M.cx(3, L - 3, 3, A - 3, P - 0.5, P, p.material || '#d9d3c4', { sombra: false }); } });

reg('planta', { rotulo: 'Vaso com planta', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 40, profundidade: 40, altura: 110 }), material: () => 'folhagem',
  construir(M, p, { L, P, A }) {
    const r = semente(p.id || 'planta'), rv = Math.min(L, P) * 0.32, hv = Math.min(34, A * 0.3);
    M.cil(L / 2, P / 2, 0, hv, rv * 0.8, p.vaso || 'ceramica-vaso', { rTopo: rv, seg: 18 });
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = r() * rv * 0.9, y = hv + (A - hv) * (0.3 + r() * 0.6); M.cx(L / 2 + Math.cos(a) * d * 0.4 - 0.5, L / 2 + Math.cos(a) * d * 0.4 + 0.5, hv, y, P / 2 + Math.sin(a) * d * 0.4 - 0.5, P / 2 + Math.sin(a) * d * 0.4 + 0.5, '#6b5a3c', { sombra: false }); M.esfera(L / 2 + Math.cos(a) * d, y, P / 2 + Math.sin(a) * d, L * (0.2 + r() * 0.13), 'folhagem', { escala: [1, 0.75, 1] }); }
  } });
reg('cesto', { rotulo: 'Cesto', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 35, profundidade: 28, altura: 20 }), material: () => 'palha', construir(M, p, { L, P, A }) { cesto(M, 0, L, 0, A, 0, P); } });
reg('potes', { rotulo: 'Potes de mantimentos', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 60, profundidade: 14, altura: 24 }), construir(M, p, { L, P }) { potes(M, -6, L + 6, 0, P / 2, semente(p.id || 'potes')); } });

reg('grelha', { rotulo: 'Grelha de ventilação', fixacao: 'parede', colide: false, dimensoes: () => ({ largura: 60, profundidade: 2, altura: 30, doPiso: 240 }), material: () => 'placa-branca',
  construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 0, 0.6, '#5d6562', { sombra: false }); M.cx(0, L, 0, 2, 0, P, 'placa-branca'); M.cx(0, L, A - 2, A, 0, P, 'placa-branca'); M.cx(0, 2, 0, A, 0, P, 'placa-branca'); M.cx(L - 2, L, 0, A, 0, P, 'placa-branca');
    const n = Math.max(2, Math.round((A - 4) / 5)); for (let i = 0; i < n; i++) { const y = 2 + ((A - 4) * (i + 0.5)) / n; M.cx(2, L - 2, y - 1.2, y + 1.2, 0.6, P - 0.2, 'placa-branca', { sombra: false }); } } });
reg('revestimento', { rotulo: 'Revestimento de parede', fixacao: 'parede', camada: 'decoracao', colide: false, dimensoes: () => ({ largura: 100, profundidade: 1, altura: 60 }),
  construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 0, P, p.material || 'ceramica-banho', { sombra: false }); } });

// Revestimento cerâmico branco tipo metrô / tijolinho, com juntas desencontradas.
// Peça fina fixada à parede, sem colisão funcional.
reg('revestimento-tijolinho', { rotulo: 'Azulejo branco tipo tijolinho', fixacao: 'parede', camada: 'decoracao', colide: false,
  dimensoes: () => ({ largura: 150, profundidade: 0.9, altura: 130, doPiso: 93 }),
  construir(M, p, { L, A }) {
    const largTile = num(p.larguraPeca, 16), altTile = num(p.alturaPeca, 7.5);
    const junta = 0.35, n = Math.ceil(A / altTile);
    M.cx(0, L, 0, A, 0, 0.4, '#dad9d4', { sombra: false });
    for (let linha = 0; linha < n; linha++) {
      const y0 = linha * altTile + junta / 2, y1 = Math.min(A, (linha + 1) * altTile - junta / 2);
      if (y1 <= y0) continue;
      const desloc = linha % 2 ? largTile / 2 : 0;
      for (let k = -1; k <= Math.ceil(L / largTile) + 1; k++) {
        const x0 = Math.max(0, k * largTile - desloc + junta / 2);
        const x1 = Math.min(L, (k + 1) * largTile - desloc - junta / 2);
        if (x1 <= x0) continue;
        M.cx(x0, x1, y0, y1, 0.42, 0.95, (k + linha) % 7 === 0 ? '#eeece8' : '#faf9f5', { sombra: false });
      }
    }
  } });

// ---------- LOUÇAS ----------
reg('vaso-sanitario', { rotulo: 'Vaso sanitário', dimensoes: () => ({ largura: 38, profundidade: 66, altura: 78 }), material: () => 'louca-branca',
  construir(M, p, { L, P }) { const m = 'louca-branca'; M.cx(0, L, 36, 78, 0, 18, m); M.cx(4, L - 4, 0, 36, 6, 40, m); M.cil(L / 2, 42, 0, 36, L * 0.36, m, { seg: 22 }); M.cil(L / 2, 44, 36, 4, L * 0.5, m, { seg: 26 }).scale.set(1, 1, 1.25); M.cx(L / 2 - 3, L / 2 + 3, 78, 79.5, 6, 12, 'inox', { sombra: false }); } });
reg('lavatorio', { rotulo: 'Lavatório', fixacao: 'parede', dimensoes: () => ({ largura: 46, profundidade: 38, altura: 86 }), material: () => 'louca-branca',
  construir(M, p, { L, P, A }) { const m = 'louca-branca'; M.cx(0, L, A - 16, A, 0, P, m); M.cx(4, L - 4, A - 1.5, A + 0.2, 6, P - 4, '#dfe6e6', { sombra: false }); if (p.coluna !== false) M.cx(L / 2 - 8, L / 2 + 8, 0, A - 16, 3, 19, m); M.cil(L / 2, 4, A, 14, 1.1, 'inox', { seg: 10 }); M.cx(L / 2 - 1, L / 2 + 1, A + 12, A + 14, 4, 15, 'inox'); } });
reg('tanque', { rotulo: 'Tanque', dimensoes: () => ({ largura: 60, profundidade: 52, altura: 86 }), material: () => 'louca-branca',
  construir(M, p, { L, P, A }) { const m = 'louca-branca'; M.cx(0, L, A - 30, A, 0, P, m); M.cx(4, L - 4, A - 1.5, A + 0.2, 10, P - 4, '#dfe6e6', { sombra: false }); M.cx(L / 2 - 10, L / 2 + 10, 0, A - 30, 6, 26, m); M.cil(L / 2, 5, A, 16, 1.1, 'inox', { seg: 10 }); M.cx(L / 2 - 1, L / 2 + 1, A + 14, A + 16, 5, 18, 'inox'); } });
reg('box', { rotulo: 'Box de vidro', dimensoes: () => ({ largura: 120, profundidade: 90, altura: 190 }), material: () => 'vidro',
  construir(M, p, { L, P, A }) {
    const lados = Array.isArray(p.vidros) ? p.vidros : ['frente'];
    for (const v of lados) {
      if (v === 'frente') { M.cx(0, L * 0.5, 1, A, P - 1, P - 0.2, 'vidro', { sombra: false }); const s = M.sub(0, 0, 0); s.cx(L * 0.46, L, 1, A, P - 2.2, P - 1.4, 'vidro', { sombra: false }); s.cx(L - 6, L - 4.5, 90, 120, P - 1.4, P + 1.5, 'inox', { sombra: false }); M.acao('Abrir box', x => { s.g.position.x = -L * 0.44 * x; }, !!p.aberto); M.cx(0, L, A, A + 2.5, P - 2.6, P, 'inox'); }
      else { const x = pontaFinal(v) ? L - 1 : 0.2; M.cx(x, x + 0.8, 1, A, 0, P, 'vidro', { sombra: false }); }
    }
    M.cx(0, L, 0, 1, 0, P, p.piso || 'ceramica-banho', { sombra: false });
  } });

// ---------- ELÉTRICA ----------
function placa(M, L, A, cor) { M.cx(0, L, 0, A, 0, 0.8, cor || 'placa-branca', { sombra: false }); }
reg('tomada', { rotulo: 'Tomada', camada: 'eletrica', colide: false, ponto: true, fixacao: 'parede', etiqueta: 'T',
  dimensoes: () => ({ largura: 7.5, profundidade: 1.4, altura: 11.5, doPiso: 30 }),
  construir(M, p, { L, A }) {
    placa(M, L, A, p.cor);
    const n = clamp(num(p.modulos, 1), 1, 3);
    for (let i = 0; i < n; i++) { const y = A / 2 + (i - (n - 1) / 2) * 3.4; M.cilZ(L / 2, y, 0.8, 0.5, 1.75, num(p.amperagem, 10) >= 20 ? '#7a2e22' : 'placa-furo', { seg: 14, sombra: false }); for (const dx of [-0.75, 0.75]) M.cilZ(L / 2 + dx, y, 1.3, 0.12, 0.22, '#111111', { seg: 6, sombra: false }); }
  } });
reg('interruptor', { rotulo: 'Interruptor', camada: 'eletrica', colide: false, ponto: true, fixacao: 'parede', etiqueta: 'I',
  dimensoes: () => ({ largura: 7.5, profundidade: 1.6, altura: 11.5, doPiso: 110 }),
  construir(M, p, { L, A }) { placa(M, L, A, p.cor); const n = clamp(num(p.teclas, 1), 1, 3); for (let i = 0; i < n; i++) { const y = A / 2 + (i - (n - 1) / 2) * 3.1; M.cx(L / 2 - 1.9, L / 2 + 1.9, y - 1.3, y + 1.3, 0.8, 1.5, '#e9e9e6', { sombra: false }); } } });

// Placa conjugada: interruptor simples + tomada 2P+T em uma única caixa 4x2.
reg('interruptor-tomada', { rotulo: 'Interruptor + tomada', camada: 'eletrica', colide: false, ponto: true, fixacao: 'parede', etiqueta: 'I+T',
  dimensoes: () => ({ largura: 7.5, profundidade: 1.6, altura: 11.5, doPiso: 110 }),
  construir(M, p, { L, A }) {
    placa(M, L, A, p.cor);
    M.cx(L / 2 - 2.4, L / 2 + 2.4, A * 0.58, A * 0.83, 0.9, 1.7, '#e9e9e6', { sombra: false });
    const y = A * 0.29;
    M.cilZ(L / 2, y - 0.3, 1, 0.65, 1.65, 'placa-furo', { seg: 16, sombra: false });
    for (const dx of [-0.85, 0.85]) M.cilZ(L / 2 + dx, y, 1.55, 0.16, 0.3, '#111111', { seg: 8, sombra: false });
  } });

// ---------- ILUMINAÇÃO ----------
reg('plafon', { rotulo: 'Plafon', camada: 'iluminacao', colide: false, fixacao: 'teto', etiqueta: 'L',
  dimensoes: p => ({ largura: num(p.diametro, 30), profundidade: num(p.diametro, 30), altura: 4 }),
  construir(M, p, { L, P, A }) { const em = M.emissivo(p.temperatura); if (p.quadrado) M.cx(0, L, 0, A, 0, P, em, { sombra: false }); else M.cil(L / 2, P / 2, 0, A, L / 2, em, { seg: 32, sombra: false });
    M.luz({ tipo: 'ponto', x: L / 2, y: -6, z: P / 2, potencia: num(p.potencia, 18), temperatura: p.temperatura, emissivos: [em] }); } });
reg('spot', { rotulo: 'Spot embutido', camada: 'iluminacao', colide: false, fixacao: 'teto', etiqueta: 'S',
  dimensoes: p => ({ largura: num(p.diametro, 9), profundidade: num(p.diametro, 9), altura: 1.2 }),
  construir(M, p, { L, P, A }) { const em = M.emissivo(p.temperatura); M.cil(L / 2, P / 2, 0.4, A - 0.4, L / 2, 'placa-branca', { seg: 20, sombra: false }); M.cil(L / 2, P / 2, 0, 0.5, L * 0.36, em, { seg: 20, sombra: false });
    M.luz({ tipo: 'foco', x: L / 2, y: -1, z: P / 2, potencia: num(p.potencia, 7), temperatura: p.temperatura, abertura: p.abertura, emissivos: [em] }); } });
reg('pendente', { rotulo: 'Pendente', camada: 'iluminacao', colide: false, fixacao: 'teto', etiqueta: 'L',
  dimensoes: p => ({ largura: num(p.diametro, 32), profundidade: num(p.diametro, 32), altura: num(p.queda, 90) }),
  construir(M, p, { L, P, A }) { const em = M.emissivo(p.temperatura), hc = Math.min(24, A * 0.4);
    M.cil(L / 2, P / 2, A - 2, 2, 5, 'metal-preto', { seg: 14, sombra: false }); M.cil(L / 2, P / 2, hc, A - hc - 2, 0.35, 'metal-preto', { seg: 6, sombra: false });
    M.cil(L / 2, P / 2, 0, hc, L / 2, p.material || 'metal-preto', { rTopo: L * 0.16, seg: 28 }); M.esfera(L / 2, 3.5, P / 2, Math.min(5, L * 0.2), em, { sombra: false });
    M.luz({ tipo: 'ponto', x: L / 2, y: -4, z: P / 2, potencia: num(p.potencia, 12), temperatura: p.temperatura, emissivos: [em] }); } });
reg('arandela', { rotulo: 'Arandela', camada: 'iluminacao', colide: false, fixacao: 'parede', ponto: true, etiqueta: 'L',
  dimensoes: () => ({ largura: 12, profundidade: 10, altura: 18, doPiso: 190 }),
  construir(M, p, { L, P, A }) { const em = M.emissivo(p.temperatura); M.cx(2, L - 2, 3, A - 3, 0, 2, p.material || 'metal-preto'); M.cx(0, L, 0, A, 2, P, em, { sombra: false });
    M.luz({ tipo: 'ponto', x: L / 2, y: A / 2, z: P + 6, potencia: num(p.potencia, 7), temperatura: p.temperatura, emissivos: [em] }); } });
reg('fita-led', { rotulo: 'Fita de LED', camada: 'iluminacao', colide: false, fixacao: 'parede', etiqueta: 'L',
  dimensoes: () => ({ largura: 100, profundidade: 1.2, altura: 1.2, doPiso: 140 }),
  construir(M, p, { L, P, A }) { const em = M.emissivo(p.temperatura); M.cx(0, L, 0, A, 0, P, em, { sombra: false });
    const n = clamp(Math.round(L / 110), 1, 3), w = num(p.potencia, L * 0.1) / n; for (let i = 0; i < n; i++) M.luz({ tipo: 'ponto', x: (L * (i + 0.5)) / n, y: -4, z: P + 6, potencia: w, temperatura: p.temperatura, emissivos: i ? [] : [em] }); } });

// ---------- HIDRÁULICA ----------
reg('ponto-agua', { rotulo: 'Ponto de água', camada: 'hidraulica', colide: false, ponto: true, fixacao: 'parede', etiqueta: 'A',
  dimensoes: () => ({ largura: 6, profundidade: 3, altura: 6, doPiso: 60 }),
  construir(M, p, { L, P, A }) { M.cilZ(L / 2, A / 2, 0, 0.6, L / 2, 'inox', { seg: 16, sombra: false }); M.cilZ(L / 2, A / 2, 0.6, P - 0.6, 1.3, p.agua === 'quente' ? '#c8412c' : '#2f6fb0', { seg: 12, sombra: false }); } });
reg('ponto-esgoto', { rotulo: 'Ponto de esgoto', camada: 'hidraulica', colide: false, ponto: true, fixacao: 'parede', etiqueta: 'E',
  dimensoes: p => ({ largura: num(p.diametro, 50) / 10 + 2, profundidade: 3, altura: num(p.diametro, 50) / 10 + 2, doPiso: 45 }),
  construir(M, p, { L, P, A }) { M.cilZ(L / 2, A / 2, 0, P, L / 2 - 1, '#7a6a55', { seg: 16, sombra: false }); M.cilZ(L / 2, A / 2, P - 0.3, 0.35, L / 2 - 1.6, '#2b2622', { seg: 16, sombra: false }); } });
reg('registro', { rotulo: 'Registro', camada: 'hidraulica', colide: false, ponto: true, fixacao: 'parede', etiqueta: 'R',
  dimensoes: () => ({ largura: 7, profundidade: 6, altura: 7, doPiso: 110 }),
  construir(M, p, { L, P, A }) { M.cilZ(L / 2, A / 2, 0, 1, L / 2, 'inox', { seg: 18, sombra: false }); M.cilZ(L / 2, A / 2, 1, P - 3, 1.2, 'inox', { seg: 10, sombra: false }); M.cx(L / 2 - 3, L / 2 + 3, A / 2 - 0.8, A / 2 + 0.8, P - 2, P, 'inox', { sombra: false }); M.cx(L / 2 - 0.8, L / 2 + 0.8, A / 2 - 3, A / 2 + 3, P - 2, P, 'inox', { sombra: false }); } });
reg('chuveiro', { rotulo: 'Chuveiro', camada: 'hidraulica', colide: false, ponto: true, fixacao: 'parede', etiqueta: 'CH',
  dimensoes: () => ({ largura: 18, profundidade: 34, altura: 12, doPiso: 210 }),
  construir(M, p, { L, P, A }) { M.cilZ(L / 2, A / 2, 0, P - 9, 1, 'inox', { seg: 10 }); M.cil(L / 2, P - 9, A / 2 - 4, 3, 9, 'inox', { seg: 22 }); } });
reg('ralo', { rotulo: 'Ralo', camada: 'hidraulica', colide: false, fixacao: 'pontoPiso', etiqueta: 'RL',
  dimensoes: () => ({ largura: 10, profundidade: 10, altura: 0.6 }),
  construir(M, p, { L, P, A }) { M.cx(0, L, 0, A, 0, P, 'inox', { sombra: false }); for (let i = 1; i < 4; i++) M.cx(1, L - 1, A, A + 0.05, (P * i) / 4 - 0.4, (P * i) / 4 + 0.4, '#222222', { sombra: false }); } });
