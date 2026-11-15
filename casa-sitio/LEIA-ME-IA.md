# Casa do Sítio — guia para a IA que edita a maquete

Você vai editar a maquete 3D de uma casa. A casa inteira é descrita por arquivos de dados (JSON). O motor lê esses dados e desenha. **Seu trabalho é mudar os dados, nunca o motor.**

## 1. Regras (leia antes de qualquer coisa)

1. **Edite só `dados/`** (e `texturas/`, para imagens). Nunca altere `motor/`, `vendor/`, `index.html` ou `servidor.js`.
2. **Não invente.** Se o pedido não diz uma medida, uma parede ou uma posição, **pergunte antes de escrever**. Veja a lista da seção 2.
3. **Pergunte tudo de uma vez**, em lista numerada, e sugira um valor em cada pergunta ("Altura da bancada? Sugestão: 90 cm").
4. Se o dono disser "pode sugerir", use sua sugestão e marque a peça com `"status": "proposta"`.
5. **Mexa só no que foi pedido.** Todo o resto do arquivo volta igual, sem reordenar e sem "melhorar".
6. **Devolva só o que muda**, no formato de mesclagem abaixo, em JSON válido: aspas duplas, sem comentários, sem vírgula sobrando. Não repita peças que não mudaram.
7. Ao terminar, liste o que mudou no formato `ID.campo: antes → depois` e diga o que o dono deve conferir no botão **Conferência** do site.
8. Se a peça pedida não existe no catálogo (seção 6), **diga isso**. Ofereça a peça mais próxima ou uma montagem com `caixa`. Não invente um `tipo` novo.
9. Tudo é em **centímetros**. Use ponto para decimais (`2.5`).

### Formato da resposta (mesclagem)

```json
{ "comodo": "cozinha", "modo": "mesclar",
  "pecas": [ { "id": "COZ-T4", "tipo": "tomada", "parede": "fundos", "daEsquerda": 120, "doPiso": 110 } ],
  "remover": ["COZ-T2"] }
```

- `pecas`: só as peças **novas** ou **alteradas**. Uma peça alterada vai **completa**, com todos os campos, e o mesmo `id`.
- `remover`: ids a apagar. Omita se não houver.
- O que não for citado continua como está. Assim nenhuma peça some por esquecimento.
- Responda só com o bloco JSON, sem texto antes ou depois.

O dono cola a resposta no site (botão **IA**). O site testa antes de aplicar e devolve a você a lista de erros, se houver. Quando receber essa lista, corrija e devolva de novo no mesmo formato.

## 2. Quando perguntar

Pergunte sempre que faltar ou for ambíguo:

- em qual **cômodo** e em qual **parede** a peça fica;
- a **distância até um canto** (e a partir de qual canto);
- **largura, profundidade ou altura** de móvel, quando o dono não deu e não aceitou o padrão;
- a **altura do piso** de tomada, interruptor, ponto de água, prateleira ou armário suspenso;
- qual **interruptor comanda** qual luz;
- para que lado uma **porta abre** e de que lado fica a dobradiça;
- qual **material** usar, quando o pedido fala de acabamento sem dar o nome;
- quando o pedido **bate em algo existente** (em cima de porta, janela ou outro móvel);
- quando "esquerda", "direita", "frente" e "fundo" puderem significar outra coisa (por exemplo, "à esquerda da pia").

Não precisa perguntar: medidas padrão de eletrodomésticos e louças (o catálogo já tem), nem detalhes que o dono chamou de ilustrativos.

## 3. Como a casa é medida

### Direções (fixas, iguais às da planta)

| Nome | Significado |
|---|---|
| `frente` | lado da **rua** |
| `fundos` | lado oposto à rua |
| `esquerda` | à esquerda de quem **olha da rua para a casa** (lado dos quartos) |
| `direita` | à direita de quem olha da rua (lado da lavanderia, despensa e varanda) |

Cada cômodo é um retângulo com quatro paredes: `fundos`, `frente`, `esquerda`, `direita`. As direções não mudam com a posição de quem olha.

O quarto suíte tem forma de L e por isso são **dois retângulos** do mesmo conjunto: `suite` (a parte maior) e `suite-entrada` (o trecho de 1,10 × 1,50 m junto à porta do corredor e do banheiro). Não há parede entre eles. Uma peça fica no arquivo do retângulo onde está.

### Posição de uma peça

