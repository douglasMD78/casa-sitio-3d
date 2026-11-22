# Casa do Sítio — parede da TV, padrão residencial brasileiro (estudo rev. 08)

**Data:** 22/11/2026. **Status:** pré-projeto para conferência em obra, **NÃO EXECUTIVO**. Vista interativa: [vista-eletrica-tv.html](vista-eletrica-tv.html). A vista foi ligada ao menu da maquete 3D. Este documento **SUBSTITUI a distribuição provisória de 12 tomadas da revisão 06**; o memorial antigo continua somente como histórico e referencia de ampliações de rede, HDMI e som.

## Objetivo
Usar soluções que eletricistas brasileiros conhecem: **caixas de embutir 4×2 e 4×4**, tomadas modulares **2P+T de 10 A padrão ABNT NBR 14136**, eletrodutos de PVC convencionais e separados para energia e sinal, permitindo TVs aproximadas de 55 a 98 polegadas e racks baixos usuais sem adaptar o circuito a cada compra.

**Limitação fundamental:** não é possível garantir que qualquer modelo de TV/suporte/rack preserve o acesso aos plugues e caiba sem interferências. O projeto só será executável depois de verificar o VESA, os braços do suporte, cabos de força e a alvenaria na obra.

## Situação na planta
- Parede **direita do estar**, dimensão no sentido fundos–frente: **400 cm**. Pé-direito base da casa: **300 cm**. Espessura de alvenaria cadastrada: **15 cm**.
- TV de estudo centrada longitudinalmente em `z=180cm`; o `z` é medido a partir dos fundos do **estar**, no sentido da entrada principal.
- A porta para a varanda P2 alcança os primeiros **30cm** dessa parede dentro do estar. Não mover P2.
- Rack ilustrativo `190×35×49cm`, seu modelo definitivo não está escolhido.
- Quadro de distribuição (QD) está **dentro do corredor**, mas posição física ainda não foi informada. Não representar rota real de alimentação antes de medir a origem.

## Caixas convencionais propostas

| Código | Instalação | Eixo horizontal `z` | Eixo vertical `h` sobre piso acabado | Uso |
|---|---|---:|---:|---|
| **E-01** | **caixa 4×2**, 2 tomadas 2P+T **10 A** | 220 cm | 115 cm | alimentação da TV + reserva |
| **E-02** | **caixa 4×4**, 4 tomadas 2P+T **10 A** | 130 cm | 35 cm | consoles/acessórios |
| **E-03** | **caixa 4×4**, 4 tomadas 2P+T **10 A** | 230 cm | 35 cm | som/receiver/switch/reservas |
| **S-01** | **caixa 4×4**, passagem HDMI, RJ45 conforme espelho escolhido | 145 cm | 115 cm | ponto de sinal superior, atrás da tela |
| **S-02** | **caixa 4×4**, passagem HDMI, RJ45 conforme espelho escolhido | 180 cm | 35 cm | ponto de sinal inferior, atrás do rack |

**Total de energia: 10 tomadas / 3 caixas elétricas.** As duas caixas de dados **ainda não foram lançadas como peças físicas no JSON**, apenas constam na vista técnica e no memorial, para não sugerir que se possa instalar HDMI/RJ45 no mesmo módulo de tomada. Nem todas as linhas modulares aceitam todas as configurações: comprar **placa, suporte, mecanismos e caixa compatíveis** da mesma linha (existem conjuntos comerciais reais de 4×4 com 4 tomadas e 4×2 com 2 tomadas).

**IMPORTANTE:** `z` e `h` são coordenadas do **eixo das caixas**, não posições obrigatórias fixadas pela NBR. A NBR 5410 não determina tomadas a 35 ou 115cm como altura universal. 115cm foi adotado para estudo de caixa atrás das diversas telas, enquanto 35cm é gabarito baixo para rack. A liberação depende de altura final do móvel, acesso por fundo removível, largura do suporte VESA e ausência de interferências.

