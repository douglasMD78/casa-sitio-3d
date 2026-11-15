// Servidor opcional da maquete (Node 18+, sem dependências).
// Faz três coisas que um site estático não faz:
//   1. protege a maquete com senha de visualização (opcional);
//   2. grava as alterações do modo de edição direto em dados/comodos/;
//   3. guarda uma cópia de cada versão anterior em historico/;
//   (também comprime os arquivos, avisa conflito de revisão e recusa arquivo de cômodo malformado)
//   4. recebe fotos de textura (granito, madeira, piso...) e cria o material em dados/materiais.json.
//
// Uso:
//   SENHA_EDICAO=troque-esta-senha node servidor.js
// Variáveis:
//   PORTA          porta de escuta (padrão 8080)
//   SENHA          senha para ABRIR a maquete (usuário: casa). Sem ela, a maquete fica aberta.
//   SENHA_EDICAO   senha para SALVAR pelo site. Sem ela, salvar pelo site fica desligado.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');

const RAIZ = __dirname, PORTA = Number(process.env.PORTA || process.env.PORT || 8080);
const SENHA = process.env.SENHA || '', SENHA_EDICAO = process.env.SENHA_EDICAO || '';
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const PUBLICO = ['index.html', 'motor', 'vendor', 'dados', 'texturas', 'LEIA-ME-IA.md'];   // LEIA-ME-IA.md: o site o inclui no pedido para a IA          // só isto é servido
const igual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function responder(res, status, corpo, tipo = 'text/plain; charset=utf-8', extra = {}) { res.writeHead(status, { 'content-type': tipo, 'x-content-type-options': 'nosniff', ...extra }); res.end(corpo); }

function autorizado(req) {
  if (!SENHA) return true;
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const [, senha = ''] = Buffer.from(m[1], 'base64').toString().split(/:(.*)/s);
  return igual(senha, SENHA);
}

function salvarComodo(req, res, id) {
  if (!SENHA_EDICAO) return responder(res, 403, 'Edição pelo site desligada: defina SENHA_EDICAO ao iniciar o servidor.');
  if (!igual(req.headers['x-senha'] || '', SENHA_EDICAO)) return responder(res, 401, 'Senha de edição incorreta.');
  if (!/^[a-z0-9][a-z0-9_-]{0,40}$/.test(id)) return responder(res, 400, 'Nome de cômodo inválido.');
  const arq = path.join(RAIZ, 'dados', 'comodos', id + '.json');
  if (!fs.existsSync(arq)) return responder(res, 404, 'Cômodo não existe em dados/comodos/.');
  const partes = []; let tam = 0;
  req.on('data', c => { tam += c.length; if (tam > 2e6) { responder(res, 413, 'Arquivo grande demais.'); req.destroy(); } else partes.push(c); });
  req.on('end', () => {
    if (res.writableEnded) return;
    const texto = Buffer.concat(partes).toString('utf8');
    let dado;
    try { dado = JSON.parse(texto); } catch (e) { return responder(res, 400, 'JSON inválido: ' + e.message); }
    if (!dado || typeof dado !== 'object' || dado.comodo !== id || !Array.isArray(dado.pecas)) return responder(res, 400, 'Conteúdo não parece um arquivo de cômodo ("comodo" e "pecas").');
    // Última barreira: nada malformado chega ao disco, venha de onde vier.
    const vistos = new Set();
    for (const p of dado.pecas) {
      if (!p || typeof p !== 'object' || Array.isArray(p)) return responder(res, 400, 'Recusado: há um item em "pecas" que não é uma peça.');
      if (typeof p.id !== 'string' || !p.id.trim()) return responder(res, 400, 'Recusado: há peça sem "id".');
      if (typeof p.tipo !== 'string' || !p.tipo.trim()) return responder(res, 400, `Recusado: a peça ${p.id} está sem "tipo".`);
      if (vistos.has(p.id)) return responder(res, 400, `Recusado: o id ${p.id} aparece duas vezes.`);
      vistos.add(p.id);
    }
    try {
      // Aviso de conflito: alguém salvou depois que esta pessoa abriu a página?
      const base = req.headers['x-revisao-base'];
      if (base !== undefined && !req.headers['x-forcar']) {
        let noDisco = null; try { noDisco = JSON.parse(fs.readFileSync(arq, 'utf8')).revisao; } catch (e) { /* arquivo atual ilegível: deixa gravar por cima */ }
        if (noDisco != null && String(noDisco) !== String(base)) return responder(res, 409, `Este cômodo foi salvo por outra pessoa ou aparelho depois que você abriu a página (no servidor: rev. ${noDisco}; a sua partiu da rev. ${base || '—'}).`);
      }
      const dirH = path.join(RAIZ, 'historico', id); fs.mkdirSync(dirH, { recursive: true });
      const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(arq, path.join(dirH, carimbo + '.json'));                    // cópia da versão anterior
      const tmp = arq + '.tmp'; fs.writeFileSync(tmp, texto); fs.renameSync(tmp, arq);
      console.log(`[${new Date().toISOString()}] salvo ${id}.json (rev. ${dado.revisao || '?'})`);
      responder(res, 200, JSON.stringify({ ok: true, revisao: dado.revisao || null }), TIPOS['.json']);
    } catch (e) { responder(res, 500, 'Erro ao gravar: ' + e.message); }
  });
}

