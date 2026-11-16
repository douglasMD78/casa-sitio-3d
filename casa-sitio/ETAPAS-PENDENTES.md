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
