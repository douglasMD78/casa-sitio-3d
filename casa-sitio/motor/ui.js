// Interface: gera o HTML dos painéis. Não guarda estado; quem manda é o app.js.
import { cm, metros } from './base.js';
import { TIPOS } from './catalogo.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const CAMADAS = [['moveis', 'Móveis'], ['decoracao', 'Decoração'], ['eletrica', 'Elétrica'], ['iluminacao', 'Iluminação'], ['hidraulica', 'Hidráulica'], ['forro', 'Forro'], ['etiquetas', 'Etiquetas']];
export const VISOES = {
  completa:    { nome: 'Completa',    cam: { moveis: 1, decoracao: 1, eletrica: 1, iluminacao: 1, hidraulica: 1, forro: 0, etiquetas: 1 } },
  moveis:      { nome: 'Só móveis',   cam: { moveis: 1, decoracao: 1, eletrica: 0, iluminacao: 1, hidraulica: 0, forro: 0, etiquetas: 0 } },
  eletricista: { nome: 'Eletricista', cam: { moveis: 1, decoracao: 0, eletrica: 1, iluminacao: 1, hidraulica: 0, forro: 0, etiquetas: 1 } },
  gesseiro:    { nome: 'Gesseiro',    cam: { moveis: 1, decoracao: 0, eletrica: 0, iluminacao: 1, hidraulica: 0, forro: 1, etiquetas: 1 } },
  pedreiro:    { nome: 'Pedreiro',    cam: { moveis: 0, decoracao: 0, eletrica: 1, iluminacao: 0, hidraulica: 1, forro: 0, etiquetas: 1 } },
};
const STATUS = { definido: 'Definido', proposta: 'Proposta', 'a-confirmar': 'A confirmar' };
const ROTULOS = {
  nome: 'Nome', parede: 'Parede', daEsquerda: 'Da esquerda', daDireita: 'Da direita', dosFundos: 'Dos fundos', daFrente: 'Da frente', doPiso: 'Do piso',
  afastamento: 'Afastamento da parede', frentePara: 'Frente virada para', largura: 'Largura', comprimento: 'Comprimento', profundidade: 'Profundidade', altura: 'Altura',
  material: 'Material', corpo: 'Material do corpo', frente: 'Material das frentes', chapa: 'Espessura da chapa', rodape: 'Rodapé', recuo: 'Recuo da base', frontao: 'Frontão',
  modelo: 'Modelo', dobradica: 'Dobradiça', status: 'Situação', obs: 'Observação', uso: 'Uso', amperagem: 'Amperagem (A)', tensao: 'Tensão (V)', circuito: 'Circuito',
  modulos: 'Módulos', teclas: 'Teclas', comanda: 'Comanda', potencia: 'Potência (W)', temperatura: 'Temperatura de cor (K)', sensor: 'Sensor de presença', ligada: 'Ligada',
  diametro: 'Diâmetro', queda: 'Queda', niveis: 'Níveis (altura do apoio)', divisorias: 'Divisórias', laterais: 'Laterais', tampo: 'Tampo', cuba: 'Cuba', cooktop: 'Cooktop',
  itens: 'Itens', decor: 'Decoração', dentroDe: 'Dentro de', sobre: 'Sobre', atrasDe: 'Atrás de', agua: 'Água', base: 'Base', puxador: 'Puxador', tamanho: 'Tamanho',
  peitoril: 'Peitoril', folhas: 'Folhas', abrePara: 'Abre para', lado: 'Lado', correPara: 'Corre para', estado: 'Estado', comodo: 'Cômodo', tipo: 'Tipo',
};
const EM_CM = new Set(['daEsquerda', 'daDireita', 'dosFundos', 'daFrente', 'doPiso', 'afastamento', 'largura', 'comprimento', 'profundidade', 'altura', 'chapa', 'rodape', 'recuo', 'frontao', 'diametro', 'queda', 'peitoril']);
const OPCOES = { parede: ['fundos', 'frente', 'esquerda', 'direita'], frentePara: ['fundos', 'frente', 'esquerda', 'direita'], status: ['definido', 'proposta', 'a-confirmar'] };
const rot = k => ROTULOS[k] || k;
const val = (k, v) => (typeof v === 'number' ? cm(v) + (EM_CM.has(k) ? ' cm' : '') : typeof v === 'boolean' ? (v ? 'sim' : 'não') : Array.isArray(v) && v.every(x => typeof x !== 'object') ? v.map(x => (typeof x === 'number' ? cm(x) : x)).join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v));
const chip = st => (st ? `<span class="chip st-${esc(st)}">${esc(STATUS[st] || st)}</span>` : '');