Use **uma** medida por eixo:

- no eixo esquerda–direita: `daEsquerda` **ou** `daDireita`;
- no eixo fundos–frente: `dosFundos` **ou** `daFrente`.

| Tipo de peça | Como posicionar | A medida vai até |
|---|---|---|
| **Encostada na parede** (`"parede": "fundos"` etc.) | uma medida ao longo da parede: `daEsquerda`/`daDireita` em paredes `fundos`/`frente`; `dosFundos`/`daFrente` em paredes `esquerda`/`direita` | a **borda mais próxima** da peça |
| **Solta no cômodo** (sem `parede`): ilha, mesa, cama solta | as duas medidas, mais `frentePara` (para qual parede a frente olha; padrão `frente`) | a **face mais próxima** da peça (é a folga que se mede com a trena) |
| **Ponto na parede**: tomada, interruptor, arandela, ponto de água, esgoto, registro, chuveiro | `parede` + uma medida ao longo dela + `doPiso` | o **eixo (centro)** do ponto |
| **Ponto no teto ou no piso**: plafon, spot, pendente, ralo | as duas medidas | o **centro** |

Outros campos de posição:

- `doPiso`: altura do piso até a **base** da peça (ou até o **centro**, nos pontos). Padrão 0.
- `afastamento`: distância entre a parede e as costas da peça. Padrão 0.
- `largura` (ou `comprimento`): medida **ao longo da parede**. `profundidade`: da parede para dentro do cômodo. `altura`: de baixo para cima.

### Partes dentro de uma peça

Módulos, cuba, cooktop e divisórias seguem a **ordem da planta**: da esquerda para a direita (peça em parede `fundos`/`frente`) ou dos fundos para a frente (peça em parede `esquerda`/`direita`). Dentro da peça use `daEsquerda`/`daDireita` ou `dosFundos`/`daFrente`, medidos a partir da ponta da própria peça. Sem medida, a parte fica centralizada.

`dobradica` recebe o nome da ponta onde ela fica: `esquerda`, `direita`, `fundos` ou `frente`.

### Campos que toda peça pode ter

| Campo | Uso |
|---|---|
| `id` | obrigatório e único na casa. Padrão `PREFIXO-NOME`: `COZ-BANCADA-PIA`, `COZ-T3` |
| `tipo` | obrigatório; um nome do catálogo |
| `nome` | nome legível, aparece na ficha |
| `status` | `definido`, `proposta` ou `a-confirmar` |
| `obs` | observação livre (aparece na ficha) |
| `sobre` | id da peça em que esta está apoiada (objeto sobre a bancada) |
| `dentroDe` | id da peça que contém esta (freezer dentro do nicho) |
| `atrasDe` | para tomada escondida de propósito atrás de um móvel |

Prefixos de id: `CLO` closet, `SUI` suíte, `BSU` banheiro suíte, `SUE` entrada da suíte, `BSO` banheiro social, `COR` corredor, `Q2` quarto 2, `Q1` quarto 1, `COZ` cozinha, `JAN` jantar, `EST` estar, `LAV` lavanderia, `DES` despensa, `VAL` varanda lateral, `VFR` varanda frontal.

## 4. Arquivos

```
dados/casa.json            cômodos, portas, janelas, vãos, varanda, pé-direito (base da planta)
dados/materiais.json       materiais e texturas
dados/comodos/<id>.json    um arquivo por cômodo: forro, acabamentos e peças
texturas/                  fotos de textura
```

Arquivo de cômodo:

```json
{
  "comodo": "cozinha",
  "revisao": "03",
  "forro": { "altura": 270, "material": "forro-branco", "status": "proposta" },
  "acabamentos": { "piso": "porcelanato-bege", "paredes": { "fundos": "ceramica-banho", "padrao": "parede-branca" } },
  "pecas": [
    { "id": "COZ-BANCADA-PIA", "tipo": "bancada", "parede": "fundos", "daEsquerda": 0,
      "largura": 280, "profundidade": 60, "altura": 92,
      "tampo": { "material": "granito-cinza", "espessura": 3 },
      "rodape": 10, "frontao": 8, "corpo": "mdf-branco",
      "modulos": [ { "largura": 80, "tipo": "gavetas", "gavetas": 4 }, { "tipo": "portas" }, { "tipo": "portas" } ],
      "cuba": { "daEsquerda": 95, "largura": 50 },
      "status": "definido" },
    { "id": "COZ-ILHA", "tipo": "ilha", "daEsquerda": 120, "dosFundos": 170, "frentePara": "fundos",
      "largura": 180, "profundidade": 90, "altura": 92,
      "tampo": { "material": "madeira-mel" }, "cooktop": { "daEsquerda": 60 },
      "status": "proposta" },
    { "id": "COZ-T1", "tipo": "tomada", "parede": "fundos", "daEsquerda": 60, "doPiso": 110,
      "amperagem": 20, "uso": "micro-ondas", "status": "definido" },
    { "id": "COZ-I1", "tipo": "interruptor", "parede": "direita", "dosFundos": 20, "doPiso": 110,
      "teclas": 2, "comanda": ["COZ-L1", "COZ-L2"] },
    { "id": "COZ-L1", "tipo": "pendente", "daEsquerda": 210, "dosFundos": 215, "queda": 120,
      "potencia": 12, "temperatura": 3000 }
  ]
}
```

- `revisao`: o site aumenta sozinho ao salvar. Se você editar o arquivo à mão, some 1.
- `acabamentos.paredes` aceita um material só (`"parede-branca"`) ou um por parede.
- Portas, janelas e vãos ficam em `dados/casa.json`, na lista `aberturas` (seção 7).

A despensa (`dados/comodos/despensa.json`) é o **exemplo completo**. Copie o jeito dela.

## 5. Materiais e fotos de textura

Todo campo de material aceita um nome de `dados/materiais.json` ou uma cor direta (`"#7d9482"`).

Um material:

```json
"granito-verde": { "cor": "#2c4538", "imagem": "texturas/granito-verde.jpg", "tamanho": [90, 70], "rugosidade": 0.3 }
```

| Campo | Uso |
|---|---|
| `cor` | cor base (e cor do bloco na visão geral) |
| `imagem` | foto em `texturas/` |
| `tamanho` | `[largura, altura]` em cm que a foto mostra **na vida real**; define a escala |
| `textura` | padrão desenhado pelo motor: `madeira`, `granito`, `porcelanato`, `concreto`, `palha`, `tecido`, `grama` |
| `rugosidade` | 0 (polido) a 1 (fosco) |
| `metal` | 0 a 1 |
| `opacidade` | menor que 1 para vidro |
| `giro` | graus para girar o veio |

**Quando o dono mandar uma foto de material** ("quero a pia com este granito"):

1. O caminho normal é o próprio site: **Editar → Nova textura por foto**. O site reduz a foto, grava em `texturas/` e cria o material.
2. Se o material ainda não existe, peça o **nome** e o **tamanho real** que a foto mostra, e escreva a linha em `materiais.json`.
3. Depois aponte a peça para ele, por exemplo `"tampo": { "material": "granito-verde" }`.

**Quando o dono mandar uma foto de forma** ("quero a porta deste jeito"): uma foto vira **textura**, não vira geometria. Descreva o que vê usando as opções do catálogo (modelo, número de folhas, material, puxador), mostre ao dono o que escolheu e pergunte se confere. Se nenhuma opção representa a foto, diga que é preciso criar um modelo novo no catálogo (seção 9).

## 6. Catálogo de peças

Medidas entre parênteses são o padrão quando o dado não informa.

### Móveis