// Foto de textura enviada pelo site: grava em texturas/ e registra o material em dados/materiais.json.
const IMAGENS = {
  'image/jpeg': ['.jpg', b => b[0] === 0xff && b[1] === 0xd8],
  'image/png': ['.png', b => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  'image/webp': ['.webp', b => b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'],
};
function salvarTextura(req, res, url) {
  if (!SENHA_EDICAO) return responder(res, 403, 'Edição pelo site desligada: defina SENHA_EDICAO ao iniciar o servidor.');
  if (!igual(req.headers['x-senha'] || '', SENHA_EDICAO)) return responder(res, 401, 'Senha de edição incorreta.');
  const q = url.searchParams, nome = q.get('nome') || '', img = IMAGENS[String(req.headers['content-type'] || '').split(';')[0].trim()];
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(nome)) return responder(res, 400, 'Nome inválido: use letras minúsculas, números e hífen (ex.: granito-verde).');
  if (!img) return responder(res, 415, 'Envie uma imagem JPG, PNG ou WebP.');
  const medida = (k, d) => { const v = Number(q.get(k)); return Number.isFinite(v) && v > 0 && v <= 2000 ? v : d; };
  const cor = /^#[0-9a-f]{6}$/i.test(q.get('cor') || '') ? q.get('cor').toLowerCase() : '#bbbbbb';
  const partes = []; let tam = 0;
  req.on('data', c => { tam += c.length; if (tam > 6e6) { responder(res, 413, 'Imagem grande demais (máximo 6 MB).'); req.destroy(); } else partes.push(c); });
  req.on('end', () => {
    if (res.writableEnded) return;
    const buf = Buffer.concat(partes);
    if (!img[1](buf)) return responder(res, 400, 'O arquivo não é uma imagem válida.');
    try {
      const arqM = path.join(RAIZ, 'dados', 'materiais.json'), mats = JSON.parse(fs.readFileSync(arqM, 'utf8'));
      if (mats[nome] && !mats[nome].imagem) return responder(res, 409, `Já existe o material "${nome}" (sem foto). Escolha outro nome.`);
      const dirT = path.join(RAIZ, 'texturas'); fs.mkdirSync(dirT, { recursive: true });
      for (const [ext] of Object.values(IMAGENS)) if (ext !== img[0]) fs.rmSync(path.join(dirT, nome + ext), { force: true });   // troca de formato não deixa sobra
      const destino = path.join(dirT, nome + img[0]); fs.writeFileSync(destino + '.tmp', buf); fs.renameSync(destino + '.tmp', destino);
      const dirH = path.join(RAIZ, 'historico', 'materiais'); fs.mkdirSync(dirH, { recursive: true });
      fs.copyFileSync(arqM, path.join(dirH, new Date().toISOString().replace(/[:.]/g, '-') + '.json'));
      const def = { ...(mats[nome] || {}), cor, imagem: `texturas/${nome}${img[0]}`, tamanho: [medida('largura', 60), medida('altura', 60)], rugosidade: (mats[nome] || {}).rugosidade ?? 0.4 };
      mats[nome] = def;
      const texto = '{\n' + Object.entries(mats).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n';   // um material por linha
      fs.writeFileSync(arqM + '.tmp', texto); fs.renameSync(arqM + '.tmp', arqM);
      console.log(`[${new Date().toISOString()}] textura ${nome}${img[0]} (${buf.length} bytes)`);
      responder(res, 200, JSON.stringify({ ok: true, nome, def }), TIPOS['.json']);
    } catch (e) { responder(res, 500, 'Erro ao gravar: ' + e.message); }
  });
}

const COMPRIME = new Set(['.html', '.js', '.css', '.json', '.svg', '.md', '.txt']), comprimidos = new Map();

http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://x'); } catch (e) { return responder(res, 400, 'Endereço inválido.'); }
  if (!autorizado(req)) return responder(res, 401, 'Senha necessária.', undefined, { 'www-authenticate': 'Basic realm="Casa do Sitio", charset="UTF-8"' });
  const caminho = decodeURIComponent(url.pathname);

  if (caminho.endsWith('/api/estado') && req.method === 'GET') return responder(res, 200, JSON.stringify({ ok: true, edicao: !!SENHA_EDICAO }), TIPOS['.json'], { 'cache-control': 'no-store' });
  const m = /\/api\/comodo\/([^/]+)$/.exec(caminho);
  if (m && req.method === 'PUT') return salvarComodo(req, res, m[1]);
  if (caminho.endsWith('/api/textura') && req.method === 'POST') return salvarTextura(req, res, url);
  if (req.method !== 'GET' && req.method !== 'HEAD') return responder(res, 405, 'Método não permitido.');

  let rel = caminho.replace(/^\/+/, '') || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const abs = path.normalize(path.join(RAIZ, rel));
  const topo = rel.split('/')[0];
  if (!abs.startsWith(RAIZ + path.sep) || !PUBLICO.includes(topo) || rel.split('/').some(p => p.startsWith('.'))) return responder(res, 404, 'Não encontrado.');
  fs.stat(abs, (e, st) => {
    if (e || !st.isFile()) return responder(res, 404, 'Não encontrado.');
    const ext = path.extname(abs).toLowerCase();
    const cache = topo === 'vendor' ? 'public, max-age=604800' : 'no-cache';      // dados e motor sempre conferidos
    // Etiqueta de versão: se o navegador já tem este arquivo, responde 304 e não reenvia.
    const etag = `"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}"`;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, { etag, 'cache-control': cache }); return res.end(); }
    // Texto vai comprimido (a biblioteca 3D cai de ~750 KB para ~190 KB). O resultado fica em memória.
    if (COMPRIME.has(ext) && st.size > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      const chave = abs + '|' + etag; let z = comprimidos.get(chave);
      if (!z) { try { z = zlib.gzipSync(fs.readFileSync(abs), { level: 6 }); } catch (e2) { return responder(res, 500, 'Erro ao ler o arquivo.'); } for (const k of comprimidos.keys()) if (k.startsWith(abs + '|')) comprimidos.delete(k); comprimidos.set(chave, z); }
      res.writeHead(200, { 'content-type': TIPOS[ext] || 'application/octet-stream', 'content-encoding': 'gzip', 'content-length': z.length, vary: 'Accept-Encoding', etag, 'cache-control': cache, 'x-content-type-options': 'nosniff' });
      return req.method === 'HEAD' ? res.end() : res.end(z);
    }
    res.writeHead(200, { 'content-type': TIPOS[ext] || 'application/octet-stream', 'content-length': st.size, etag, 'cache-control': cache, 'x-content-type-options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(abs).pipe(res);
  });
}).listen(PORTA, () => {
  console.log(`Maquete em http://localhost:${PORTA}`);
  console.log(`Visualização: ${SENHA ? 'com senha (usuário: casa)' : 'ABERTA (sem senha)'} · Salvar pelo site: ${SENHA_EDICAO ? 'ligado' : 'desligado'}`);
});
