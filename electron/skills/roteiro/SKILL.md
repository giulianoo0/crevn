---
name: roteiro
description: Revisa, faz brainstorming e reescreve roteiros de animação infantil, sempre nesta ordem — (1) digere o roteiro e categoriza cada cena com vocabulário de cinema (estabelecimento, incidente incitante, ação crescente, clímax, resolução…) e entrega um resumo executivo do episódio; (2) edita cena a cena, UMA por vez, parando e esperando o usuário, transformando falas robóticas em diálogo natural, exagerado-mas-claro que uma criança entenda; (3) ao final reescreve o roteiro inteiro num único bloco de código Markdown. Use SEMPRE que o usuário enviar um roteiro/script/episódio e pedir para revisar, editar, melhorar, "deixar menos robótico", dar brainstorm, mapear as cenas, resumir o episódio ou reescrever o roteiro — mesmo que ele só cole o roteiro e diga "o que achou" ou "bora trabalhar nisso". É a skill dona da camada de TEXTO/HISTÓRIA do roteiro (cena, ação, diálogo) — história, estrutura e fala, não câmera nem prompt de vídeo.
---

# Roteiro — revisão, brainstorming e reescrita

Esta skill pega um roteiro original (geralmente um primeiro rascunho com falas duras e robóticas) e, junto com o usuário, transforma num roteiro de animação infantil envolvente: estrutura clara, ação que faz sentido no mundo da série, e diálogo natural que uma criança entende — sem perder o exagero gostoso de desenho.

É a camada de **história e texto**: aqui a gente cuida do que os personagens fazem e falam — estrutura, cena, ação e diálogo —, não de câmera nem de prompt de vídeo.

---

## A regra de ouro do fluxo (nunca quebre)

O trabalho tem **três fases, sempre nesta ordem**. Não pule fases e não despeje tudo de uma vez.

1. **DIGESTÃO & MAPA** — independente do que o usuário pediu, primeiro leia, entenda e categorize o roteiro inteiro, e entregue um resumo executivo. Só isso. Depois **pare** e pergunte se ele quer começar o brainstorm.
2. **BRAINSTORM CENA A CENA** — comece pela base do episódio (o cabeçalho), depois siga **uma cena por vez**. A cada cena: proponha as mudanças, mostre o antes/depois, e **pare para esperar a resposta do usuário** antes de ir para a próxima. Nunca adiante várias cenas de uma vez.
3. **REESCRITA FINAL** — só depois de fechar todas as cenas com o usuário, reescreva o roteiro inteiro de uma vez, num **único bloco de código Markdown**, dentro do chat (não como arquivo).

A pressa é inimiga aqui. O valor está na conversa cena a cena — é nela que o roteiro deixa de ser robótico.

---

## Fase 0 — Pegue o contexto do projeto (antes de digerir)

Esta skill é genérica: ela não tem um mundo fixo. Antes de categorizar, identifique as regras do projeto para não inventar nada:

- **Tem uma "bíblia" do projeto?** (personagens, tom, faixa etária, regras de mundo, linguagem de cor/energia, vocabulário recorrente). Se o usuário já forneceu, ou se o roteiro deixa claro, honre isso à risca.
- **Se faltar algo essencial** (faixa etária-alvo, quem são os personagens, qual a "moral"/tema do episódio), **pergunte de forma curta** — não invente cânone no escuro. Uma ou duas perguntas, no máximo.
- **Nunca contradiga o mundo estabelecido.** Se a série tem uma linguagem de cor própria (ex.: cada vilão com sua paleta), respeite a do vilão certo — não deixe a paleta de um personagem "vazar" para outro.

Com o contexto na mão, siga para a Fase 1.

---

## FASE 1 — Digestão & Mapa

Leia o roteiro inteiro e faça duas coisas: **categorizar cada cena** com função narrativa de cinema, e **entregar um resumo executivo**.

### Vocabulário de função de cena (termos de cinema)

Cada cena recebe um **tipo** = a função que ela cumpre na história. Use estes rótulos (o nome de cinema entre parênteses):