## Eletrodutos
1. **Energia elétrica:** circuito da distribuição residencial até E-01/E-02/E-03, em eletrodutos **exclusivos de energia**, condutores de fase/neutro/PE conforme sistema local; diâmetro e bitolas são dimensionados por cálculo de ocupação, demanda, método de instalação, agrupamento, queda de tensão e proteção. **Não especificar disjuntor arbitrário.**
2. **Interligação HDMI/sinal TV ↔ rack:** tubo PVC rígido **DN 50 nominal**, exclusivamente para cabos de sinal; curvas suaves e teste de passagem com conectores HDMI reais antes do reboco; uma passagem adicional de reserva só onde a espessura da parede permitir, sem fragilizar alvenaria/estrutura. O diâmetro nominal do PVC não equivale ao espaço interno útil.
3. **Rede Cat6:** conduto **separado da energia**, da central de telecomunicações ainda a definir até as caixas S-01/S-02. Proposta de dois pontos RJ45 atrás da TV e dois ou mais no rack conforme topologia e quadro de telecom. **Não instalar roteador dentro do QD elétrico**.
4. **S-01 e S-02:** caixas de passagem com acabamento de dados adequado, com capacidade para conexão/remanejamento. Não prensar conectores, não deixar emenda de rede inacessível e não passar cabo flexível de alimentação original da TV pelo duto de HDMI.
5. **Duto reserva:** opcional conforme espessura real da alvenaria e projeto estrutural, rota revisável. Com parede de **15cm**, confirmar a viabilidade de embutir PVC DN50 antes de abrir rasgo; se não for viável, usar solução por painel técnico falso removível ou outro percurso aprovado.

## Segurança e documentação normativa
- **ABNT NBR 5410:2004 Versão Corrigida:2008** — instalações elétricas de baixa tensão (edição vigente verificada em 22/11/2026). As tomadas deverão ter condutor de proteção e atender a requisitos de seccionamento, continuidade, aterramento, seleção de condutores, disjuntores, DR/DPS quando aplicáveis. **Seção mínima usual de cobre para circuitos fixos de tomadas: 2,5mm²**, mas isso **não dimensiona o circuito por si só**.
- **ABNT NBR 14136:2012, Versão Corrigida de 2021** — geometria e características de plugues/tomadas domésticos 10 A e 20 A. A previsão usa 10 A nos dez módulos; equipamento futuro com plugue 20 A requer análise da tomada correspondente e da carga/circuito, não adaptador improvisado.
- **ABNT NBR 16264:2016** — cabeamento estruturado residencial, telecomunicações, distribuição e infraestrutura.
- **Caixas 4×2/4×4:** padrão de mercado, **não imposição genérica** dessas normas. **Alturas de 35cm e 115cm:** convenção particular, não imposição normativa.
- Placa de **4 tomadas 10 A não representa um circuito de 40 A**. Quantidade de módulos e dimensionamento elétrico são duas coisas diferentes.
- **DR 30mA:** os casos mandatórios dependem do tipo/local do circuito conforme a NBR 5410; não afirmar que todas as TUG da sala exigem DR apenas por estarem na sala. Proteções precisam ser analisadas considerando demais circuitos e QD residencial.
- A obra deve ser conferida pelo responsável técnico com levantamento de tensão nominal da instalação local, esquema de aterramento, cargas, materiais certificados, bitolas, proteções e compatibilização com construção.

## Referências externas (checadas em 22/11/2026)
- Catálogo ABNT: https://www.abntcatalogo.com.br/default.aspx (NBR 5410:2004 corrigida:2008).
- INMETRO — padrão de plugues e tomadas: https://www.gov.br/inmetro/pt-br/acesso-a-informacao/perguntas-frequentes/avaliacao-da-conformidade/plugues-e-tomadas
- Exemplo de produto de mercado: conjunto Pial Plus+ Legrand 4×4 com quatro módulos 2P+T 10 A: https://www.aquamaris.com.br/conjunto-4x4-tomada-quadrupla-10a-pial-plus-legrand/
- Exemplo 4×2 duplo: https://www.aquamaris.com.br/conjunto-4x2-tomada-dupla-10a-pial-plus-legrand/

## Próxima liberação (antes do reboco)
Conferir no local **(a)** as alturas em relação ao piso ACABADO, **(b)** interferência do suporte e comprimento do cabo de força para TVs 55–98, **(c)** acesso às caixas na troca de rack, **(d)** geometria dos condutos na parede de 15cm e curvas, **(e)** alimentador vindo do QD no corredor, **(f)** entrada da fibra e distribuidor de rede, **(g)** consumo e dimensionamento elétrico pelo profissional. A vista técnica mostra rotas esquemáticas, não traçado de rasgos aprovado.
