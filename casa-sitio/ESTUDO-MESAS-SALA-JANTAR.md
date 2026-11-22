# Sala de jantar — estudo dimensional de duas mesas com seis cadeiras

**Status:** estudo comparativo, não é layout aprovado nem projeto elétrico executivo. **Não alterar móveis ou pontos de luz antes da escolha.**

## Geometria confirmada do repositório
- `dados/casa.json`: cômodo `jantar`, 450 cm (eixo x, esquerda–direita) × 300 cm (eixo z, cozinha→estar); origem global x=440, z=700.
- Ligação interna à cozinha pelo lado z=0; ligação ao estar pelo lado z=300.
- Entrada do corredor no lado esquerdo: abertura V4 no corredor, `dosFundos=80`, largura 110; verificar projeção geométrica efetiva no jantar.
- Porta P2 para varanda na parede direita, `dosFundos=150`, largura 180. **Inconsistência para resolver:** 150+180=330 cm, excede profundidade da sala (300 cm) em 30 cm. Confirmar cotas reais e abertura antes de fixar a mesa/pontos elétricos.

## Dimensões comerciais para comparar
- Opção A: mesa OVAL 180 × 90 × 75–80 cm (tampo); conjuntos de seis cadeiras disponíveis comercialmente.
- Opção B: mesa RETANGULAR 180 × 90 × 77–80 cm; conjuntos de seis cadeiras disponíveis comercialmente.
- Cadeira de referência compacta: 48 cm largura × 56 cm profundidade, conforme conjuntos retangulares de seis lugares. **Medida provisória de estudo; validar modelo específico.**
- Distribuição: duas cadeiras em cada lado longo + uma cadeira em cada cabeceira = seis.
- Referências: https://www.magazineluiza.com.br/conjunto-jantar-mesa-180cm-oval-6-cadeiras-rustica-organica-cozinha-sala-grande-casa-carmorelli/p/ccae24c000/mo/ms4j/ ; https://www.magazineluiza.com.br/conjunto-de-jantar-6-lugares-mesa-180m-em-mdf-e-base-ripada-dalla-costa-sj/p/kb01k739a0/mo/ms6l/ ; https://www.magazineluiza.com.br/mesa-de-jantar-retangular-180cm-com-6-cadeiras-100-mdf-casa-lar-sj/p/ck436j5802/mo/ms6l/

## Teste geométrico no recinto 450 × 300 cm
Coordenadas locais `x` e `z`, medidas do canto junto à cozinha e à esquerda. Cálculos com **mesa centralizada** em (225,150)cm. É uma posição de teste, não uma confirmação de circulação nas portas.

| Mesa / orientação | Eixo x (cm) | Eixo z (cm) | Borda livre esquerda / direita | Borda livre cozinha / estar | Folga após cadeira projetada 56 cm, esquerda/direita | Folga após cadeira projetada 56 cm, cozinha/estar |
|---|---|---|---|---|---|---|
| Oval 180×90 horizontal | 135–315 | 105–195 | 135 / 135 | 105 / 105 | 79 / 79 | 49 / 49 |
| Retangular 180×90 horizontal | 135–315 | 105–195 | 135 / 135 | 105 / 105 | 79 / 79 | 49 / 49 |
| Oval 180×90 vertical | 180–270 | 60–240 | 180 / 180 | 60 / 60 | 124 / 124 | **4 / 4** |
| Retangular 180×90 vertical | 180–270 | 60–240 | 180 / 180 | 60 / 60 | 124 / 124 | **4 / 4** |

**Importante:** folga após cadeira de 56 cm é uma simplificação geométrica, não simula puxar cadeira, inclinação, pessoas sentadas ou desvio no vão de porta. Não é uma declaração de acessibilidade ou circulação segura. Ao longo das faces ocupadas por cadeiras, o espaço disponível reduz.

### Leitura
- **Horizontal**: mais promissor nas duas formas; ainda é necessário preservar rota corredor↔varanda e cozinha↔estar durante uso de seis assentos.
- **Vertical**: há apenas 60 cm entre cabeceiras e limites do cômodo; com cadeira de 56 cm projetada sobram ~4 cm nas extremidades. **Não recomendado como layout definitivo de seis lugares** sem redesenho integrado dos ambientes/posições.
- O **oval** elimina cantos agudos, interessante perto de fluxos de passagem, mas requer verificar apoio do prato, largura útil nas cabeceiras e base/pés.
- A **retangular** dá cantos e bordas úteis para seis cadeiras, mas pode acentuar interferência com circulação.

## Alternativa compacta para avaliar posteriormente
Uma mesa de 160 × 85 cm, com cadeiras compactas 48 × 56 cm, melhora a situação horizontal. Na vertical, ainda deixa só 70 cm nas extremidades para mesa centralizada e 14 cm após projeção de cadeira de 56 cm; **não resolve circulação em uso**.

## Próximos passos antes de implementar no 3D
1. Conferir porta P2 e abertura V4 em relação à sala (há inconsistência dimensional em P2).
2. Escolher oval versus retangular, além do modelo exato de seis cadeiras e tamanho do tampo.
3. Implantar e testar trajetos com cadeiras recolhidas e ocupadas, sem obstruir acessos à varanda, corredor, cozinha e estar.
4. **Somente após a posição final** cotar centro da luminária de jantar, pontos de interruptores e tomadas de apoio no `ETAPAS-PENDENTES.md`; não fixar ponto de lustre no centro geométrico por padrão.
5. Diretriz estética: evitar fitas, sancas e perfis LED decorativos; priorizar luminárias convencionais e iluminação funcional, deixando definição da tecnologia da lâmpada para etapa posterior.