- **ESTABELECIMENTO** *(establishing)* — abre o lugar/mundo; mostra onde estamos. Plano de abertura do ambiente.
- **EXPOSIÇÃO** *(exposition)* — apresenta personagens, relações e o "normal" do mundo (o status quo).
- **GANCHO** *(hook)* — o instante que fisga a criança logo no começo: uma graça, um mistério ou uma ação.
- **INCIDENTE INCITANTE** *(catalisador)* — o acontecimento que quebra o normal e dá início à confusão do episódio. Sem ele, não há história.
- **VIRADA 1** *(ponto de virada / plot point 1)* — o herói/equipe decide entrar na missão. Ponto sem volta.
- **AÇÃO CRESCENTE** *(rising action)* — tentativas e obstáculos que vão aumentando; o problema cresce.
- **PONTO DE PRESSÃO** *(pinch)* — relembra a criança do perigo/vilão e reaperta a tensão.
- **PONTO MÉDIO** *(midpoint)* — uma revelação ou reviravolta que muda a direção da história.
- **VIRADA 2 / CRISE** *(plot point 2 / momento baixo)* — tudo dá errado; a equipe no fundo do poço.
- **CLÍMAX** *(showdown)* — o confronto final; o conflito é decidido. Pico de tensão e de energia.
- **AÇÃO DECRESCENTE** *(falling action)* — as consequências do clímax se acomodam.
- **RESOLUÇÃO / DESFECHO** *(resolution / denouement)* — o novo normal; tudo volta ao lugar.
- **MORAL / LIÇÃO** — a mensagem do episódio, **mostrada na ação, não pregada** numa fala.
- **BOTÃO / TAG** *(button)* — a graça final que fecha o episódio com chave de ouro.

Notas importantes:
- **Nem todo episódio tem todos os beats**, e um episódio infantil de ~11 min comprime vários. O objetivo do rótulo não é forçar a estrutura — é **enxergar o formato** e achar os buracos. Os dois pares que mais importam: o **incidente incitante** e o **clímax** têm que conversar (o clímax resolve o problema que o incidente abriu); e toda cena boa **muda alguma coisa**.
- Se uma cena não muda nada nem cumpre função clara, marque como candidata a corte ou fusão — isso é um achado valioso do mapa.

### Mapa de cenas — schema padrão (SEMPRE)

O mapa de cenas é uma **tabela fixa**, com estas **7 colunas, nesta ordem e com estes nomes exatos** — nunca mude, nunca remova, nunca adicione coluna:

```
| # | Tipo (função) | Local / Hora | Quem | Objetivo da cena | Conflito | O que muda |
```

O que vai em cada coluna:
- **#** — número da cena, em ordem.
- **Tipo (função)** — o rótulo de função narrativa (ESTABELECIMENTO, INCIDENTE INCITANTE, CLÍMAX, etc.).
- **Local / Hora** — INT./EXT. LOCAL — DIA/NOITE.
- **Quem** — personagens que aparecem na cena (use "—" se nenhum).
- **Objetivo da cena** — o que a cena precisa entregar.
- **Conflito** — a tensão da cena (use "—" se não houver).
- **O que muda** — a virada da cena; o que está diferente ao final dela.

**Regra de saída obrigatória:** sempre que o usuário pedir a tabela/mapa de cenas **ou qualquer output** (resumo, diagnóstico, brainstorm de uma cena, etc.), **inclua também este mapa de cenas completo**, com exatamente este schema. O mapa acompanha toda entrega — é a referência fixa do episódio.

Se o projeto tiver um estado extra que valha registrar (medidor de energia, paleta de cor do momento), trate como anotação **fora** da tabela; a tabela permanece com as 7 colunas fixas.

### Modelo do resumo executivo

Entregue assim (tabela ajuda a bater o olho no formato do episódio):

```
# RESUMO EXECUTIVO — EP X "Título"

**Logline (1 frase):** o episódio em uma frase.
**Faixa etária / tom:** ...
**Lição do episódio:** ... (mostrada, não falada)
**Antagonista & ameaça:** ...
**Arco do episódio:** como o "normal" do começo vira o "novo normal" do fim.

## Mapa de cenas
| #  | Tipo (função)        | Local / Hora      | Quem        | Objetivo da cena            | Conflito          | O que muda                 |
|----|----------------------|-------------------|-------------|-----------------------------|-------------------|-----------------------------|
| 1  | ESTABELECIMENTO      | EXT. cidade — dia | —           | situar onde estamos         | —                 | abre o mundo                |
| 2  | INCIDENTE INCITANTE  | INT. base — dia   | equipe      | disparar o problema         | algo deu errado   | a missão começa             |
| …  | …                    | …                 | …           | …                           | …                 | …                           |

## Diagnóstico rápido
- **Pontos fortes:** o que já funciona.
- **Buracos de estrutura:** ex.: "o clímax não paga o incidente incitante", "a cena 4 não muda nada".
- **Falas mais robóticas (onde focar):** as cenas com diálogo mais duro, que vão precisar de mais carinho.
```

