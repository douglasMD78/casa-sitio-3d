# Casa do Sítio — pré-projeto da parede da TV e multimídia (revisão 01)

**Data:** 22/11/2026  
**Natureza:** estudo funcional PRÉ-EXECUTIVO — não é projeto elétrico assinado, memorial de dimensionamento de circuitos nem ordem de execução. O proprietário quer executar uma infraestrutura duradoura ANTES do reboco, independentemente dos modelos finais de sofá, televisão, suporte e rack. A validação final cabe a profissional habilitado, presencialmente, segundo NBR 5410 (edição vigente), NBR 16264 (cabeamento residencial) e condições da obra.

## 0. Dados físicos de referência
- Sala de estar: 450 cm (esquerda-direita) × 400 cm (fundos-frente), piso acabado como referência de cotas verticais.
- TV na **parede direita** (x=450 local), **eixo longitudinal z=180 cm** desde os fundos da sala, com rack aproximadamente alinhado; local poderá ser revisto antes de executar os rasgos.
- TV existente no 3D ainda é **esquemática e está alta** (doPiso=112cm, altura=73cm, centro=148,5cm). **Não usar a altura renderizada como gabarito de instalação.**
- Porta lateral P2 está em parede direita, atravessa 30cm da linha imaginária de jantar para estar; zona da TV a partir de z≈85cm não coincide com sua abertura na parede, mas a circulação deve ser verificada.
- Porta P1 dupla, 180cm, na frente, aberta para dentro. Sofá continua em comparação, não há modelo definitivo.
- O quadro de disjuntores (QD) fica no **INTERIOR do corredor**, posição exata ainda desconhecida. **Não utilizar o QD como abrigo de roteador, ONU/ONT ou switch de rede.**

## 1. Critério de flexibilidade
O objetivo não é garantir qualquer TV/rack imaginável, e sim prever um **envelope explícito** (estudo inicial: TVs aproximadamente **55 a 85 polegadas**, rack baixo idealmente **35 a 55 cm de altura**, modelos maiores exigem conferir borda inferior da tela e fixação). Uma TV de 85” com rack alto de 80cm pode não permitir simultaneamente boa altura da tela, folga e alinhamento. Sempre haverá interface com altura final da tela, suporte VESA e saída física do cabo de alimentação.

Sugestão ergonômica de partida: centro de tela perto de **110–120cm** do piso; a altura final resulta da altura real dos olhos sentados e do tamanho da TV. Para 85” 16:9, altura da imagem ~106cm: se centro a 115cm, borda inferior ~62cm. Rack de 50cm teria ~12cm livres. Para 75”, altura ~93cm: centro 110cm -> borda ~63,5cm. **São exemplos, não cotas de fixação.**

## 2. Tomadas de energia a representar no 3D — TODAS EM STATUS 'proposta'

| ID | Zona | Parede/cota do eixo | Módulos 2P+T 10A | Função |
|---|---|---|---|---|
| EST-TV-ENERGIA-E | TV superior, lado dos fundos | direita, z=140cm, h=115cm | 2 | Televisão, tomada reserva |
| EST-TV-ENERGIA-D | TV superior, lado da frente | direita, z=220cm, h=115cm | 2 | Alternativa para cabo de TV e acessórios |
| EST-RACK-ENERGIA-1 | Rack inferior | direita, z=135cm, h=30cm | 2 | Console/acessórios |
| EST-RACK-ENERGIA-2 | Rack inferior | direita, z=165cm, h=30cm | 2 | Segundo console/TV box |
| EST-RACK-ENERGIA-3 | Rack inferior | direita, z=195cm, h=30cm | 2 | Som/receiver |
| EST-RACK-ENERGIA-4 | Rack inferior | direita, z=225cm, h=30cm | 2 | Switch/internet caso necessário + reservas |

**Total de estudo: 12 tomadas funcionais, seis grupos de duas:** quatro atrás da TV e oito na zona do rack. **Não equivale a seis circuitos nem garante doze equipamentos simultâneos:** dimensionar circuitos e demanda com eletricista/engenheiro. As caixas podem ser reorganizadas em conjuntos comerciais equivalentes, como 4x4 com quatro módulos 10A, **somente após analisar espaçamento físico dos plugues/fonte e profundidade**. Não empilhar adaptadores/Ts nem prever réguas permanentemente escondidas como solução-base. As cotas no JSON são *eixos* das placas e partem do **piso acabado**.

**Justificativa superior:** aparelhos como TVs Sony apresentam cabos de força da ordem de 1,5m em vários modelos, mas comprimento e lado de saída variam. Oferecer uma tomada à esquerda e outra à direita do eixo da tela permite evitar extensões e evita passar o cabo flexível removível **por dentro da alvenaria**. Caixas altas devem estar 100% cobertas pela menor TV prevista e **fora da base do suporte, fixadores, armaduras e zonas de calor**. As cotas z=140/220 e h=115 são gabaritos de estudo; poderão ser deslocadas após escolher a família de suportes VESA. Um painel técnico traseiro removível com zona de serviço é mais flexível que seis caixas definitivamente rasgadas em locais incertos; preservar acesso em caso de substituição.

