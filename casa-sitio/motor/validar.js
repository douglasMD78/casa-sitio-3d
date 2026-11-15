// Conferência automática: aponta o que está errado ou merece atenção nos dados.
// Níveis: erro (precisa corrigir), aviso (conferir), info (bom saber).
import * as THREE from 'three';
import { EIXO, cm, num } from './base.js';
import { aberturasDaSala } from './paredes.js';
import { matrizAbertura, ladoQueAbre, comprimentoFolha } from './esquadrias.js';

const CHAVES_MATERIAL = new Set(['material', 'corpo', 'frente', 'estrutura', 'estofado', 'roupa', 'moldura', 'vaso', 'piso', 'corRodape', 'marco']);
const relacionadas = (a, b) => a.dentroDe === b.id || b.dentroDe === a.id || a.sobre === b.id || b.sobre === a.id;
const sobrepoe = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);

// Área que a folha de uma porta de giro varre, nas coordenadas do cômodo s.
function zonasDePorta(P, s) {
  const out = [], t = P.casa.espessuraParede, v3 = new THREE.Vector3();
  for (const v of P.malha.vaos) {
    const a = v.a;
    if (!v.r || a.tipo !== 'porta' || a.modelo === 'correr') continue;
    const sz = ladoQueAbre(a), c = comprimentoFolha(a), m = matrizAbertura(a, v.r, v.sala);
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const [x, z] of [[0, sz < 0 ? -c : t], [a.largura, sz < 0 ? 0 : t + c]]) { v3.set(x, 0, z).applyMatrix4(m); x0 = Math.min(x0, v3.x); x1 = Math.max(x1, v3.x); z0 = Math.min(z0, v3.z); z1 = Math.max(z1, v3.z); }
    if (sobrepoe(x0, x1, s.x0, s.x1) > 1 && sobrepoe(z0, z1, s.z0, s.z1) > 1) out.push({ a, x0: x0 - s.x0, x1: x1 - s.x0, z0: z0 - s.z0, z1: z1 - s.z0 });
  }
  return out;
}

function materiaisDe(o, achados = []) {
  if (!o || typeof o !== 'object') return achados;
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && CHAVES_MATERIAL.has(k)) achados.push(v);
    else if (v && typeof v === 'object') materiaisDe(v, achados);
  }
  return achados;
}