export function listaComodos(salas, foco, contagem) {
  return `<button class="item ${!foco ? 'ativo' : ''}" data-acao="casa"><span>Casa inteira</span></button>` + salas.map(s => {
    const c = contagem[s.id] || {};
    return `<button class="item ${foco === s.id ? 'ativo' : ''}" data-acao="comodo" data-id="${esc(s.id)}"><span>${esc(s.nome)}${c.erros ? ` <i class="pt erro" title="${c.erros} erro(s)"></i>` : c.avisos ? ' <i class="pt aviso"></i>' : ''}</span><small>${c.pecas ? c.pecas + ' peças' : metros(s.largura) + ' × ' + metros(s.profundidade)}</small></button>`;
  }).join('');
}

export function painelCamadas(E) {
  return `<h3>Visão por profissional</h3><div class="grade">${Object.entries(VISOES).map(([k, v]) => `<button class="${E.visao === k ? 'ativo' : ''}" data-acao="visao" data-id="${k}">${v.nome}</button>`).join('')}</div>
  <h3>Camadas</h3><div class="grade">${CAMADAS.map(([k, n]) => `<button class="${E.cam[k] ? 'ativo' : ''}" data-acao="camada" data-id="${k}">${n}</button>`).join('')}</div>
  <h3>Paredes</h3><div class="grade">${[['auto', 'Maquete'], ['inteiras', 'Inteiras'], ['ocultas', 'Ocultas']].map(([k, n]) => `<button class="${E.paredes === k ? 'ativo' : ''}" data-acao="paredes" data-id="${k}">${n}</button>`).join('')}</div>
  <h3>Apoio</h3><div class="grade"><button class="${E.pessoa ? 'ativo' : ''}" data-acao="pessoa">Pessoa em escala</button><button class="${E.noite ? 'ativo' : ''}" data-acao="noite">Modo noite</button></div>`;
}

export function painelConferencia(problemas, nomes) {
  if (!problemas.length) return '<h3>Conferência</h3><p class="ok">Nenhum problema encontrado nos dados.</p>';
  const n = t => problemas.filter(p => p.nivel === t).length;
  return `<h3>Conferência</h3><p class="sub">${n('erro')} erro(s) · ${n('aviso')} aviso(s) · ${n('info')} informação(ões)</p>` +
    problemas.map(p => `<button class="prob ${p.nivel}" data-acao="ir" data-comodo="${esc(p.comodo || '')}" data-id="${esc(p.id || '')}"><b>${p.nivel === 'erro' ? 'Erro' : p.nivel === 'aviso' ? 'Aviso' : 'Info'}</b><span>${p.comodo ? `<em>${esc(nomes[p.comodo] || p.comodo)}</em> ` : ''}${esc(p.msg)}</span></button>`).join('');
}

function linhas(pares) { return `<dl>${pares.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`; }