| `tipo` | Campos próprios |
|---|---|
| `caixa` | `largura`, `profundidade`, `altura`, `material`. Peça genérica, para o que não existe no catálogo |
| `bancada` (também `ilha`, `balcao`) | (120 × 60 × 90) `tampo` `{material, espessura}`; `corpo` e `frente` (materiais); `chapa` (1.8); `rodape` (altura); `recuo`; `frontao` (altura); `puxador` (`barra`, `nenhum`); `base` (`nicho`, `portas`, `gavetas`, `aberta` = só pés); `modulos`; `cuba`; `cooktop`; `aberto` |
| `armario` (também `guarda-roupa`, `aparador`) | (80 × 55 × 240; suspenso 80 × 35 × 70) `doPiso` para suspenso; `rodape`; `modulos` (padrão portas); `corpo`, `frente`, `puxador`, `aberto` |
| `prateleiras` (também `nicho`) | só em parede. `largura`, `profundidade` (30), `niveis` (lista: altura do **topo** de cada prateleira, do piso), `chapa` (3), `laterais`, `divisorias` (lista de posições ou número), `material`, `decor` (`potes`, `caixas`, `misto`). Não use `doPiso` |
| `estante` (também `torre`) | (70 × 40 × 200) `niveis` (alturas do piso), `chapa` (2.5), `laterais`, `tampo`, `fundo`, `material`, `itens` `[{ "nivel": 0, "tipo": "eletro", "modelo": "microondas" }]` |
| `eletro` | `modelo`: `geladeira`, `freezer-vertical`, `fogao`, `microondas`, `forno`, `airfryer`, `lava-roupas`, `lava-loucas`, `cafeteira`, `liquidificador`, `generico`. Medidas padrão por modelo; `material`; `dobradica`; `aberto` |
| `mesa` | (160 × 90 × 76) `tampo` ou `material`, `estrutura`, `redonda`, `pes: "central"` |
| `cadeira` | (45 × 48 × 90) `material`, `estofado`, `assento` |
| `banqueta` | (38 × 38 × 70) `material`, `estofado`, `estrutura` |
| `cama` | `tamanho`: `solteiro`, `casal`, `queen`, `king`; `estrutura`, `roupa`, `cabeceira` `{altura, material}` ou `false`. A cabeceira fica nas costas (lado da parede) |
| `sofa` | (220 × 92 × 85) `lugares`, `material` |
| `tv` | parede (123 × 71, `doPiso` 105) |

**Módulos** (`bancada` e `armario`), na ordem da planta. Módulo sem `largura` divide o que sobrar:

```json
{ "largura": 80, "tipo": "gavetas", "gavetas": 4 }
{ "tipo": "portas", "portas": 2, "prateleiras": 1 }
{ "tipo": "nicho", "prateleiras": [42], "cestos": true, "divisorias": 2 }
{ "largura": 60, "tipo": "vazio" }
```

`prateleiras` dentro do módulo: lista de alturas do piso ou um número (distribui por igual). `vazio` deixa o espaço livre (para lava-louças ou fogão).

**Cuba e cooktop** (`bancada`): `"cuba": { "daEsquerda": 95, "largura": 50, "profundidade": 40, "fundura": 18 }`, `"cooktop": { "daDireita": 20, "largura": 60, "bocas": 4 }`.

### Louças e banho

| `tipo` | Campos próprios |
|---|---|
| `vaso-sanitario` | (38 × 66 × 78) costas na parede |
| `lavatorio` | parede (46 × 38 × 86), `coluna: false` para suspenso |
| `tanque` | (60 × 52 × 86) |
| `box` | (120 × 90 × 190) `vidros`: lista com `frente` (vidro da frente, com porta de correr) e/ou as laterais `inicio` e `fim` (ordem da planta); `aberto` |
| `espelho` | parede (60 × 80, `doPiso` 100), `moldura` |

### Elétrica

| `tipo` | Campos próprios |
|---|---|
| `tomada` | `doPiso` (30), `modulos` (1 a 3 tomadas na placa), `amperagem` (10 ou 20), `uso`, `circuito`, `tensao` |
| `interruptor` | `doPiso` (110), `teclas` (1 a 3), `comanda` (lista de ids de luzes **do mesmo cômodo**) |

### Iluminação

| `tipo` | Onde | Campos próprios |
|---|---|---|
| `plafon` | teto | `diametro` (30), `quadrado`, `potencia` (W), `temperatura` (K), `sensor` |
| `spot` | teto | `diametro` (9), `potencia`, `temperatura`, `abertura` (graus do facho) |
| `pendente` | teto | `diametro` (32), `queda` (90), `material`, `potencia`, `temperatura` |
| `arandela` | parede (ponto) | `doPiso` (190), `potencia`, `temperatura` |
| `fita-led` | parede | `comprimento`, `doPiso`, `afastamento`, `potencia`, `temperatura` |

`"ligada": false` deixa a luz apagada ao abrir. Temperaturas comuns: 2700 e 3000 (quente), 4000 (neutra), 6500 (fria).

### Hidráulica

| `tipo` | Campos próprios |
|---|---|
| `ponto-agua` | `doPiso` (60), `agua`: `fria` ou `quente` |
| `ponto-esgoto` | `doPiso` (45), `diametro` em mm (50) |
| `registro` | `doPiso` (110) |
| `chuveiro` | `doPiso` (210) |
| `ralo` | no piso: `daEsquerda`/`daDireita` + `dosFundos`/`daFrente` |