**Zona baixa:** 30cm de piso é altura de estudo, não solução universal. Rack fixo com base alta, fundo fechado ou sem painel de visita pode ocultar e tornar inviável a manutenção. O desenho final deve prever fundo removível/recortes sem perder segurança, tomada sem compressão dos plugues e ventilação adequada para consoles e amplificadores. Evitar fontes quentes fechadas sem ventilação.

## 3. Eletrodutos, caixas técnicas e sistemas separados (documentação ainda NÃO representada no 3D)
### Rede elétrica
- Caminho **próprio e exclusivo** do QD/circuito de tomadas até os pontos superiores e inferiores, com fase/neutro/proteção PE conforme alimentação e sistema local. **Não** compartilhar com HDMI, UTP Cat6, fibra ou coaxial sem solução expressamente permitida pela norma técnica.
- Projeto de circuitos a dimensionar segundo cargas, tensão local (127/220V a confirmar no QD), fatores de agrupamento, método de instalação, queda de tensão, proteção, aterramento, proteção contra sobretensão DPS/DR onde aplicáveis.
- NBR 5410 prevê seções mínimas em cobre de **2,5mm² para circuito de tomadas**, porém a bitola e disjuntor reais **não** podem ser determinados somente por esta informação. Se potência de amplificador / home theater exigir, prever condição específica após carga real.
- Manter caixas de derivação acessíveis. Não realizar emendas soltas, não usar extensão dentro de conduíte nem comprimir fio/conector atrás da TV. Conferir profundidade do conector quando suporte articulado ou ultrafino.

### Conexão TV ↔ rack
- **Duto de sinal de passagem livre de aprox. DN40–DN50 nominal**, preferivelmente interior liso, entre uma terminação acessível junto da TV e outra junto do rack, com curvas suaves e acessos.
- **Segundo duto de reserva DN32–DN40** se couber estruturalmente, após verificar espessura da alvenaria e necessidade de não cortar pilares/cintas/vigas.
- DN é designação do eletroduto: **não equivale automaticamente ao diâmetro interno livre**. O profissional precisa testar a passagem do conector HDMI real (e o raio de curvatura) antes de rebocar. Usar guia passa-fio e identificação, sem curvas de 90° de pequeno raio.
- Usos: HDMI compatível com as taxas realmente necessárias (para consoles 4K/120Hz considerar Ultra High Speed HDMI certificado, até 48Gb/s), HDMI eARC TV ↔ soundbar/receiver, possíveis futuras tecnologias. A prioridade é **substituir cabos no futuro**, e não enterrar agora um HDMI supostamente definitivo. Evitar cabos com fontes/tensão de rede inadequados ao ambiente de instalação.

### Rede Ethernet e TV aberta
- **Não usar o duto HDMI como a única conexão da casa à internet.** Criar caminho de telecomunicações próprio do futuro distribuidor residencial/armário ICT para a parede da TV/rack.
- Propor **2 links Cat6 de cobre sólido terminados em tomadas RJ45 atrás da TV** (TV e reserva) + **4 links Cat6 no rack** (PS/Xbox/streaming/switch/receiver e reservas). Alternativamente, 2 pontos RJ45 + switch no rack permite economia, mas menos redundância. Custo-benefício deve ser revisto no projeto de toda a casa.
- Reservar **1 coaxial RG6 atrás da TV**, se houver chance de antena digital/TV convencional. Preparar dutos e passagens ópticas de provedor separadamente, conforme solução escolhida.
- O acabamento RJ45 é de conexão e manutenção; não deixar cabo solto saindo diretamente da parede, sem terminação protegida.
- A posição exata dos pontos RJ45/sinal altos e baixos é definida após interferências do suporte e estrutura; no momento o **catálogo 3D não representa tais tomadas/dutos**, apenas os pontos de energia.

### Som e expansão
- Soundbar pode ficar sob TV ou sobre rack; prever HDMI eARC pelo duto e tomada de energia perto de sua montagem definitiva, sem deixar fios pendurados.
- Subwoofer ativo exige tomada de energia na posição onde realmente ficará, **não presumir que ficará dentro do rack**. Se for sem fio, também requer tomada própria.
- Para home theater com caixas traseiras, reservar dutos **independentes para cabos de alto-falante (sinal/áudio)** até extremidades ou teto, sem terminar definitivamente em pontos dependentes de sofá ainda não escolhido. Caixas ativas adicionais podem requerer tomadas nas posições delas.
- Tomadas gerais do cômodo próximas da entrada, sofás, mesas de apoio e limpeza devem ser distribuídas **separadamente** da concentração do rack, atendendo ao mínimo normativo por perímetro; esses pontos ainda NÃO foram lançados neste estudo.