function campo(k, v, mats) {
  const id = `c-${esc(k)}`, rem = `<button class="x" data-acao="rem-campo" data-k="${esc(k)}" title="Remover campo">×</button>`;
  if (typeof v === 'number') return `<label for="${id}">${esc(rot(k))}</label><div class="num"><button data-acao="passo" data-k="${esc(k)}" data-d="-1">−</button><input id="${id}" type="number" step="0.5" inputmode="decimal" value="${v}" data-k="${esc(k)}"><button data-acao="passo" data-k="${esc(k)}" data-d="1">+</button>${rem}</div>`;
  if (typeof v === 'boolean') return `<label for="${id}">${esc(rot(k))}</label><div class="num"><input id="${id}" type="checkbox" ${v ? 'checked' : ''} data-k="${esc(k)}">${rem}</div>`;
  if (typeof v === 'string') {
    if (OPCOES[k]) return `<label for="${id}">${esc(rot(k))}</label><div class="num"><select id="${id}" data-k="${esc(k)}">${OPCOES[k].map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>${rem}</div>`;
    const lista = ['material', 'corpo', 'frente', 'estrutura', 'estofado'].includes(k) ? ' list="lista-materiais"' : '';
    return `<label for="${id}">${esc(rot(k))}</label><div class="num"><input id="${id}" type="text" value="${esc(v)}" data-k="${esc(k)}"${lista}>${rem}</div>`;
  }
  return `<label for="${id}">${esc(rot(k))} <small>(lista/objeto em JSON)</small></label><div class="num"><textarea id="${id}" data-k="${esc(k)}" data-json="1" rows="${Math.min(8, JSON.stringify(v, null, 1).split('\n').length)}">${esc(JSON.stringify(v, null, 1))}</textarea>${rem}</div>`;
}