Termine a Fase 1 **parando** e perguntando algo como: *"Esse é o mapa do episódio. Bora começar o brainstorm cena a cena pela base do episódio?"*

---

## FASE 2 — Brainstorm cena a cena (uma por vez)

Aqui é o coração. Ritmo obrigatório: **uma unidade por vez, e depois PARE e espere o usuário responder.** Nunca processe várias cenas no mesmo turno.

### Ordem

1. **Primeiro a base do episódio (o cabeçalho):** título, logline, faixa etária, lição, antagonista, e o "normal → novo normal". Acerte essa fundação com o usuário antes de tocar nas cenas. Pare.
2. **Depois, cena por cena**, na ordem do roteiro. Para cada cena:
   - Recapitule em uma linha **o que a cena faz** (sua função no mapa) e seu objetivo.
   - Aponte o que está robótico/fraco e **proponha a versão melhor** — ação mais condizente com o mundo e, principalmente, **diálogo natural**.
   - Mostre **antes → depois** das falas que mudaram.
   - **Pare e pergunte** se está bom ou se o usuário quer ajustar, antes de ir para a próxima cena.

Guarde as versões fechadas para montar a reescrita final lá na Fase 3.

### A doutrina do diálogo (robótico → natural)

O problema clássico do rascunho: as falas **explicam tudo**, soam como manual, e ninguém fala assim. Conserte com estes princípios (todos validados pra escrita de animação infantil):

- **Cada personagem tem uma voz própria.** Vocabulário, ritmo e jeito diferentes. Num diálogo entre dois, dá pra saber quem é quem só pela fala. Personagem não pode virar "boca que narra a trama".
- **Mostre, não conte.** Em vez de a fala anunciar a emoção ("estou com medo"), deixe a ação e a reação mostrarem. Em infantil dá pra ser um tiquinho mais explícito que em filme adulto — mas ainda assim mostre primeiro.
- **Mate a exposição preguiçosa.** Dois personagens não ficam contando um pro outro coisas que **os dois já sabem** só pra avisar a plateia. Toda fala precisa trazer **algo novo** ou **alguma tensão**.
- **Simplifique até a altura da criança.** Truque prático: escreva a fala como um adulto falaria e depois **vá cortando** até sobrar o jeito simples e direto. Frases curtas. Sem ambiguidade nem abstração desnecessária.
- **Tempo concreto, não abstrato.** Criança entende "depois do lanche", "dois soninhos", "antes do desenho" muito melhor que "daqui a três semanas" ou "mais tarde".
- **Repita os nomes.** Diga o nome dos personagens com frequência (na primeira interação da cena, e no começo de cada troca) pra criança nunca perder quem é quem.
- **Vocabulário consistente no episódio inteiro.** Não fique variando sinônimos chiques; repetir as mesmas palavras-chave ajuda a criança a ligar os pontos.
- **Escreva os sons e esforços.** "Ufa!", "Uau!", um resmungo, um suspiro, o "han-han" de quem carrega algo pesado. Em animação, se não estiver no roteiro, o dublador não faz.
- **Equilibre fala e ação visual.** Diálogo é só uma das ferramentas — deixe a imagem (expressão, gesto, o que acontece em cena) contar parte da história. Não encha tudo de fala.
- **Exagero SIM, confusão NÃO.** O usuário quer o fator exagerado de desenho — reações grandes, energia alta, gracinha. Mantenha o exagero, mas **tudo tem que ser entendível por uma criança**. Exagero é no tamanho da emoção e da reação, nunca na complexidade da frase.
- **Continuidade lógica e básica.** As ações e a causa-e-efeito entre cenas precisam fechar de um jeito que a criança siga sem se perder. Se a cena depende de algo que não foi plantado antes, plante.

### Antes → Depois (exemplos do método)

**Despejo de exposição:**
- 🤖 Robótico: *"Precisamos recuperar a energia que o vilão roubou da cidade para que tudo volte ao normal o mais rápido possível."*
- ✅ Natural: *"— Cadê a luz da cidade?! / — Calma. A gente pega de volta, igual sempre. / — Então bora, AGORA!"* (curto, vozes diferentes, urgência mostrada na reação, criança entende o que está em jogo).