### Decoração (não entra na conferência de colisão)

`objeto`, `tapete`, `quadro`, `planta`, `cesto`, `potes`, `revestimento` (placa de material numa parede: `parede`, posição, `largura`, `altura`, `doPiso`, `material`), `grelha`.

## 7. Portas, janelas e vãos (`dados/casa.json`, lista `aberturas`)

```json
{ "id": "P9", "tipo": "porta", "comodo": "despensa", "parede": "esquerda", "dosFundos": 35,
  "largura": 80, "altura": 210, "modelo": "lisa", "abrePara": "despensa", "dobradica": "frente",
  "material": "madeira-mel", "status": "definido" }
```

| Campo | Uso |
|---|---|
| `tipo` | `porta`, `janela` ou `vao` (abertura sem folha) |
| `comodo`, `parede` | a parede em que a abertura é medida |
| posição | `daEsquerda`/`daDireita` ou `dosFundos`/`daFrente`, até a borda do vão |
| `largura`, `altura` | medidas do vão |
| `peitoril` | só janela: altura do piso até a base |
| `modelo` | porta: `lisa`, `almofadada`, `ripada`, `vidro`, `correr`. Janela: `correr`, `basculante`, `veneziana`, `fixa` |
| `folhas` | 1 ou 2 |
| `abrePara` | id do cômodo para onde a folha abre |
| `dobradica` | ponta do vão onde fica a dobradiça |
| `lado`, `correPara` | só porta de correr: de que lado da parede ela corre e para que ponta |
| `estado` | `"fechada"` para começar fechada (o padrão é aberta) |
| `integrado` | só vão: `true` remove a parede inteira (piso contínuo, sem verga). Usado quando dois retângulos formam um mesmo cômodo, como o quarto suíte e a entrada da suíte |

A base da casa veio da planta de marcação. **Não mude cômodos nem aberturas sem o dono pedir explicitamente.**

## 8. Conferência automática

O site confere os dados sozinho (botão **Conferência**). Evite gerar estes problemas:

| Nível | O que acusa |
|---|---|
| Erro | id repetido ou ausente; `tipo` fora do catálogo; falta de posição; peça para fora do cômodo ou acima do forro; duas peças no mesmo espaço; peça na frente de porta, janela ou vão; interruptor que comanda luz inexistente |
| Aviso | peça no caminho da folha de uma porta; tomada escondida atrás de móvel; passagem menor que 60 cm; material inexistente; foto de textura não encontrada |
| Info | passagem entre 60 e 75 cm; luz sem interruptor |

Se uma peça fica **sobre** ou **dentro** de outra de propósito, informe `sobre` ou `dentroDe`. Sem isso, a conferência acusa colisão.

## 9. Quando o catálogo não basta

Uma peça com forma nova (ilha curva, cabeceira com desenho próprio, modelo de porta diferente) precisa de código novo em `motor/catalogo.js` ou `motor/esquadrias.js`. Isso é trabalho para um modelo forte, com o código do motor aberto. As peças são registradas com `reg('nome', { dimensoes, construir })` e desenhadas com caixas (`M.cx`) e cilindros (`M.cil`) em centímetros, no sistema local descrito no topo de `motor/montagem.js`. Uma IA que só edita dados **não** deve tentar isso.

## 10. Como o dono faz o pedido

O pedido pode trazer **referências tiradas da maquete**, neste formato: `na parede dos fundos do cômodo Cozinha, a 142 cm da esquerda e 110 cm do piso ["parede": "fundos", "daEsquerda": 142, "doPiso": 110]`. O trecho entre colchetes já está nos nomes de campo certos: use esses valores como estão. Para tomadas e pontos, o ponto indicado é o **eixo**; para móveis, pergunte se o ponto é a borda ou o centro, caso o dono não diga.

No site, o botão **IA** monta o pedido sozinho: o dono escreve o que quer, toca em **Copiar pedido para a IA** e cola na conversa. O texto copiado já traz este guia, as medidas do cômodo, as portas e janelas, os tipos e materiais que existem e o arquivo atual.

Depois ele cola a sua resposta no mesmo painel e toca em **Conferir antes de aplicar**.

Links úteis para mandar aos profissionais: `#cozinha/eletricista`, `#cozinha/gesseiro`, `#cozinha/pedreiro` no fim do endereço do site abrem o cômodo já na visão de cada um.
