---
name: extrator-roteiro
description: Use when a roteiro, script, story beat, Director chat, scene brief, or production note must be converted into a structured image frame list, environment requirements, detail plates, and reference bindings for the Imagen Director/Scenes pipeline.
---

# Extrator de Roteiro

Transforma roteiro bruto em instrucoes de producao para o Director: cenas, rascunho de prompt Seedance 2.0, frames de imagem estatica, referencias marcadas, ambientes necessarios, detail plates e planejamento multishot com imagens de referencia. Esta skill planeja. Ela nunca gera imagem nem video.

## Quando Usar

Use quando o usuario pedir para:

- quebrar roteiro em cenas, frames de imagem, keyframes estaticos ou storyboard;
- escrever um rascunho/preview do prompt Seedance 2.0 que a cena precisaria suportar;
- preparar o Director para gerar imagens/frame stills corretamente;
- extrair ambientes, props, personagens, referencias ou detail plates;
- produzir uma frame list consumivel por agentes de ambiente e geracao de imagem;
- preparar frames estaticos que depois possam virar um Seedance 2.0 multishot com references;
- organizar referencias marcadas da biblioteca Imagen (`characters`, `environment`, `objects`).

Nao use para gerar os assets finais. Para gerar ambientes, use `gerador-ambientes` depois que o manifesto estiver pronto.

## Principio

O Director deve controlar continuidade por contexto estruturado, nao por prompt solto. Cada frame deve ser uma imagem estatica completa e geravel por modelo de imagem. Cada frame deve carregar:

- funcao narrativa;
- plano e angulo de camera;
- ambiente e zona do ambiente;
- personagens e props;
- referencias vinculadas por ID/nome estavel;
- asset esperado: ambiente, detail plate, character reference, object reference ou image keyframe.

Nunca escreva a frame list como instrucao direta de video. Mas antes de decidir os frames, escreva um `seedancePromptPreview`: uma versao curta do prompt Seedance 2.0 multishot que a cena provavelmente usaria. Depois derive os frames de aprovacao necessarios para preencher as referencias desse prompt (`@image1`, `@image2`, etc.). A entrega final continua sendo para gerar imagens estaticas primeiro, e esses frames sao as referencias que vao alimentar uma geracao Seedance 2.0 multishot depois.

## Seedance 2.0 Mental Model

Quando a frame list puder virar video, leia e aplique a skill `seedance-cartoon` como referencia obrigatoria. O objetivo aqui nao e escrever o prompt final de video; e gerar o plano dos stills que serao usados como reference images no Seedance 2.0.

Fluxo mental obrigatorio:

1. Leia o beat/roteiro e as referencias.
2. Esboce como ficaria o prompt Seedance 2.0 multishot, em ingles, com `Shot 1`, `Shot 2`, tags `@imageN`, 16:9, estilo 3D polido e audio sem musica.
3. A partir desse prompt, liste quais imagens de referencia faltam para ele funcionar.
4. So entao gere a frame list de imagens estaticas para aprovacao.

Regra central: **quando o Director gerar os frames para aprovacao, cada image frame ja deve ser pensado como um asset de referencia para Seedance**, nao apenas como storyboard. O prompt de imagem deve produzir um still limpo, completo, consistente e forte o bastante para virar `@imageN` em uma geracao de video depois. Se o frame nao ajuda a travar identidade, ambiente, prop, composicao, key pose, continuidade ou mood, provavelmente ele deve ser removido ou fundido com outro frame.

Planeje como diretor de multishot:

- trate cada cena como uma sequencia de ate 5 shots principais, com labels `Shot 1`, `Shot 2`, etc. no planejamento de video;
- preserve uma ancora compartilhada entre shots: mesmo personagem, mesmo ambiente, mesma luz ou mesmo prop;
- mantenha uma acao principal por shot, convertida em frame estatico para `imageFramePrompt`;
- organize quando possivel do aberto para o fechado: establishing wide antes de medium, close-up e insert;
- repita tokens canonicos exatamente para identidade, roupa, prop, ambiente e luz;
- pense em quais stills virariam `@image1`, `@image2`, `@image3` no Seedance: personagem, ambiente, prop, estilo/mood ou keyframe;
- marque em cada frame o papel dele como referencia Seedance: `identity`, `environment`, `object`, `style_mood`, `opening_keyframe`, `shot_keyframe`, `continuity_callback` ou `not_for_seedance`;
- registre camera e ritmo apenas em `seedanceMultishotPlan`, nunca dentro de `imageFramePrompt`;
- para desenho animado 3D, mantenha 16:9, look polido de longa-metragem 3D, e audio sem musica conforme `seedance-cartoon`.

O Seedance 2.0 trabalha melhor quando as referencias sao explicitamente vinculadas no texto. Por isso, todo frame deve deixar claro se ele sera uma referencia futura, qual papel tera e qual tag sugerida (`@imageN`) deve receber. Todo plano de video deve chamar essas tags de forma explicita.

## Workflow

1. **Ler o roteiro como espectador**
   - Separe mudancas de local, tempo, objetivo dramatico ou acao principal em cenas.
   - Preserve a ordem narrativa. Nao reescreva a historia alem do necessario.