export function fichaPeca({ p, r, sala, acoes, luz, problemas, editar, mats, folgas, inventario }) {
  const e = r.env, def = r.def, W = sala.largura, D = sala.profundidade, ponto = def && def.ponto;
  const cx = (e.x0 + e.x1) / 2, cz = (e.z0 + e.z1) / 2, cy = (e.y0 + e.y1) / 2;
  let h = `<div class="cab"><div><small>${esc(def ? def.rotulo : p.tipo)} · ${esc(p.id || 'sem id')}</small><strong>${esc(p.nome || (def ? def.rotulo : p.tipo))}</strong></div>${chip(p.status)}</div>`;
  if (acoes.length || luz != null) h += `<div class="botoes">${acoes.map((a, i) => `<button data-acao="acionar" data-i="${i}">${a.alvo ? 'Fechar' : 'Abrir'}</button>`).join('')}${luz != null ? `<button data-acao="luz">${luz ? 'Apagar' : 'Acender'}</button>` : ''}${p.tipo === 'interruptor' ? '<button data-acao="interruptor">Acionar interruptor</button>' : ''}</div>`;
  else if (p.tipo === 'interruptor') h += '<div class="botoes"><button data-acao="interruptor">Acionar interruptor</button></div>';
  if (inventario && inventario.modelos && inventario.modelos.length) {
    h += `<h4>Inventário · trocar equipamento</h4><div class="novo"><select id="inventarioModelo" aria-label="Modelo de equipamento">${inventario.modelos.map(m => `<option value="${esc(m.id)}" ${p.modelo === m.modelo ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}</select><button data-acao="trocar-equipamento">Trocar</button></div>`;
    h += '<p class="obs">Um equipamento por posição. A troca preserva parede e local, atualiza as dimensões e permite abrir a porta ou tampa no 3D.</p>';
  }
  for (const pr of problemas) h += `<p class="alerta ${pr.nivel}">${esc(pr.msg)}</p>`;

  if (!editar) {
    const pos = ponto
      ? [['Parede', esc(p.parede || '—')], ['Eixo até a esquerda', `${cm(cx)} cm`], ['Eixo até a direita', `${cm(W - cx)} cm`], ['Eixo até os fundos', `${cm(cz)} cm`], ['Eixo até a frente', `${cm(D - cz)} cm`], ['Eixo até o piso', `<b>${cm(cy)} cm</b>`]]
          .filter(([k]) => !p.parede || (['fundos', 'frente'].includes(p.parede) ? !/fundos|frente/.test(k) : !/esquerda|direita/.test(k)))
      : [p.parede ? ['Parede', esc(p.parede)] : null, ['Medidas (L × P × A)', `<b>${cm(e.L)} × ${cm(e.P)} × ${cm(e.A)} cm</b>`], ['Até a parede esquerda', `${cm(e.x0)} cm`], ['Até a parede direita', `${cm(W - e.x1)} cm`],
         ['Até a parede dos fundos', `${cm(e.z0)} cm`], ['Até a parede da frente', `${cm(D - e.z1)} cm`], ['Base / topo (do piso)', `${cm(e.y0)} / ${cm(e.y1)} cm`]];
    h += '<h4>Posição e medidas</h4>' + linhas(pos);
    if (folgas && folgas.length) h += '<h4>Folga até o obstáculo mais próximo</h4>' + linhas(folgas.map(f => [f.lado, `${cm(f.dist)} cm <small>até ${esc(f.quem)}</small>`]));
    const pulo = new Set(['id', 'tipo', 'nome', 'status', 'obs', 'parede', 'daEsquerda', 'daDireita', 'dosFundos', 'daFrente', 'doPiso', 'largura', 'comprimento', 'profundidade', 'altura', 'afastamento']);
    const resto = Object.entries(p).filter(([k]) => !pulo.has(k));
    if (resto.length) h += '<h4>Especificação</h4>' + linhas(resto.map(([k, v]) => [rot(k), esc(val(k, v))]));
    if (p.obs) h += `<p class="obs">${esc(p.obs)}</p>`;
    return h;
  }
  h += '<h4>Editar</h4><div class="form">' + Object.entries(p).filter(([k]) => k !== 'id' && k !== 'tipo').map(([k, v]) => campo(k, v, mats)).join('') + '</div>';
  h += `<div class="novo"><input id="novoK" placeholder="novo campo (ex.: daDireita)" list="lista-campos"><input id="novoV" placeholder="valor"><button data-acao="add-campo">Adicionar</button></div>`;
  h += '<div class="botoes"><button data-acao="duplicar">Duplicar peça</button><button class="perigo" data-acao="remover">Remover peça</button></div>';
  return h;
}

export function fichaAbertura({ a, acoes, salas }) {
  const tipo = { porta: 'Porta', vao: 'Vão livre', janela: 'Janela' }[a.tipo] || a.tipo;
  let h = `<div class="cab"><div><small>${esc(tipo)} · ${esc(a.id)}</small><strong>${esc(a.nome || tipo)}</strong></div>${chip(a.status)}</div>`;
  if (acoes.length) h += `<div class="botoes">${acoes.map((x, i) => `<button data-acao="acionar" data-i="${i}">${x.alvo ? 'Fechar' : 'Abrir'}</button>`).join('')}</div>`;
  const pos = ['daEsquerda', 'daDireita', 'dosFundos', 'daFrente'].filter(k => typeof a[k] === 'number').map(k => [rot(k), `${cm(a[k])} cm`]);
  h += '<h4>Medidas</h4>' + linhas([['Vão (L × A)', `<b>${cm(a.largura)} × ${cm(a.altura)} cm</b>`], a.tipo === 'janela' ? ['Peitoril', `${cm(a.peitoril ?? 90)} cm`] : null, ['Cômodo / parede', `${esc((salas[a.comodo] || {}).nome || a.comodo)} · ${esc(a.parede)}`], ...pos]);
  const pulo = new Set(['id', 'tipo', 'nome', 'status', 'obs', 'comodo', 'parede', 'largura', 'altura', 'peitoril', 'daEsquerda', 'daDireita', 'dosFundos', 'daFrente']);
  const resto = Object.entries(a).filter(([k]) => !pulo.has(k));
  if (resto.length) h += '<h4>Especificação</h4>' + linhas(resto.map(([k, v]) => [rot(k), esc(val(k, v))]));
  if (a.obs) h += `<p class="obs">${esc(a.obs)}</p>`;
  h += '<p class="obs">Portas e janelas ficam em <code>dados/casa.json</code>.</p>';
  return h;
}

export function fichaComodo({ sala, dados, res, forro, problemas, editar, sujo, alteracoes, servidor }) {
  const porCamada = {}, st = {};
  for (const r of res) { const c = r.def ? r.def.camada : 'desconhecido'; porCamada[c] = (porCamada[c] || 0) + 1; if (r.p.status) st[r.p.status] = (st[r.p.status] || 0) + 1; }
  const nomes = Object.fromEntries(CAMADAS);
  let h = `<div class="cab"><div><small>Cômodo · rev. ${esc(dados.revisao || '—')}</small><strong>${esc(sala.nome)}</strong></div></div>`;
  h += linhas([['Medidas internas', `<b>${metros(sala.largura)} × ${metros(sala.profundidade)} m</b>`], ['Área', `${((sala.largura * sala.profundidade) / 10000).toFixed(2).replace('.', ',')} m²`],
    sala.aberto ? null : ['Forro', `${metros(forro)} m ${dados.forro && dados.forro.status ? chip(dados.forro.status) : ''}`],
    ['Peças', res.length ? Object.entries(porCamada).map(([k, n]) => `${n} ${esc((nomes[k] || k).toLowerCase())}`).join(' · ') : 'vazio'],
    Object.keys(st).length ? ['Situação', Object.entries(st).map(([k, n]) => `${n} ${esc((STATUS[k] || k).toLowerCase())}`).join(' · ')] : null]);
  if (dados.forro && dados.forro.obs) h += `<p class="obs">${esc(dados.forro.obs)}</p>`;
  if (dados.obs) h += `<p class="obs">${esc(dados.obs)}</p>`;
  const er = problemas.filter(p => p.nivel === 'erro').length, av = problemas.filter(p => p.nivel === 'aviso').length;
  if (er || av) h += `<p class="alerta ${er ? 'erro' : 'aviso'}">${er} erro(s) e ${av} aviso(s) neste cômodo. <button class="link" data-acao="conferencia">Ver</button></p>`;
  if (editar) {
    h += `<h4>Adicionar peça</h4><div class="novo"><select id="novoTipo">${Object.entries(TIPOS).map(([k, d]) => `<option value="${k}">${esc(d.rotulo)}</option>`).join('')}</select><input id="novoId" placeholder="ID (ex.: COZ-ILHA)"><button data-acao="add-peca">Adicionar</button></div>`;
    h += '<p class="obs">Toque numa peça da maquete para editar as medidas.</p>';
    h += formTextura();
  }
  if (sujo) {
    h += `<h4>Alterações não publicadas</h4><ul class="alt">${alteracoes.slice(0, 40).map(a => `<li>${esc(a)}</li>`).join('')}</ul>`;
    h += `<div class="botoes">${servidor ? '<button class="primario" data-acao="salvar">Salvar no servidor</button>' : ''}<button class="${servidor ? '' : 'primario'}" data-acao="baixar">Baixar ${esc(sala.id)}.json</button><button data-acao="copiar">Copiar alterações</button><button class="perigo" data-acao="descartar">Descartar</button></div>`;
    if (!servidor) h += `<p class="obs">Para publicar: envie o arquivo baixado para <code>dados/comodos/</code> no servidor, substituindo o anterior.</p>`;
  }
  return h;
}

// Botão que abre o painel "Nova textura por foto" (o formulário fica fixo no index.html,
// fora da ficha, para não perder a foto escolhida quando a ficha é redesenhada).
export const formTextura = () => '<h4>Materiais</h4><div class="botoes"><button data-acao="abrir-textura">Nova textura por foto</button></div>';

export function fichaCasa({ casa, salas, total, problemas, editar, servidor }) {
  const area = salas.filter(s => !s.aberto).reduce((t, s) => t + s.largura * s.profundidade, 0) / 10000;
  const er = problemas.filter(p => p.nivel === 'erro').length, av = problemas.filter(p => p.nivel === 'aviso').length;
  return `<div class="cab"><div><small>Rev. ${esc(casa.revisao)} · ${esc(casa.data || '')}</small><strong>${esc(casa.projeto)}</strong></div></div>` +
    linhas([['Área interna', `<b>${area.toFixed(2).replace('.', ',')} m²</b>`], ['Pé-direito', `${metros(casa.peDireito)} m`], ['Paredes', `${cm(casa.espessuraParede)} cm`], ['Peças lançadas', String(total)], ['Fonte', esc(casa.fonte || '—')]]) +
    (er || av ? `<p class="alerta ${er ? 'erro' : 'aviso'}">${er} erro(s) e ${av} aviso(s) nos dados. <button class="link" data-acao="conferencia">Ver</button></p>` : '') +
    '<p class="obs">Toque num cômodo para abrir o detalhe. Um dedo gira, dois dedos aproximam e movem.</p>' + (editar ? formTextura() : '');
}