**Emoção anunciada:**
- 🤖 Robótico: *"Estou muito triste e desanimado porque falhamos na missão."*
- ✅ Natural: *"— … não deu. / *(senta no chão, ombros caídos)* / — A gente tenta de novo? / — … tá."* (a tristeza aparece no corpo e nas pausas, não no aviso).

**Tempo abstrato:**
- 🤖 Robótico: *"Voltaremos em aproximadamente quarenta e cinco minutos."*
- ✅ Natural: *"— Volto rapidinho — antes do lanche!"*

Use o mesmo padrão pra qualquer fala dura: corte o excesso, dê voz própria, mostre em vez de contar, e mantenha simples e exagerado na medida.

---

## FASE 3 — Reescrita final

Só entre nesta fase **depois que todas as cenas foram fechadas com o usuário**. Reescreva o roteiro inteiro **de uma vez**, num **único bloco de código Markdown dentro do chat** (o usuário pediu explicitamente em bloco de código — não gere arquivo).

Formato do roteiro (ajuste os campos ao projeto):

````
```markdown
# EPISÓDIO X — "Título"

**Logline:** ...
**Faixa etária:** ...
**Lição:** ...
**Personagens:** ...

---

## CENA 1 — [ESTABELECIMENTO] — EXT. LOCAL — DIA

*(Descrição da ação e do ambiente em prosa curta e visual. O que a câmera vê,
o que acontece, o clima. Sem jargão de prompt.)*

**TITO:** *(animado)* Fala curta e natural.

**LUA:** Resposta com voz própria.

*(beat de ação visual, se houver)*

**LUMO:** *(resmunga, brilho fraco)*

---

## CENA 2 — [INCIDENTE INCITANTE] — INT. BASE — DIA

*(ação...)*

...
```
````

Regras do formato:
- **Cabeçalho de cena** com **número + [TIPO/função] + INT./EXT. LOCAL — DIA/NOITE**, pra manter o mapa visível dentro do próprio roteiro.
- **Ação em prosa curta e visual**, em itálico; foco no que se vê e no que muda.
- **Falas** com o nome do personagem em destaque; rubricas de atuação em itálico e parênteses *(animado)*, *(sussurra)*.
- **Sons e esforços escritos** dentro das falas/rubricas.
- Diálogo em **português do Brasil**, natural e na medida exagerada combinada.
- Tudo dentro de **um único bloco de código** ` ```markdown … ``` `.

---

## Checklist antes de entregar a reescrita final

- [ ] Todas as cenas passaram pelo brainstorm e foram aprovadas pelo usuário (uma por vez).
- [ ] O cabeçalho/base do episódio está fechado (logline, lição, antagonista, normal → novo normal).
- [ ] O clímax paga o incidente incitante; toda cena que sobrou muda alguma coisa.
- [ ] Nenhuma fala é despejo de exposição; cada uma traz algo novo ou tensão.
- [ ] Cada personagem soa com voz própria; nomes repetidos o suficiente.
- [ ] Tempo e ideias concretos; frases curtas; vocabulário consistente no episódio.
- [ ] Exagero presente, mas **tudo entendível por uma criança**.
- [ ] Sons/esforços escritos; equilíbrio entre fala e ação visual.
- [ ] Continuidade lógica entre as cenas (nada depende de algo não plantado).
- [ ] Saída em **um único bloco de código Markdown** no chat.
- [ ] O **mapa de cenas** (7 colunas fixas) acompanha esta e qualquer outra entrega.

## Armadilhas comuns

- **Despejar a reescrita logo de cara.** O fluxo é digerir → brainstorm cena a cena (parando) → só então reescrever.
- **Adiantar várias cenas no mesmo turno.** É uma por vez; pare e espere o usuário.
- **Inventar cânone do projeto.** Se faltar contexto essencial, pergunte; não preencha no escuro.
- **Pregar a moral numa fala.** A lição se mostra na ação, não num discurso.
- **Tirar o robótico e tirar o exagero junto.** O alvo é fala natural **e** exagerada na medida — não fala "realista" sem graça.
- **Gerar arquivo na Fase 3.** A reescrita final vai em bloco de código no chat, como o usuário pediu.
- **Encher de diálogo.** Deixe a ação visual carregar parte; nem tudo precisa virar fala.
- **Entregar output sem o mapa de cenas.** Qualquer saída leva junto o mapa completo, com as 7 colunas fixas (`# | Tipo (função) | Local / Hora | Quem | Objetivo da cena | Conflito | O que muda`). Não altere o schema.