2. **Rascunhar o Seedance primeiro**
   - Antes da frame list, escreva `seedancePromptPreview` para cada cena com potencial de video.
   - Use ingles, estrutura multishot, `@imageN`, 16:9 e audio sem musica conforme `seedance-cartoon`.
   - Este preview nao precisa ser o prompt final perfeito; ele serve para revelar quais reference images a cena precisa.
   - Inclua `referenceImageNeeds`: quais imagens precisam existir para o prompt funcionar, quais ja existem, quais virao dos approval frames, e quais devem usar imagem filha especifica de grupo.

3. **Quebrar cada cena em frames de imagem**
   - Use wide para geografia, medium para interacao, close-up para emocao/detalhe, insert/detail para objetos.
   - Divida momentos complexos em frames menores. Um frame deve ter uma acao visual principal congelada em um instante claro.
   - Cada frame precisa funcionar como imagem final: composicao, assunto, expressao, pose, ambiente e referencias devem estar completos.
   - O prompt principal deve ser sempre de imagem estatica, mas adaptado para gerar um frame de aprovacao que tambem funcione como reference image para Seedance.
   - Se o frame servira Seedance, escreva o `imageFramePrompt` como reference-grade still: sujeito legivel, pose-chave clara, fundo sem ambiguidade, continuidade visual travada e sem elementos extras.
   - Cada frame deve resolver uma necessidade concreta do `seedancePromptPreview`, nao apenas ilustrar o roteiro.
   - Registre o papel Seedance do frame no proprio frame e no planejamento multishot, sem colocar movimento no prompt de imagem.

4. **Classificar cada frame**
   - `establishing`: mostra o espaco.
   - `coverage`: cobre acao/interacao.
   - `reaction`: expressao ou resposta.
   - `insert`: close de objeto, mao, porta, tela, mochila etc.
   - `transition`: conecta cenas ou deslocamentos.

5. **Extrair assets**
   - Ambientes: locais unicos que precisam existir antes dos keyframes.
   - Angulos de ambiente: apenas os angulos realmente exigidos pela frame list, mais `master_wide` quando o local for novo.
   - Detail plates: closes de elementos do ambiente ou props que precisam de referencia propria.
   - Object references: props recorrentes ou hero props.
   - Character references: personagens recorrentes, roupa, pose/base identity.

6. **Resolver referencias marcadas**
   - Preserve `@mentions` exatamente quando existirem.
   - Quando uma referencia da biblioteca for conhecida, registre `referenceKind: "saved_reference"` e mantenha `referenceId`, `category`, `title` e `description`.
   - Quando a referencia for um grupo com varias imagens, registre como grupo e selecione a imagem filha especifica que melhor ancora cada frame.
   - Para grupos como `Garagem` com 14 imagens, nunca passe apenas "Garagem" quando um angulo/imagem especifica for importante. Declare `parentRefKey`, `selectedImageId` ou `selectedImageIndex`, titulo/descricao da imagem escolhida, e motivo da escolha.
   - Quando o usuario anexar imagem sem ID de biblioteca, registre `referenceKind: "uploaded_attachment"` e marque como `unresolved` ate ser salva.
   - Nunca substitua ID por descricao. Descricao ajuda prompt; ID escolhe asset.

### Selecionar imagem dentro de grupo de referencia

Use isto sempre que uma referencia salva representa um conjunto, album, ambiente com cobertura, character sheet com multiplas poses, prop com variantes, ou qualquer grupo com mais de uma imagem.

Exemplo: se existe `@Garagem` com 14 imagens e o frame precisa da area do portao lateral, o Director deve registrar a selecao exata:

- grupo pai: `env-garagem`;
- imagem filha: `selectedImageId` se existir; senao `selectedImageIndex`;
- titulo/descricao curta: `Garagem - portao lateral aberto`;
- uso no frame: `environment_anchor`, `angle_match`, `detail_plate_source`, `seedance_reference` etc.;
- motivo: por que essa imagem e a melhor referencia para o frame.

Essa selecao deve aparecer no frame, no manifesto quando afetar ambiente/detail plate, e no `seedanceMultishotPlan.referenceSlots` quando a imagem filha virar `@imageN`. O agente de geracao de frames deve receber a imagem filha exata, nao o grupo inteiro, quando houver uma selecao especifica.

7. **Planejar Seedance multishot**
   - Crie `seedanceMultishotPlan` por cena quando houver potencial de video.
   - Inclua o `seedancePromptPreview` que guiou a escolha dos frames.
   - Inclua `referenceImageNeeds` antes de `referenceSlots`: primeiro o que o prompt precisa, depois quais assets/frames vao preencher cada necessidade.
   - Liste `referenceSlots` em ordem de upload sugerida (`@image1`, `@image2`...), com papel e asset/frame correspondente. Esses slots devem apontar para os frames/assets que esta skill mandou gerar como referencias.
   - Liste `shots` com `shotNumber`, `sourceFrameIds`, `sharedAnchor`, `videoBeat`, `cameraIntent`, `referenceTags` e `audioCue`.
   - Mantenha 12-15s para multishot completo e 16:9. Se a cena for curta, marque como `single_shot_candidate`.
   - Nao escreva o prompt final completo salvo se o usuario pedir; escreva um `videoPromptBrief` curto e estruturado.

