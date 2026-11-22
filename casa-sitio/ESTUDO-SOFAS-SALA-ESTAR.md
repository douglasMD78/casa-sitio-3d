# Sala de estar — biblioteca de quatro sofás de medidas comerciais (histórico rev05)

> **Atualização da revisão 07 (22/11/2026):** este arquivo preserva o histórico dos quatro sofás comerciais originais. O 3D agora compara **oito cenários de sofá** (4 comerciais + 4 gabaritos de estilos) e TVs de 55–98 polegadas. As novas posições e folgas, inclusive a porta principal, estão em [ESTUDO-COMPATIBILIDADE-TV-SOFA.md](ESTUDO-COMPATIBILIDADE-TV-SOFA.md). As instruções de controles e posição abaixo documentam a revisão anterior, NÃO a configuração atual.


**Versão de estudo:** 22/11/2026. Não é especificação para compra, aprovação de ergonomia nem projeto elétrico executivo.

## Função arquitetônica
- Sala de estar: 450 × 400 cm, integrada a jantar e cozinha.
- Sofá com costas visíveis para os ambientes integrados. Eixo longo do conjunto no sentido **fundos–frente** da casa; TV na parede direita alinhada com o centro longitudinal z=180 cm.
- **Sem aparador** (removido na revisão anterior).
- Quadro de disjuntores localizado **no lado interno do corredor**, posição exata na parede por levantar.
- Porta principal P1 de 180 cm na frente abre para dentro da sala. A projeção e giro das duas folhas **ainda precisam de ensaio com o sofá escolhido**, sobretudo no extremo frontal do conjunto.

## Modelos comerciais estudados (medidas de referência do anúncio)

| Índice no 3D | Produto | Comprimento × profundidade máxima | Altura | Observações |
|---|---|---|---|---|
| 1 | Sofá chaise Pierri, linho | **240 × 160 cm** | **82 cm* (representação)** | Fabricante informa largura de 240 cm, chaise de 160 cm e profundidade comum de 85 cm; altura de 82 cm é hipótese visual pendente de verificação |
| 2 | Sofá Mercúrio com chaise | **250 × 153 cm** | **89 cm** | Disponível com chaise à direita ou esquerda conforme ficha; revestimentos variam |
| 3 | Sofá Canyon Bom Pastor, retrátil e reclinável | **250 × 160 cm** | **105 cm** | Produto de maior altura; retrátil deve ser avaliado em uso, pois a geometria do mecanismo não está simulada |
| 4 | Sofá Beny Mobly, quatro lugares | **260 × 164 cm** | **82 cm** | Profundidade do sofá de 80 cm, chaise de 164 cm, chaise vendida no lado esquerdo no link pesquisado |

Fontes das medidas:
- Pierri: https://www.madeiramadeira.com.br/sofa-chaise-pierri--tecido-linho--pe-aco--240x160cm--safira-02-578490015.html?seller=15313
- Mercúrio: https://www.madeiramadeira.com.br/sofa-3-lugares-com-chaise-lado-direito-250cm-em-veludo-mercurio-marrom-984431.html
- Canyon: https://www.madeiramadeira.com.br/sofa-com-chaise-canyon-4-lugares-retratil-e-reclinavel-250cm-bege-veludo-bom-pastor-moveis-592718745.html?seller=17012
- Beny: https://www.mobly.com.br/sofa-4-lugares-beny-com-chaise-esquerdo-linho-cru-896146.html

## Como selecionar no site
A peça `EST-SOFA-BIBLIOTECA` (tipo `sofa-biblioteca-4`) possui **três ações**:
1. **Sofás: opção 1 ↔ 2 / 3 ↔ 4**: primeiro bit (A).
2. **Sofás: grupo 1–2 ↔ grupo 3–4**: segundo bit (B).
3. **Chaise na ponta frente ↔ fundos (estudo)**: alterna a extremidade da chaise, espelhamento **apenas conceitual**. Confirmar versão realmente vendida.

| A | B | Modelo exibido |
|---|---|---|
| Desligado | Desligado | Pierri 240×160 |
| Ligado | Desligado | Mercúrio 250×153 |
| Desligado | Ligado | Canyon 250×160 |
| Ligado | Ligado | Beny 260×164 |

A geometria usa a **medida externa máxima declarada** de cada produto e um encosto/assentos ilustrativos com profundidade de uso estimada quando não documentada. **Não representa fielmente almofadas, lado de fabricação, mecanismos retráteis nem pés de cada modelo.** A chaise é desenhada na extremidade selecionada para análise de circulação.

## Implantação inicial comparativa
- Envelope de comparação: **260 cm** no eixo fundos–frente, **164 cm** de profundidade para a direção da TV.
- Origem da peça no estar: `daEsquerda=105`, `dosFundos=50`, `frentePara=direita`, deixando uma faixa de **105 cm** à esquerda do volume (a ser compatibilizada com a passagem real).
- Cada modelo é centralizado **no eixo longitudinal z=180 cm** com base na largura comercial. Sofa normal até aprox. x=185–205 cm; chaise até x=258–269 cm. Rack começa x=415 cm, gerando aproximadamente **146–157 cm após a ponta da chaise**, dependendo do modelo.
- **Entrada principal P1:** por ser porta dupla na frente com abertura para dentro, a circulação geométrica do sofá precisa ser validada com a área de varredura das folhas. A implantação não é aprovada para compra/execução.
- **Luz, tomadas, cabos e eventual ponto de piso** ficam pendentes até escolher o sofá e testar trajeto, altura dos olhos para a TV, painel e rack.

## Como escolher
Comparar a traseira estofada (o sofá precisa dividir visualmente os ambientes), braço da chaise adequado ao ponto de entrada, conforto ao sentar e espaço livre para cruzar os ambientes com a porta aberta. Os modelos reais podem diferir do protótipo 3D.
