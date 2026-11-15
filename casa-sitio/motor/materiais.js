// Materiais: lê dados/materiais.json e cria os materiais 3D.
// Um material pode ter: cor, rugosidade, metal, opacidade,
//   textura  -> padrão desenhado pelo motor (madeira, granito, porcelanato, concreto, palha, tecido, grama)
//   imagem   -> arquivo em /texturas (ex.: "texturas/granito-x.jpg")
//   tamanho  -> [largura, altura] em cm que a textura/imagem representa na vida real
//   giro     -> graus para girar o veio
import * as THREE from 'three';
import { semente } from './base.js';

function tom(cor, dl) { const c = new THREE.Color(cor), h = {}; c.getHSL(h); c.setHSL(h.h, h.s, Math.min(1, Math.max(0, h.l + dl))); return '#' + c.getHexString(); }

const PADROES = {
  madeira(g, w, h, cor, r) {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { g.fillStyle = tom(cor, (r() - 0.5) * 0.06); g.globalAlpha = 0.5; g.fillRect(0, (i / 9) * h, w, h / 9 + 1); }
    g.globalAlpha = 1;
    for (let i = 0; i < 150; i++) {
      const y = r() * h; g.strokeStyle = tom(cor, r() < 0.6 ? -0.1 - r() * 0.08 : 0.07); g.globalAlpha = 0.14 + r() * 0.2; g.lineWidth = 0.5 + r() * 1.4;
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 7, w * 0.7, y + (r() - 0.5) * 7, w, y); g.stroke();
    }
    g.globalAlpha = 1;
  },
  granito(g, w, h, cor, r) {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    const cs = [tom(cor, -0.2), tom(cor, 0.16), tom(cor, -0.32), tom(cor, 0.08), tom(cor, 0.26)];
    for (let i = 0; i < 7000; i++) { g.fillStyle = cs[i % cs.length]; g.globalAlpha = 0.35 + r() * 0.5; const s = r() * 2 + 0.4; g.fillRect(r() * w, r() * h, s, s); }
    g.globalAlpha = 1;
  },
  porcelanato(g, w, h, cor, r) {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = tom(cor, (r() - 0.5) * 0.05); g.globalAlpha = 0.5; g.fillRect(r() * w, r() * h, 3, 3); }
    g.globalAlpha = 1; g.strokeStyle = tom(cor, -0.13); g.lineWidth = 3; g.strokeRect(0, 0, w, h);
  },
  concreto(g, w, h, cor, r) {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = tom(cor, (r() - 0.5) * 0.1); g.globalAlpha = 0.1; g.beginPath(); g.arc(r() * w, r() * h, 8 + r() * 40, 0, 7); g.fill(); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = tom(cor, (r() - 0.5) * 0.14); g.globalAlpha = 0.35; g.fillRect(r() * w, r() * h, 1.2, 1.2); }
    g.globalAlpha = 1;
  },
  palha(g, w, h, cor, r) {
    g.fillStyle = tom(cor, -0.1); g.fillRect(0, 0, w, h);
    const n = 8, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = tom(cor, (r() - 0.5) * 0.08 + ((i + j) % 2 ? 0.05 : -0.02));
      if ((i + j) % 2) g.fillRect(i * s + 1, j * s + s * 0.2, s - 2, s * 0.6); else g.fillRect(i * s + s * 0.2, j * s + 1, s * 0.6, s - 2);
    }
  },
  tecido(g, w, h, cor, r) {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 3) { g.fillStyle = tom(cor, (r() - 0.5) * 0.06); g.globalAlpha = 0.5; g.fillRect(i, 0, 1.5, h); g.fillRect(0, i, w, 1.5); }
    g.globalAlpha = 1;
  },
  grama(g, w, h, cor, r) {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = tom(cor, (r() - 0.5) * 0.16); g.globalAlpha = 0.5; g.fillRect(r() * w, r() * h, 2, 3); }
    g.globalAlpha = 1;
  },
};

export class Materiais {
  constructor(defs, aoMudar = () => {}) {
    this.defs = defs || {}; this.cache = new Map(); this.aoMudar = aoMudar;
    this.faltando = new Set(); this.imagensComErro = new Set();
    this.carregador = new THREE.TextureLoader();
  }
  existe(nome) { return typeof nome === 'string' && (nome.startsWith('#') || !!this.defs[nome]); }
  // Cor "média" de um material, para os blocos simples da visão geral.
  corDe(nome) {
    if (typeof nome === 'string' && nome.startsWith('#')) return nome;
    return this.defs[nome]?.cor || '#cfcfcf';
  }
  get(nome) {
    if (nome && nome.isMaterial) return nome;
    const chave = typeof nome === 'string' ? nome : JSON.stringify(nome);
    let m = this.cache.get(chave);
    if (m) return m;
    let d = typeof nome === 'object' && nome ? nome : this.defs[nome];
    if (!d && typeof nome === 'string' && nome.startsWith('#')) d = { cor: nome };
    if (!d) { this.faltando.add(String(nome)); d = { cor: '#d4a9c8' }; }
    m = new THREE.MeshStandardMaterial({ color: d.cor || '#cccccc', roughness: d.rugosidade ?? 0.8, metalness: d.metal ?? 0 });
    if (d.opacidade != null && d.opacidade < 1) { m.transparent = true; m.opacity = d.opacidade; m.depthWrite = false; }
    const tam = d.tamanho || [100, 100];
    const ajustar = t => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tam[0], 1 / tam[1]);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      if (d.giro) { t.center.set(0, 0); t.rotation = (d.giro * Math.PI) / 180; }
    };
    if (d.imagem) {
      // Enquanto a imagem carrega, vale a cor. Se a imagem não existir, fica a cor e o erro aparece na Conferência.
      this.carregador.load(d.imagem, t => { ajustar(t); m.map = t; m.color.set('#ffffff'); m.needsUpdate = true; this.aoMudar(); },
        undefined, () => { this.imagensComErro.add(d.imagem); this.aoMudar(); });
    } else if (d.textura && PADROES[d.textura]) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 256;
      PADROES[d.textura](c.getContext('2d'), 256, 256, d.cor || '#cccccc', semente(chave));
      const t = new THREE.CanvasTexture(c); ajustar(t); m.map = t; m.color.set('#ffffff');
    }
    this.cache.set(chave, m);
    return m;
  }
}
