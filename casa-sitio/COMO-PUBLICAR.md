# Como publicar a maquete no VPS

A pasta `casa-sitio/` é o site inteiro. Há dois jeitos de colocar no ar.

| | Jeito A — com o servidor da maquete (recomendado no VPS) | Jeito B — site estático |
|---|---|---|
| O que precisa | Node 18 ou mais novo | qualquer servidor web (Nginx, Apache, hospedagem comum) |
| Senha para abrir | sim | não (só se você configurar no seu servidor web) |
| Salvar pelo site | sim, com histórico | não: o site baixa o arquivo e você envia |
| Foto de textura pelo site | sim | não: o site prepara a foto e você envia |

Os comandos abaixo supõem um VPS Linux (Ubuntu ou Debian) com acesso por terminal. Não conheço a configuração do seu VPS; se ele usa painel, os passos são os mesmos, feitos pelas telas do painel.

## Jeito A — servidor da maquete

1. Envie a pasta para o VPS, por exemplo em `/var/www/casa-sitio` (suba o `.zip` pelo gerenciador de arquivos e extraia).
2. Confira o Node: `node -v` (precisa mostrar 18 ou mais). Se não houver: `sudo apt install nodejs`.
3. Teste:

   ```bash
   cd /var/www/casa-sitio
   SENHA="senha-para-abrir" SENHA_EDICAO="senha-para-editar" PORTA=8080 node servidor.js
   ```

   Abra `http://IP-DO-VPS:8080`. Usuário: qualquer um (por exemplo `casa`). Senha: a de `SENHA`.

4. Deixe rodando sempre, com um serviço do sistema. Crie `/etc/systemd/system/casa-sitio.service`:

   ```ini
   [Unit]
   Description=Maquete Casa do Sitio
   After=network.target

   [Service]
   WorkingDirectory=/var/www/casa-sitio
   ExecStart=/usr/bin/node servidor.js
   Environment=PORTA=8080
   Environment=SENHA=senha-para-abrir
   Environment=SENHA_EDICAO=senha-para-editar
   Restart=always
   User=www-data

   [Install]
   WantedBy=multi-user.target
   ```

   Depois:

   ```bash
   sudo chown -R www-data:www-data /var/www/casa-sitio
   sudo systemctl enable --now casa-sitio
   ```

5. Ligue ao seu domínio com HTTPS. No Nginx do site, acrescente:

   ```nginx
   location /casa/ {
       proxy_pass http://127.0.0.1:8080/;
       client_max_body_size 8m;
   }
   ```

   A maquete fica em `https://seudominio.com/casa/` (com a barra no fim).

**Use HTTPS.** Sem ele, as senhas trafegam abertas.

### As três variáveis

| Variável | Efeito |
|---|---|
| `PORTA` | porta do servidor (padrão 8080) |
| `SENHA` | senha para **abrir** a maquete. Sem ela, qualquer pessoa com o link vê |
| `SENHA_EDICAO` | senha para **salvar** e enviar texturas pelo site. Sem ela, o site só mostra |

Sugestão: dê a `SENHA` aos profissionais e guarde a `SENHA_EDICAO` só com você.

### O que o servidor grava

- `dados/comodos/<comodo>.json` quando você toca em **Salvar no servidor**. A revisão sobe sozinha.
- `historico/<comodo>/<data-hora>.json`: cópia da versão anterior a cada salvamento. Para voltar atrás, copie o arquivo do histórico de volta para `dados/comodos/`.
- `texturas/<nome>.jpg` e uma linha nova em `dados/materiais.json` quando você cria uma textura por foto.

O servidor só entrega `index.html`, `motor/`, `vendor/`, `dados/`, `texturas/` e o `LEIA-ME-IA.md` (o site o inclui no pedido para a IA). O histórico, o `servidor.js` e os guias não ficam acessíveis pelo navegador.

## Jeito B — site estático

Envie a pasta para qualquer lugar servido pelo seu servidor web e abra o endereço. Tudo funciona para visualizar. No modo de edição, o site oferece **Baixar <comodo>.json**; envie esse arquivo para `dados/comodos/`, substituindo o antigo.

A página não abre com duplo clique no `index.html`: precisa ser servida por `http://` ou `https://`.

## Testar no seu computador

```bash
cd casa-sitio
SENHA_EDICAO=teste node servidor.js
```

Abra `http://localhost:8080`.

## Como atualizar a casa

| Você quer | Faça |
|---|---|
| Ajustar medidas vendo o resultado | no site: **Editar**, toque na peça, mude os números, **Salvar no servidor** |
| Lançar ou mudar peças por prompt | no site: abra o cômodo, botão **IA**, **Copiar pedido para a IA**, cole no ChatGPT; depois cole a resposta, **Conferir antes de aplicar**, **Aplicar** e **Salvar no servidor** |
| Voltar atrás | **Desfazer** (Ctrl+Z) antes de salvar; depois de salvar, a versão anterior está em `historico/` |
| Usar uma foto como textura | no site: **Editar → Nova textura por foto** |
| Mudar porta, janela ou cômodo | edite `dados/casa.json` |

Depois de trocar um arquivo, recarregue a página. Erros de digitação no JSON aparecem na tela com o nome do arquivo.

## Links para os profissionais

Acrescente ao fim do endereço:

| Link | Abre |
|---|---|
| `#cozinha` | a cozinha, visão completa |
| `#cozinha/eletricista` | tomadas, interruptores e luzes, com etiquetas |
| `#cozinha/gesseiro` | forro e pontos de luz |
| `#cozinha/pedreiro` | paredes, vãos, elétrica e hidráulica, sem móveis |

Os nomes dos cômodos são os `id` de `dados/casa.json`: `closet`, `suite`, `banho-suite`, `suite-entrada`, `banho-social`, `corredor`, `quarto2`, `quarto1`, `cozinha`, `jantar`, `estar`, `lavanderia`, `despensa`, `varanda-lateral`, `varanda-frente`.