## 4. Rede da casa: modem, roteador, pontos Wi-Fi
**Recomendação funcional:** preferir uma infraestrutura de rede **centralizada fora do rack da TV e em compartimento próprio, ventilado, acessível e seco**, com fonte de energia e entrada do provedor. Pode ser nicho técnico separado no corredor ou outra área central que a planta realmente comporte, mas **não dentro do QD dos disjuntores**; nem fechado na cozinha/despensa úmida/atrás da TV.

Distinção:
- **ONT/modem:** terminação óptica / conexão com provedor; posição depende da entrada real da fibra externa.
- **Roteador/firewall:** distribui rede local; pode estar no nicho técnico desde que haja Wi-Fi por access points independentes.
- **Switch Ethernet:** distribui portas cabeadas para TV, consoles, computadores, câmeras e APs.
- **AP Wi-Fi PoE:** reservar ao menos **um cabo Cat6 em ponto de teto central** na área social (a definir pela planta de forro e cobertura) e uma rota de reserva para área dos quartos/varanda. Preferir APs ligados por cabo. O número real depende da cobertura e dos materiais da casa.
- Considerar **nobreak compacto compatível** com ONT, roteador e switch se continuidade durante quedas de energia for objetivo, com ventilação e acesso; cuidado com aquecimento e escolha adequada da bateria.

Estrutura lógica:
`Fibra do provedor → ONT → roteador/firewall → switch → RJ45 da TV e rack + AP(s) Wi-Fi`.
O provedor e a planta precisam confirmar a entrada externa da fibra e a localização do armário de telecom antes de embutir conduítes.

## 5. Conferências técnicas ANTES de rasgar e rebocar
1. Identificar fisicamente a parede da TV, espessura e interferências com pilares/cintas/vigas/hidráulica, e verificar se DN40–DN50 pode ser embutido **sem enfraquecer alvenaria/estrutura**. Se não, considerar painel técnico raso com passagem protegida/acessível.
2. Medir cotas a partir do **piso acabado**, não do contrapiso cru.
3. Verificar os suportes VESA articulado/fixo e envelopes 55–85” em sobreposição de desenho; desenhar duas posições de tomada superior **fora da área de ancoragem** e a abertura do rack.
4. Ensaiar um cabo de energia real de ~1–1,5m das possíveis saídas laterais da TV até as tomadas; **não depender de extensão**.
5. Ensaiar HDMI com conector real, tracionar/retirar após curvas, fotografar dutos antes de rebocar e deixar guia.
6. Confirmar tensão nominal e esquema de aterramento, carga máxima prevista (TV, consoles, receiver, som, modem), bitolas, disjuntores e proteção por eletricista projetista.
7. Definir layout do rack, posição do soundbar/subwoofer e se haverá home theater traseiro. Testar ventilação e acesso aos plugues.
8. Fazer mapa de rede da casa, ponto da fibra, distribuidor técnico, access points e futuras câmeras externas.
9. Registrar circuitos e cabos no quadro. Testar identificação, continuidade PE, polaridade, isolação, DR e funcionamento dos pontos conforme normas aplicáveis.
10. Assinalar **executável** apenas após responsável técnico aprovar esquema e cotejar com obra.

## 6. Por que o plano é assim
- O sistema de tomadas em dois níveis evita depender de equipamentos e cabos com comprimentos imprevisíveis; toda tomada precisa permanecer acessível mediante remoção simples de equipamento/painel.
- O cabeamento estruturado dá acesso cabeado a videogames, TV e AP, sem amarrar o roteador à posição lateral da televisão.
- A infraestrutura de **dutos substituíveis** é o elemento mais duradouro diante de HDMI, telas, receivers e móveis futuros.
- Não é possível atender sem ajustes qualquer **TV enorme + rack alto + posição ergonômica baixa**. O compromisso futuro deve ser uma família de móveis compatíveis, não prometer o fisicamente impossível.

## Referências consultadas em novembro de 2026
- Catálogo ABNT (NBR 5410:2004 versão corrigida 2008): https://abntcatalogo.com.br/
- NBR 16264, cabeamento residencial: https://buscadorsinapi.com.br/normas/nbr-16264-cabeamento-estruturado-residencial
- HDMI.org, Ultra High Speed: https://www.hdmi.org/spec21sub/ultrahighspeedcable/
- Sony, tabelas de montagem e comprimento aproximado de cabos: https://www.sony.com/electronics/support/televisions-projectors-lcd-tvs/android-/kd-85x85k/articles/00197971
- TP-Link, posicionamento do roteador (2026): https://www.tp-link.com/us/blog/2480/where-to-place-your-wi-fi-router-for-the-best-signal/
- Produtos comerciais de 4 tomadas 10 A em placa 4×4: https://www.lisfer.com.br/produtos/4-tomadas-modulo-2pt-10a-placa-4x4-4-modulos-habitat-fame/

