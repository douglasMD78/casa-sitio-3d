// Proteção: tudo o que impede um dado malfeito (digitado à mão ou vindo de uma IA) de quebrar a maquete.
//   1. lerJSONTolerante  -> aceita JSON com cerca de markdown, comentários, vírgula sobrando, aspas curvas.
//   2. higienizar        -> conserta erros comuns de uma peça (nome de campo, unidade, tipo, parede, id) e explica o que fez.
//   3. combinar          -> junta a resposta da IA com o cômodo atual sem perder peças (mesclar) ou mostrando o que sairia (substituir).
// Este arquivo não desenha nada e não depende do three.js: pode ser testado sozinho.

const semAcento = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '');
const chaveSimples = k => semAcento(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const hifen = t => semAcento(t).trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');

// ---------- 1. leitura tolerante ----------
// Remove comentários e vírgulas sobrando sem tocar no que está dentro de aspas.
function limparForaDeAspas(t) {
  let out = '', i = 0, emTexto = false;
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    if (emTexto) { out += c; if (c === '\\') { out += d ?? ''; i += 2; continue; } if (c === '"') emTexto = false; i++; continue; }
    if (c === '"') { emTexto = true; out += c; i++; continue; }
    if (c === '/' && d === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) i++; i += 2; continue; }
    if (c === ',') { let j = i + 1; while (j < t.length && /\s/.test(t[j])) j++; if (t[j] === '}' || t[j] === ']') { i++; continue; } }
    out += c; i++;
  }
  return out.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
}
export function lerJSONTolerante(texto) {
  const consertos = [];
  let t = String(texto ?? '').replace(/^﻿/, '').trim();
  if (!t) throw new Error('Nada para ler: o texto está vazio.');
  const cercas = [...t.matchAll(/```[a-zA-Z0-9]*\s*\n?([\s\S]*?)```/g)].map(m => m[1].trim()).filter(Boolean);
  if (cercas.length) { t = cercas.sort((a, b) => b.length - a.length)[0]; consertos.push('Tirei o bloco de código (```) em volta do JSON.'); }
  const ini = t.search(/[{[]/), fim = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (ini < 0 || fim < ini) throw new Error('Não encontrei um JSON no texto (falta "{" ou "[").');
  if (ini > 0 || fim < t.length - 1) { t = t.slice(ini, fim + 1); consertos.push('Ignorei o texto fora do JSON.'); }
  try { return { dado: JSON.parse(t), consertos }; } catch (e1) { /* tenta consertar */ }
  let u = t.replace(/[“”„‟]/g, '"').replace(/[‘’]/g, "'");
  if (u !== t) consertos.push('Troquei aspas curvas por aspas retas.');
  const v = limparForaDeAspas(u);
  if (v !== u) consertos.push('Removi comentários ou vírgulas sobrando.');
  try { return { dado: JSON.parse(v), consertos }; } catch (e) {
    const m = /position (\d+)/.exec(e.message) || /line (\d+) column (\d+)/.exec(e.message);
    let onde = '';
    if (m && m.length === 2) { const pos = +m[1], antes = v.slice(0, pos), linha = antes.split('\n').length; onde = ` Perto da linha ${linha}: «${v.slice(Math.max(0, pos - 30), pos + 30).replace(/\s+/g, ' ')}»`; }
    else if (m) onde = ` Perto da linha ${m[1]}, coluna ${m[2]}.`;
    throw new Error(`O JSON está quebrado e não consegui consertar sozinho.${onde} Erros comuns: falta vírgula entre itens, falta fechar } ou ], aspas simples no lugar de duplas.`);
  }
}

// ---------- 2. higienização de peças ----------
const SINONIMOS_CAMPO = { alturadopiso: 'doPiso', alturapiso: 'doPiso', dopiso: 'doPiso', distanciadopiso: 'doPiso', distanciaesquerda: 'daEsquerda', distanciadireita: 'daDireita',
  distanciafundos: 'dosFundos', distanciafundo: 'dosFundos', dofundo: 'dosFundos', dosfundo: 'dosFundos', distanciafrente: 'daFrente', observacao: 'obs', observacoes: 'obs', descricao: 'obs',
  situacao: 'status', lado: 'parede', wall: 'parede', type: 'tipo', name: 'nome', width: 'largura', depth: 'profundidade', height: 'altura', frentepara: 'frentePara', dentrode: 'dentroDe', atrasde: 'atrasDe' };
const BASICOS = ['id', 'tipo', 'nome', 'status', 'obs', 'parede', 'daEsquerda', 'daDireita', 'dosFundos', 'daFrente', 'doPiso', 'afastamento', 'largura', 'comprimento', 'profundidade', 'altura',
  'frentePara', 'material', 'sobre', 'dentroDe', 'atrasDe', 'ligada', 'comanda', 'modelo', 'uso', 'circuito', 'tensao', 'amperagem', 'potencia', 'temperatura', 'sensor', 'aberto', 'dobradica'];
const COMPRIMENTOS = new Set(['daEsquerda', 'daDireita', 'dosFundos', 'daFrente', 'doPiso', 'afastamento', 'largura', 'comprimento', 'profundidade', 'altura', 'queda', 'rodape', 'frontao', 'recuo', 'chapa']);
const NUMERICOS = new Set([...COMPRIMENTOS, 'diametro', 'potencia', 'temperatura', 'amperagem', 'teclas', 'gavetas', 'lugares', 'abertura', 'tensao']);
const MEDIDAS = ['largura', 'comprimento', 'profundidade', 'altura'];
const PAREDES = { fundos: 'fundos', fundo: 'fundos', tras: 'fundos', traseira: 'fundos', frente: 'frente', frontal: 'frente', rua: 'frente', esquerda: 'esquerda', esq: 'esquerda', direita: 'direita', dir: 'direita' };
const STATUS = { definido: 'definido', definida: 'definido', confirmado: 'definido', ok: 'definido', proposta: 'proposta', proposto: 'proposta', sugestao: 'proposta', 'a-confirmar': 'a-confirmar', aconfirmar: 'a-confirmar', pendente: 'a-confirmar', confirmar: 'a-confirmar' };
const ELETROS = { geladeira: 'geladeira', refrigerador: 'geladeira', freezer: 'freezer-vertical', 'freezer-vertical': 'freezer-vertical', fogao: 'fogao', microondas: 'microondas', 'micro-ondas': 'microondas', forno: 'forno',
  airfryer: 'airfryer', 'air-fryer': 'airfryer', 'lava-roupas': 'lava-roupas', 'maquina-de-lavar': 'lava-roupas', lavadora: 'lava-roupas', 'lava-loucas': 'lava-loucas', 'lava-louca': 'lava-loucas', cafeteira: 'cafeteira', liquidificador: 'liquidificador' };
const SINONIMOS_TIPO = { luminaria: 'plafon', lampada: 'plafon', 'ponto-de-luz': 'plafon', 'spot-embutido': 'spot', lustre: 'pendente', 'fita-de-led': 'fita-led', fita: 'fita-led', 'interruptor-simples': 'interruptor',
  'tomada-simples': 'tomada', privada: 'vaso-sanitario', sanitario: 'vaso-sanitario', bacia: 'vaso-sanitario', 'bacia-sanitaria': 'vaso-sanitario', 'guarda-roupas': 'guarda-roupa', roupeiro: 'guarda-roupa',
  prateleira: 'prateleiras', televisao: 'tv', televisor: 'tv', 'ponto-de-agua': 'ponto-agua', 'ponto-de-esgoto': 'ponto-esgoto', torneira: 'ponto-agua', 'box-banheiro': 'box', pia: null, cuba: null };
export const PREFIXOS = { closet: 'CLO', suite: 'SUI', 'suite-entrada': 'SUE', 'banho-suite': 'BSU', 'banho-social': 'BSO', corredor: 'COR', quarto2: 'Q2', quarto1: 'Q1', cozinha: 'COZ', jantar: 'JAN',
  estar: 'EST', lavanderia: 'LAV', despensa: 'DES', 'varanda-lateral': 'VAL', 'varanda-frente': 'VFR' };

function distancia(a, b) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
export function maisParecido(alvo, lista, limite = 3) {
  let melhor = null, d = limite + 1;
  for (const c of lista) { const x = distancia(chaveSimples(alvo), chaveSimples(c)); if (x < d) { d = x; melhor = c; } }
  return melhor;
}
// "90", "90cm", "0,9 m", "12W", "3000K" -> número (comprimentos sempre em cm)
function comoNumero(v, comprimento) {
  if (typeof v !== 'string') return undefined;
  const m = /^\s*(-?\d+(?:[.,]\d+)?)\s*(cm|mm|m|w|k|a|v|°|graus)?\s*$/i.exec(v);
  if (!m) return undefined;
  let n = parseFloat(m[1].replace(',', '.'));
  const un = (m[2] || '').toLowerCase();
  if (comprimento && un === 'm') n *= 100;
  if (comprimento && un === 'mm') n /= 10;
  return Math.round(n * 100) / 100;
}

// ctx: { tipos: nomes válidos (catálogo + apelidos), vocabulario: Set de campos conhecidos (ou null), usados: Set de ids de outros cômodos }
export function higienizar(dado, idSala, ctx = {}) {
  const notas = [], nota = (nivel, id, msg) => notas.push({ nivel, id: id || null, msg });
  const tipos = ctx.tipos || [], vocab = ctx.vocabulario ? new Set([...ctx.vocabulario, ...BASICOS]) : null, canon = {};
  for (const k of [...(vocab || []), ...BASICOS]) canon[chaveSimples(k)] ??= k;
  let d = dado;
  if (Array.isArray(d)) d = { pecas: d };
  else if (d && typeof d === 'object' && !Array.isArray(d.pecas) && typeof d.tipo === 'string') d = { pecas: [d] };
  if (!d || typeof d !== 'object') { nota('erro', null, 'O conteúdo não é um arquivo de cômodo nem uma lista de peças.'); return { dado: { comodo: idSala, pecas: [] }, notas }; }
  d = { ...d };
  for (const k of Object.keys(d)) {
    const s = chaveSimples(k);
    if (k !== 'pecas' && ['pecas', 'itens', 'items', 'moveis', 'pieces'].includes(s) && Array.isArray(d[k]) && !Array.isArray(d.pecas)) { d.pecas = d[k]; delete d[k]; nota('conserto', null, `Lista "${k}" renomeada para "pecas".`); }
    else if (k !== 'comodo' && s === 'comodo') { d.comodo = d[k]; delete d[k]; }
    else if (k !== 'remover' && ['remover', 'remove', 'apagar', 'excluir'].includes(s)) { d.remover = d[k]; delete d[k]; }
  }
  for (const k of ['forro', 'acabamentos', 'pessoa', 'camera']) if (d[k] != null && (typeof d[k] !== 'object' || Array.isArray(d[k]))) { nota('erro', null, `"${k}" precisa ser um objeto ({ ... }); foi ignorado.`); delete d[k]; }
  if (!Array.isArray(d.pecas)) { if (d.pecas != null) nota('erro', null, '"pecas" precisa ser uma lista ([ ... ]).'); d.pecas = []; }
  if (idSala && d.comodo !== idSala) { if (d.comodo != null && ctx.fixarComodo !== false) nota('conserto', null, `"comodo" era "${d.comodo}"; ajustado para "${idSala}".`); d.comodo = idSala; }
  if (d.remover != null && !Array.isArray(d.remover)) d.remover = [String(d.remover)];

  const vistos = new Set(), prefixo = PREFIXOS[idSala] || String(idSala || 'X').slice(0, 3).toUpperCase(), saida = [];
  for (const bruta of d.pecas) {
    if (!bruta || typeof bruta !== 'object' || Array.isArray(bruta)) { nota('conserto', null, 'Item que não é uma peça foi ignorado.'); continue; }
    let p = {};
    // nomes de campo
    for (const [k, v] of Object.entries(bruta)) {
      let alvo = k;
      if (!BASICOS.includes(k) && !(vocab && vocab.has(k))) {
        const s = chaveSimples(k), c = SINONIMOS_CAMPO[s] || canon[s];
        if (c && c !== k) { alvo = c; nota('conserto', bruta.id, `Campo "${k}" corrigido para "${c}".`); }
      }
      if (alvo in p) nota('aviso', bruta.id, `Campo "${alvo}" apareceu duas vezes; ficou o último valor.`);
      p[alvo] = v;
    }
    // tipo
    if (typeof p.tipo === 'string') {
      const t = hifen(p.tipo);
      if (tipos.includes(t)) { if (t !== p.tipo) { nota('conserto', p.id, `Tipo "${p.tipo}" escrito como "${t}".`); p.tipo = t; } }
      else if (ELETROS[t]) { nota('conserto', p.id, `Tipo "${p.tipo}" virou "eletro" com modelo "${ELETROS[t]}".`); p.tipo = 'eletro'; p.modelo ??= ELETROS[t]; }
      else if (SINONIMOS_TIPO[t]) { nota('conserto', p.id, `Tipo "${p.tipo}" corrigido para "${SINONIMOS_TIPO[t]}".`); p.tipo = SINONIMOS_TIPO[t]; }
      else {
        const s = t in SINONIMOS_TIPO ? null : maisParecido(t, tipos, 2);
        nota('erro', p.id, `Tipo "${p.tipo}" não existe no catálogo.${s ? ` Você quis dizer "${s}"?` : t === 'pia' || t === 'cuba' ? ' Para pia de cozinha use "bancada" com "cuba"; para banheiro, "lavatorio".' : ' Use um tipo do catálogo ou "caixa".'}`);
      }
    } else nota('erro', p.id, 'Peça sem "tipo".');
    // números e unidades
    for (const k of Object.keys(p)) {
      if (!NUMERICOS.has(k)) continue;
      const comp = COMPRIMENTOS.has(k);
      if (typeof p[k] === 'string') {
        const n = comoNumero(p[k], comp);
        if (n === undefined) { nota('erro', p.id, `"${k}" precisa ser um número (veio "${p[k]}"). Campo ignorado.`); delete p[k]; continue; }
        nota('conserto', p.id, `"${k}": "${p[k]}" convertido para ${n}.`); p[k] = n;
      }
      if (typeof p[k] !== 'number') continue;
      if (!Number.isFinite(p[k])) { nota('erro', p.id, `"${k}" não é um número válido. Campo ignorado.`); delete p[k]; continue; }
      if (MEDIDAS.includes(k) && p[k] <= 0) { nota('erro', p.id, `"${k}" precisa ser maior que zero (veio ${p[k]}). Usei a medida padrão.`); delete p[k]; continue; }
      if (comp && Math.abs(p[k]) > 3000) { nota('erro', p.id, `"${k}": ${p[k]} cm é maior que a casa. Campo ignorado.`); delete p[k]; continue; }
      if (MEDIDAS.includes(k) && p[k] < 10 && !Number.isInteger(p[k])) nota('aviso', p.id, `"${k}": ${p[k]} parece estar em metros. Os dados são em centímetros (seria ${Math.round(p[k] * 100)}?).`);
    }
    // parede, frentePara, status
    for (const k of ['parede', 'frentePara']) if (typeof p[k] === 'string') {
      const v = PAREDES[hifen(p[k]).replace(/^parede-(d[aeo]s?-)?/, '')];
      if (v && v !== p[k]) { nota('conserto', p.id, `"${k}": "${p[k]}" corrigido para "${v}".`); p[k] = v; }
    }
    if (typeof p.status === 'string') { const v = STATUS[hifen(p.status)] || STATUS[chaveSimples(p.status)]; if (v && v !== p.status) p.status = v; }
    if (typeof p.comanda === 'string') { p.comanda = [p.comanda]; nota('conserto', p.id, '"comanda" virou uma lista.'); }
    for (const [a, b] of [['daEsquerda', 'daDireita'], ['dosFundos', 'daFrente']]) if (typeof p[a] === 'number' && typeof p[b] === 'number') nota('aviso', p.id, `Tem "${a}" e "${b}" ao mesmo tempo; vale "${a}". Deixe só uma.`);
    // campos desconhecidos
    if (vocab) for (const k of Object.keys(p)) if (!vocab.has(k)) { const s = maisParecido(k, [...vocab], 2); nota('aviso', p.id, `Campo "${k}" não é conhecido pelo motor e não terá efeito.${s ? ` Você quis dizer "${s}"?` : ''}`); }
    // id
    if (typeof p.id === 'number') p.id = String(p.id);
    if (typeof p.id !== 'string' || !p.id.trim()) {
      const base = `${prefixo}-${hifen(p.modelo || p.tipo || 'PECA').toUpperCase()}`; let n = 1, id = base;
      while (vistos.has(id) || (ctx.usados && ctx.usados.has(id)) || (ctx.reservados && ctx.reservados.has(id))) id = `${base}-${++n}`;
      p = { id, ...p }; nota('conserto', id, `Peça do tipo "${p.tipo}" estava sem id; recebeu "${id}".`);
    } else {
      p.id = p.id.trim();
      if (vistos.has(p.id)) { let n = 2; while (vistos.has(`${p.id}-${n}`)) n++; nota('conserto', p.id, `Id "${p.id}" repetido no mesmo arquivo; o segundo virou "${p.id}-${n}".`); p.id = `${p.id}-${n}`; }
      if (ctx.usados && ctx.usados.has(p.id)) nota('erro', p.id, `Id "${p.id}" já existe em outro cômodo. Troque o id.`);
    }
    vistos.add(p.id); saida.push(p);
  }
  d.pecas = saida;
  return { dado: d, notas };
}

// ---------- 3. juntar a resposta da IA com o cômodo atual ----------
// colado: resultado de higienizar(). modo: 'mesclar' (mantém o que não foi citado) ou 'substituir'.
export function combinar(atual, colado, modo) {
  const antes = Array.isArray(atual.pecas) ? atual.pecas : [], porId = new Map(antes.map(p => [p.id, p]));
  const novas = [], trocadas = [], iguais = [], removidas = [];
  for (const p of colado.pecas) { if (!porId.has(p.id)) novas.push(p.id); else if (JSON.stringify(porId.get(p.id)) !== JSON.stringify(p)) trocadas.push(p.id); else iguais.push(p.id); }
  const citadas = new Set(colado.pecas.map(p => p.id)), aRemover = new Set((colado.remover || []).map(String));
  let pecas;
  if (modo === 'substituir') { pecas = colado.pecas.filter(p => !aRemover.has(p.id)); for (const p of antes) if (!citadas.has(p.id) || aRemover.has(p.id)) removidas.push(p.id); }
  else {
    const novoPorId = new Map(colado.pecas.map(p => [p.id, p]));
    pecas = antes.filter(p => !aRemover.has(p.id)).map(p => novoPorId.get(p.id) || p);
    for (const p of colado.pecas) if (!porId.has(p.id) && !aRemover.has(p.id)) pecas.push(p);
    for (const id of aRemover) if (porId.has(id)) removidas.push(id);
  }
  const novo = { ...atual };
  for (const k of ['forro', 'acabamentos', 'pessoa', 'camera', 'obs']) if (colado[k] !== undefined) novo[k] = colado[k];
  novo.pecas = pecas;
  return { novo, resumo: { novas, trocadas, iguais, removidas } };
}
// A resposta parece um arquivo inteiro (e não só as peças alteradas)?
export const pareceArquivoInteiro = (bruto, colado) => !!bruto && !Array.isArray(bruto) && Array.isArray(bruto.pecas) && bruto.modo !== 'mesclar' && bruto.remover === undefined && colado.modo !== 'mesclar';

// Campos que o motor lê de uma peça, tirados do próprio código (sempre em dia com o catálogo).
export function vocabularioDe(...fontes) {
  const v = new Set(BASICOS);
  for (const f of fontes) for (const m of String(f).matchAll(/\bp\.([a-zA-Z_]\w*)/g)) v.add(m[1]);
  return v;
}