8. **Gerar saidas**
   - Saida humana: frame list em Markdown, facil de revisar.
   - Saida de maquina: JSON no contrato da referencia.
   - Manifesto: ambientes + detail plates + props/personagens faltantes.
   - Planejamento Seedance: prompt preview, necessidades de imagens de referencia, referencias, shots, ancora de continuidade e brief de prompt.
   - Handoff de geracao: inclua uma instrucao explicita para o proximo agente carregar as skills necessarias antes de gerar imagens.

## Geracao Dinamica

A quantidade de frames deve seguir a necessidade da leitura visual:

- Cena simples de chegada/saida: 2-4 frames.
- Acao com interacao e objeto importante: 4-7 frames.
- Cena de revelacao, perseguição, transformacao ou humor fisico: 6-10 frames.
- Nao force sempre o mesmo numero. Gere o minimo que preserve geografia, continuidade e leitura visual.

Para cada ambiente novo:

- sempre inclua `master_wide`;
- inclua `frontal_medio`, `lateral_esq`, `lateral_dir`, `reverso`, `camera_alta` somente se a cobertura pedir;
- crie `zona_N` para areas usadas em inserts ou closes.

Para detail plates:

- crie quando o frame for close/insert de elemento que precisa manter desenho consistente;
- associe sempre ao ambiente pai ou ao object reference;
- especifique qual angulo/area de ambiente servira de referencia.

## Regras de Continuidade

- Use nomes canonicos e estaveis para personagens, ambientes e props.
- Se o mesmo local aparece em cenas diferentes, use o mesmo `environmentId`.
- Nao invente uma nova versao de um ambiente se uma referencia marcada ja define o local.
- Se uma referencia marcada for um grupo de imagens, escolha a imagem filha mais especifica para cada frame/angulo antes de montar o prompt. Use o grupo apenas como fallback quando o frame realmente precisa da colecao inteira.
- Prompts de frames devem ser prompts de imagem estatica. Nao use verbos de video como "animar", "camera moves", "tracking shot", "pan" ou "duration".
- Prompts de frames devem comecar com a ancora: personagem + ambiente/detail plate + acao visual congelada.
- Se a acao implicar movimento, descreva o instante visivel: pose, gesto, direcao do olhar, objeto em posicao, expressao e composicao.
- Evite dialogue/texto dentro de prompt de imagem; registre falas em notes quando necessario.
- Frames destinados ao Seedance devem ser gerados para aprovacao como references, nao como thumbnails vagos: sem composicao ambigua, sem personagem cortado por acidente, sem prop fora de quadro quando o prop precisa ser travado.
- Se houver plano Seedance, mantenha a linguagem de video separada em `seedanceMultishotPlan`.
- Em `seedanceMultishotPlan`, use estrutura de shot list, tags `@imageN`, uma acao por shot, camera clara, audio/SFX ambiente e notas globais no fim.

## Contrato de Saida

Para o schema JSON completo, leia `references/output-contract.md`.

A resposta final deve conter:

1. `Seedance prompt preview` em Markdown quando aplicavel.
2. `Reference images needed` em Markdown quando aplicavel.
3. `Frame list` em Markdown.
4. `Manifesto de assets` em Markdown.
5. `Seedance multishot plan` em Markdown quando aplicavel.
6. Bloco JSON `production_plan` seguindo o contrato.

Se faltar uma referencia obrigatoria, nao pare. Marque em `unresolvedReferences` e continue com uma recomendacao objetiva.

## Handoff

Ordem correta no harness:

```text
extrator-roteiro
  -> frame list + manifesto
gerador-ambientes
  -> ambientes + detail plates
keyframes / image frames
  -> gera imagens estaticas usando frame list + assets gerados + referencias marcadas
Seedance 2.0 opcional
  -> monta multishot com reference images a partir dos frames e assets aprovados
```

O extrator deve deixar claro qual asset cada frame de imagem espera usar, para o agente de keyframes/imagem nao precisar adivinhar.
Se esse asset vier de um grupo de referencias, o extrator deve passar a imagem filha selecionada com ID/indice/titulo, nao apenas o nome do grupo.
Quando houver handoff para Seedance, o extrator tambem deve deixar claro quais frames/assets viram `@imageN` e quais shots usam cada tag.

Sempre inclua no handoff uma frase imperativa para o proximo agente:

```text
Antes de gerar os frames de aprovacao, carregue/use `seedance-cartoon` para entender como esses stills vao funcionar como reference images de um Seedance 2.0 multishot, e carregue/use a skill/ferramenta de geracao de imagem disponivel para criar os stills finais. Gere cada frame como imagem estatica reference-grade, nao como prompt de video.
```

Se o ambiente tiver uma skill especifica de keyframes/imagem, cite o nome dela tambem. Se nao tiver, cite `imagegen`/ferramenta de imagem disponivel.
