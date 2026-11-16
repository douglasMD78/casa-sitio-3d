# Casa do Sítio 3D — etapas pendentes

Documento de planejamento. **Não executar automaticamente** as tarefas abaixo; iniciar somente quando solicitado. Manter a maquete arquitetônica existente intacta durante o planejamento técnico.

## Prioridade futura: documentação elétrica e hidráulica por cômodo

**Status:** PENDENTE — ideia aprovada para desenvolvimento posterior (15/11/2026).

### Objetivo
Após a aprovação do layout de cada cômodo, produzir **duas representações sincronizadas**:
1. **Planta baixa técnica 2D**: pontos elétricos e hidráulicos cotados, simbologia/legenda, circuitos, alturas, percursos, quadro de cargas, memorial e exportação para impressão.
2. **Planta virtual 3D**: camadas ativáveis de elétrica, hidráulica e manutenção; permitir ocultar paredes e inspecionar a localização documentada de conduítes, tubulações, caixas e registros.

### Fluxo de execução (por cômodo)
- [ ] Confirmar layout definitivo: medidas, portas, janelas, móveis e aparelhos com modelos/manuais.
- [ ] Levantar pontos de utilização, cargas, tensões, tomadas, interruptores, luminárias e hidráulica.
- [ ] Compatibilizar posições com estrutura, portas, móveis, impermeabilização e acessos para manutenção.
- [ ] Planejar circuitos, proteções, bitolas e encaminhamento de eletrodutos; consolidar quadro geral da casa.
- [ ] Planejar água, esgoto, ventilação, sifonagem, caimentos e registros.
- [ ] Produzir planta 2D cotada, legenda, lista de pontos e memorial.
- [ ] Implementar camada 3D técnica **separada** da arquitetura; manter dados 2D e 3D consistentes.
- [ ] Registrar faixas embutidas com cotas e fotos antes de reboco/fechamento, para consulta futura ao furar paredes.
- [ ] Submeter documentação e instalação à conferência e responsabilidade de profissionais habilitados; não tratar maquete como projeto executivo aprovado.

### Registro futuro obrigatório: elétrica da ilha da cozinha (revisão 11 · 16/11/2026)
- [ ] Recuperar o memorial em `ESTUDO-EXECUTIVO-ILHA-COZINHA.md` e a peça `COZ-ILHA-APOIO` em `dados/comodos/cozinha.json` antes do desenho de circuitos.
- [ ] Coordenadas previstas da torre retrátil no tampo Branco Itaúnas da ilha 180×90: início **x=79 cm da lateral esquerda** e **z=12 cm da borda voltada à cozinha**; centro aproximado **x=83,25 cm, z=16,25 cm**. **Revisão 12:** torre com tampa camuflada no mesmo granito Branco Itaúnas do tampo; fechada, deve ficar visualmente discreta, sem metal preto exposto. Não executar furação até definir modelo e gabarito da torre.
- [ ] Confirmar que a torre se encaixa no volume acima do armário direito, à direita do módulo esquerdo do micro; medir volume de retração, folgas de dobradiças, apoio da pedra, divisórias e caminho dos cabos; **confirmar que o mecanismo admite revestimento de pedra (peso, espessura e abertura)**.
- [ ] Prever alimentação elétrica da **torre** e ponto de tomada **separado e acessível para o Fischer Infinity Touch Grill 25 L**; não alimentar o forno pela torre. Validar potência, tensão da unidade, circuitos, DR/aterramento, bitolas, carga simultânea e proteções.
- [ ] Definir acesso dos eletrodutos pelo piso/contrapiso e pontos de inspeção, compatibilizando com a estrutura, impermeabilização, travessas do móvel e zona de ventilação.
- [ ] Resolver com a Fischer se o trajeto até a **grelha lateral esquerda** da ilha é autorizado: o manual prescreve saída superior. Manter cabos afastados do duto quente; **não fabricar a solução lateral sem validação expressa do fabricante**.
- [ ] Registrar em planta elétrica 2D e camada 3D técnica os pontos, alturas, trajeto, circuito e manutenção da ilha, quando essa etapa for solicitada.


### Primeiro piloto: lavanderia
- [ ] Usar a lavanderia como cômodo piloto, **apenas quando solicitado**.
- [ ] Revisar interferências entre água, esgoto e elétrica e acesso para manutenção.
- [ ] Confirmar modelos exatos Electrolux, Suggar e robô aspirador; validar manuais e dimensões.
- [ ] Verificar a garagem do robô: abertura real, acesso ao carregador, folgas de entrada e ventilação.
- [ ] Validar altura do deságue do tanquinho por gravidade e instalação da lavadora.
- [ ] Desenhar trajetos reais das redes: o JSON atual registra principalmente pontos terminais e zonas **propostas**, não a tubulação executada.

### Diretrizes
- Camadas previstas: **Arquitetura**, **Elétrica**, **Hidráulica** e **Manutenção**.
- Não sobrepor indevidamente instalações nem esconder conexões que precisem de inspeção.
- Não assumir que o modelo 3D garante segurança para perfurar paredes: exigir cadastro *as built* e conferência no local.
- Aplicar normas brasileiras pertinentes (incluindo ABNT NBR 5410 para elétrica e normas hidrossanitárias aplicáveis), com validação por profissional habilitado.
- Evitar alterar paredes, portas, janelas e móveis aprovados ao adicionar camadas técnicas.

## Estado atual
- [x] Lavanderia modelada e revisada com equipamentos, pontos preliminares e garagem do robô.
- [ ] Planta elétrica 2D profissional.
- [ ] Planta hidráulica 2D profissional.
- [ ] Camadas técnicas virtuais 3D.
- [ ] Cadastro de manutenção pós-execução (*as built*).

> Atualizar este arquivo conforme as etapas forem iniciadas ou concluídas.