export function validar(P) {
  const out = [], add = (nivel, comodo, id, msg) => out.push({ nivel, comodo, id, msg }), ids = new Map();
  for (const v of P.malha.vaos) if (!v.r) add('erro', v.a.comodo, v.a.id, `Abertura ${v.a.id}: ${v.erro}.`);

  for (const s of P.malha.salas) {
    const d = P.dados[s.id] || {}, res = P.res[s.id] || [], forro = P.forroDe(s.id), W = s.largura, D = s.profundidade;
    if (d._erro) add('erro', s.id, null, `Arquivo do cômodo com problema: ${d._erro}`);
    if (forro > P.casa.peDireito + 0.1) add('erro', s.id, null, `Forro (${cm(forro)} cm) mais alto que o pé-direito (${cm(P.casa.peDireito)} cm).`);
    for (const m of materiaisDe(d.acabamentos)) if (!P.mats.existe(m)) add('aviso', s.id, null, `Acabamento "${m}" não existe em materiais.json.`);
    const abs = aberturasDaSala(P.malha, s), zonas = zonasDePorta(P, s), comandadas = new Set(), porId = {};
    for (const r of res) if (r.p.id) porId[r.p.id] = r;

    for (const r of res) {
      const p = r.p, id = p.id || '(sem id)';
      if (!p.id) add('erro', s.id, null, `Peça do tipo "${p.tipo}" sem "id".`);
      else if (ids.has(p.id)) add('erro', s.id, p.id, `Id repetido: ${p.id} (também em ${ids.get(p.id)}).`);
      else ids.set(p.id, s.nome);
      if (!r.def) { add('erro', s.id, p.id, `${id}: tipo "${p.tipo}" não existe no catálogo.`); continue; }
      const e = r.env;
      for (const m of e.erros) add('erro', s.id, p.id, `${id}: ${m}.`);
      if (r.erroConstrucao) add('erro', s.id, p.id, `${id}: não foi possível desenhar (${r.erroConstrucao}).`);
      for (const m of materiaisDe(p)) if (!P.mats.existe(m)) add('aviso', s.id, p.id, `${id}: material "${m}" não existe em materiais.json.`);
      for (const k of ['dentroDe', 'sobre', 'atrasDe']) if (p[k] && !porId[p[k]]) add('aviso', s.id, p.id, `${id}: "${k}" aponta para ${p[k]}, que não existe neste cômodo.`);

      // dentro do cômodo
      const fora = [[-e.x0, 'da parede esquerda'], [e.x1 - W, 'da parede direita'], [-e.z0, 'da parede dos fundos'], [e.z1 - D, 'da parede da frente'], [-e.y0, 'para baixo do piso'], [e.y1 - forro, 'do forro']];
      for (const [q, onde] of fora) if (q > 0.5) add('erro', s.id, p.id, `${id}: passa ${cm(q)} cm ${onde}.`);

      // contra portas, vãos e janelas
      const toca = { fundos: e.z0 < 6, frente: D - e.z1 < 6, esquerda: e.x0 < 6, direita: W - e.x1 < 6 };
      for (const ab of abs) {
        if (!toca[ab.parede]) continue;
        const [a0, a1] = EIXO[ab.parede] === 'x' ? [e.x0, e.x1] : [e.z0, e.z1];
        if (sobrepoe(a0, a1, ab.s0, ab.s1) > 0.5 && sobrepoe(e.y0, e.y1, ab.y0, ab.y1) > 0.5 && (r.def.colide || r.def.fixacao === 'parede'))
          add('erro', s.id, p.id, `${id}: ${r.def.ponto ? 'está em cima' : 'fica na frente'} da abertura ${ab.a.id}.`);
      }
      if (r.def.colide && e.y0 < 205) for (const z of zonas) if (sobrepoe(e.x0, e.x1, z.x0, z.x1) > 1 && sobrepoe(e.z0, e.z1, z.z0, z.z1) > 1) add('aviso', s.id, p.id, `${id}: fica no caminho da folha da porta ${z.a.id}.`);

      // ponto escondido atrás de móvel
      if (r.def.ponto && r.def.camada !== 'hidraulica' && p.parede && EIXO[p.parede]) {
        const ax = EIXO[p.parede] === 'x', c = ax ? (e.x0 + e.x1) / 2 : (e.z0 + e.z1) / 2, y = (e.y0 + e.y1) / 2;
        for (const q of res) {
          if (q === r || !q.def || !q.def.colide || !q.env) continue;
          const g = q.env, enc = { fundos: g.z0 < 6, frente: D - g.z1 < 6, esquerda: g.x0 < 6, direita: W - g.x1 < 6 }[p.parede];
          const [b0, b1] = ax ? [g.x0, g.x1] : [g.z0, g.z1];
          if (enc && c > b0 && c < b1 && y > g.y0 && y < g.y1 && p.atrasDe !== q.p.id) add('aviso', s.id, p.id, `${id}: fica atrás de ${q.p.id}. Se for de propósito, informe "atrasDe": "${q.p.id}".`);
        }
      }
      if (p.tipo === 'interruptor') for (const alvo of p.comanda || []) { comandadas.add(alvo); if (!porId[alvo]) add('erro', s.id, p.id, `${id}: comanda ${alvo}, que não existe neste cômodo.`); }
    }

    // sobreposição e passagens
    const solidas = res.filter(r => r.def && r.def.colide && r.env);
    for (let i = 0; i < solidas.length; i++) for (let j = i + 1; j < solidas.length; j++) {
      const a = solidas[i], b = solidas[j], A = a.env, B = b.env;
      if (relacionadas(a.p, b.p)) continue;
      const ox = sobrepoe(A.x0, A.x1, B.x0, B.x1), oy = sobrepoe(A.y0, A.y1, B.y0, B.y1), oz = sobrepoe(A.z0, A.z1, B.z0, B.z1);
      if (ox > 0.6 && oy > 0.6 && oz > 0.6) { add('erro', s.id, a.p.id, `${a.p.id} e ${b.p.id} ocupam o mesmo espaço (${cm(ox)} × ${cm(oz)} cm, ${cm(oy)} de altura).`); continue; }
      // passagem: só entre peças de piso, com pelo menos 55 cm frente a frente, e vão em que uma pessoa tentaria passar
      if (a.p.dentroDe || b.p.dentroDe || a.p.sobre || b.p.sobre || oy < 0.6 || Math.max(A.y0, B.y0) > 100) continue;
      const vao = oz > 55 ? -ox : ox > 55 ? -oz : null;
      if (vao != null && vao >= 40 && vao < 75) add(vao < 60 ? 'aviso' : 'info', s.id, a.p.id, `Passagem de ${cm(vao)} cm entre ${a.p.id} e ${b.p.id}${vao < 60 ? ' (apertada)' : ''}.`);
    }
    for (const r of res) if (r.def && r.def.camada === 'iluminacao' && r.p.id && !comandadas.has(r.p.id) && !r.p.sensor) add('info', s.id, r.p.id, `${r.p.id}: sem interruptor definido.`);
  }
  for (const img of P.mats.imagensComErro) add('aviso', null, null, `Imagem de textura não encontrada: ${img}.`);
  const ordem = { erro: 0, aviso: 1, info: 2 };
  return out.sort((a, b) => ordem[a.nivel] - ordem[b.nivel]);
}

export const contarStatus = lista => lista.reduce((c, p) => { const k = p.status || 'sem-status'; c[k] = (c[k] || 0) + 1; return c; }, {});
export { num };
