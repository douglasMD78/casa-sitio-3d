# Padrão de inventário de equipamentos — Casa do Sítio

## Como usar

1. Abra o projeto no navegador via servidor local, selecione **Lavanderia**.
2. Clique na máquina de lavar (LAV-MAQUINA).
3. Na ficha **Inventário · trocar equipamento**, escolha **frontal** ou **superior**, clique em **Trocar**.
4. Na ficha clique em **Abrir** para animar a porta ou tampa; clique em **Fechar** para recolher.
5. A troca mantém **um único slot** e preserva posição, ID e conexões, alterando apenas medidas/modelo/nome.
6. Ao trocar, revise **Conferência** e salve o cômodo pelo servidor ou baixe o JSON atualizado. Sem salvar, mudanças ficam em rascunho local.

## Padrão reutilizável

- `dados/catalogo-equipamentos.json` guarda categorias e variantes (dimensões reais em cm, modelo do motor e identificação).
- `dados/comodos/*.json` define cada instância com `tipo: "eletro"`, um ID estável, `categoriaInventario: "lavadora"`, `modelo` inicial e a posição.
- A ficha detecta o atributo `categoriaInventario`, apresenta os modelos e realiza a troca com alteração apenas do objeto selecionado.
- Para novas famílias de equipamentos, acrescente uma categoria, variantes com geometrias suportadas pelo `motor/catalogo.js`, e marque o slot com `categoriaInventario` correspondente. Tipos sem geometrias específicas precisam de implementação no catálogo 3D.

## Integridade e escopo

A base arquitetônica `dados/casa.json`, todos os demais cômodos, portas P8/V3, medidas gerais e outros objetos foram mantidos idênticos. A única exceção à regra histórica "não editar motor" é a adição mínima de recursos solicitados (animação das máquinas e interface de inventário) em `motor/catalogo.js`, `motor/ui.js` e `motor/app.js`.

## Instalações propostas (não executivas)

Pontos de água fria, esgoto, tomada e ralo foram lançados como **proposta** na lavanderia. O diâmetro do esgoto, posição/altura final das mangueiras, ventilação/fecho hídrico da rede, circuitos, DR, aterramento, zonas de respingo e declividades dependem do fabricante e da compatibilização com o projeto hidrossanitário e elétrico. O tanquinho usa volume genérico ilustrativo. A verificação do espaço com portas **abertas** não é incluída pelo validador geométrico estático: confira a animação visualmente.

Fontes de medidas: Electrolux LFB12 (lavadora frontal 12 kg, 60 x 65,9 x 85 cm); Electrolux LED13 (superior 13 kg, 59,1 x 66,5 x 105,2 cm, altura com tampa aberta 139 cm). Confirmar manual e medidas finais antes de marcenaria/instalações.
