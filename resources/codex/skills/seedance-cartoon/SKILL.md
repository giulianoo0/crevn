---
name: seedance-cartoon
description: 'Gera prompts de vídeo 3D cartoon DreamWorks polished animation para Seedance 2.0 (Higgsfield ou via Kling 3.0). Use sempre que o usuário quiser vídeos animados 3D com qualidade de longa-metragem — renderização polida, proporções semi-realistas, iluminação cinematográfica, detalhe tátil de superfície. Ativa para pedidos como "faz animado", "estilo cartoon", "3D cartoon", "DreamWorks style", "parece filme de animação", "colorido e divertido", pedidos de prompt de vídeo para cenas de animação 3D, ou pedidos de multishot/multi-cena/sequência de cenas. Os prompts SEMPRE saem em inglês, sempre 16:9, sempre qualidade DreamWorks 3D polished animation, e sempre SEM MÚSICA (apenas efeitos sonoros e ambiente). Use em combinação com ai-animation-keyframes quando o projeto tiver personagens definidos (ex: Liga da Energia).'
---

# Seedance 2.0 — Gerador de Prompts 3D Cartoon DreamWorks Polished Animation

Guia completo para criar prompts de vídeo 3D cartoon DreamWorks polished animation para Seedance 2.0 (plataforma Higgsfield) e Kling 3.0. Foco exclusivo em animação 3D de longa-metragem com multishot (múltiplas cenas em uma geração) usando reference images.

---

## ⚠️ REGRAS ABSOLUTAS (aplicar SEMPRE, sem exceção)

Toda geração desta skill deve obedecer a estas quatro regras fixas:

1. **PROMPT EM INGLÊS.** O prompt final entregue ao usuário é sempre escrito em inglês — Seedance e Kling respondem melhor a inglês. As explicações ao usuário podem ser em português, mas o bloco de prompt é inglês.

2. **SEMPRE 16:9.** Toda geração é landscape 16:9. Nunca 9:16, 1:1 ou outro. Incluir `16:9` nas notas técnicas globais.

3. **DREAMWORKS 3D POLISHED ANIMATION.** O look é exclusivamente animação 3D estilo DreamWorks — renderização polida de longa-metragem, proporções semi-realistas, iluminação cinematográfica motivada, detalhe tátil de superfície, cabelo volumoso e detalhado, pele com subsurface scattering suave. Este é o ÚNICO estilo suportado. Usar o anchor de estilo abaixo em todo prompt. **Nunca** escrever literalmente "Pixar-style" ou outro estúdio dentro do prompt; descrever as qualidades. (DreamWorks é a referência mental — no texto do prompt, traduzir em qualidades visuais.)

4. **SEM MÚSICA.** Sempre fechar com instrução de áudio explícita: apenas efeitos sonoros e som ambiente, nenhuma trilha musical. Música entra em pós-produção.

### Style anchor (colar no fim de TODO prompt, em inglês)

> *Polished 3D feature-animation look, semi-realistic proportions, tousled detailed hair, warm-undertone skin with soft subsurface scattering, expressive proportionate eyes with clean catchlights, tactile fabric and material detail, composed cinematic lighting with motivated key sources, faint volumetric atmosphere, 16:9.*

### Bloco de áudio padrão (colar no fim de TODO prompt, em inglês)

> *Audio: no music, no background score. Sound effects and ambient only — [list specific SFX/ambience].*

### Banidos no prompt (puxam para defaults genéricos / quebram o look)

`photorealistic`, `realistic photo`, `DSLR`, `8k photograph`, `anime`, `cel-shaded`, `2D`, `hand-drawn`, `pixel art`, `stop-motion`, `claymation`, `watercolor`, `oil painting`, `sketch`, `paper cutout`, `silhouette`, `doodle`, `pencil`, `rubber hose`, `flat vector`, `live action`, `cinematic photo`, e nomes de estúdio (`Pixar-style`, `DreamWorks-style`, `Disney-style`, `Illumination-style`). Descrever as qualidades, nunca a marca.

---

## Como o Seedance 2.0 funciona (fundamentos)

Seedance 2.0 pensa como um **diretor de fotografia**, não como gerador de imagem. O prompt é uma lista de planos (shot list), não uma lista de tags. O modelo gera áudio e vídeo sincronizados em uma única passada, suporta sequências multishot com cortes rotulados, e aceita até 9 imagens de referência, 3 vídeos e 3 clipes de áudio.

Estrutura confiável de prompt (ordem importa):

1. **Sujeito + ação primeiro** — o que acontece, em beats
2. **Movimento de câmera segundo** — como a câmera se move
3. **Sons terceiro** — SFX e ambiente específicos
4. **Transições de plano por último** — se for multishot

Os prompts de exemplo da ByteDance rodam de 2 a 4 frases para plano único e de 4 a 8 frases para sequências multishot. Prompts curtos e vagos tendem a produzir movimento genérico, enquanto prompts específicos e dirigidos produzem resultados intencionais.

Duração: o modelo suporta de 4 a 15 segundos por geração, ou "auto". Clipes curtos (4–5s) funcionam bem para plano único; clipes longos (10–15s) são onde a capacidade multishot fica mais útil.

---

## REFERENCE IMAGES — método principal (use isto na maioria das vezes)

Esta é a forma de trabalho padrão do usuário. **Raramente start/end frame** — quase sempre reference images (e às vezes reference video). Por isso, todo prompt deve tagar as referências explicitamente.

### Como tagar

As referências entram no prompt como `@Image1`, `@Image2`, `@Image3`… (e `@Video1`, `@Audio1` quando houver). Você referencia esses inputs no prompt usando tags: @Image1, @Image2, @Video1, @Audio1, e assim por diante. Isso permite descrever exatamente como cada referência deve influenciar a saída.

**Regra de ouro:** não basta anexar a imagem — é preciso *chamar a tag dentro do texto*. Seu prompt de texto deve chamar explicitamente essas tags: "Reference @Character1 for facial features while performing action." Isso cria um "link forte" entre os pixels e a lógica do prompt.

### Padrões de uso de tag

- **Personagem (face/design lock):** `@Image1 is the hero character — keep face, hair and outfit exactly as shown.`
- **Ambiente/cenário:** `Place the action in the environment shown in @Image2.`
- **Prop:** `The object held is @Image3.`
- **Estilo final/mood:** `Match the rendering style and palette of @Image2.`
- **Motion transfer (vídeo):** `Follow the camera move and action rhythm of @Video1.`

### Limites de referência

Aceita até 9 imagens de referência, 3 vídeos de referência e 3 clipes de áudio. O total de arquivos entre todos os tipos não pode passar de 12. Vídeo de referência: cada vídeo entre ~480p e 720p; duração combinada de todos os vídeos não pode passar de 15 segundos, e o tamanho total deve ficar abaixo de 50 MB.

> ⚠️ **Política de rostos (Higgsfield/fal):** em algumas plataformas, o upload de rostos humanos realistas é atualmente proibido. Personagens 3D estilizados (como os da Liga da Energia) não são afetados — é exatamente o caso de uso ideal.

---

## MULTISHOT — múltiplas cenas em uma geração (seção principal)

Multishot é o recurso que transforma o Seedance de gerador-de-clipe em gerador-de-história. Você pode criar uma narrativa multishot completa usando apenas um prompt. Não há necessidade de costurar cenas manualmente. Descreva múltiplas cenas no prompt e o modelo gera uma sequência coesa com continuidade frame a frame.

### Quando o usuário pede multishot → gerar entre 12–15s

Para multishot, o usuário normalmente gera clipes de **12 a 15 segundos** (dá tempo para todos os planos + transições). Sempre setar a duração explícita nessa faixa. Se o prompt descreve quatro planos mas a duração é só 5 segundos, o modelo comprime ou pula planos. Dê espaço a ele.

### Os 4 elementos que seguram uma sequência

Prompts multishot do Seedance 2.0 precisam de quatro coisas para segurar uma sequência: marcadores numerados de plano (Shot 1, Shot 2, Hard cut to), uma âncora compartilhada entre planos (mesmo personagem, mesmo local, ou mesma receita de luz), uma ação por bloco de plano, e notas globais de render no fim (identidade de câmera, iluminação, lista de cues negativos). Limite a sequência a cinco planos.

Detalhando cada um:

1. **Marcadores numerados.** `Shot 1:`, `Shot 2:`, `Hard cut to:`. A formatação "Shot 1:" e "Shot 2:" dá ao modelo pontos de corte explícitos. Sem rótulos, prompts longos tendem a produzir um único plano contínuo em vez de uma sequência editada.

2. **Âncora compartilhada.** Cada plano precisa ter algo em comum com o anterior — o mesmo personagem (`@Image1`), o mesmo local (`@Image2`), ou a mesma receita de luz. Se o plano 2 não tem nada em comum com o plano 1 (sem personagem, sem local, sem luz), o Seedance gera dois clipes não relacionados em vez de uma sequência.

3. **Uma ação por bloco.** O modelo está fazendo muita coisa por baixo: planejando a continuidade visual entre cortes, renderizando cada personagem ou set, e se houver diálogo, também o lip sync e o áudio. Para facilitar o trabalho dele, não empilhe múltiplas ações dentro de um bloco. Um bloco, uma ação. Se você precisa de três coisas acontecendo, são três planos.

4. **Notas globais no FIM.** Câmera, paleta, estilo e cues negativos vão *depois* dos blocos de plano. O Seedance 2.0 segue as notas de fechamento de forma mais confiável do que as de abertura para coisas como câmera e iluminação.

### Lógica Wide-to-Tight (mais confiável)

Organize os planos do mais aberto ao mais fechado quando possível. Modelos de IA acham mais fácil dar zoom em um sujeito existente do que gerar um ambiente inteiramente novo do zero. Estabeleça o mundo no Shot 1 (wide), depois aproxime.

### Trave os tokens como constantes

Não reescreva o mesmo descritor de formas diferentes entre planos. Trate-os como constantes. Use descritores curtos e consistentes. Não tente reformular o mesmo token entre prompts. Ex.: se o Shot 1 diz "orange-red hero suit", os Shots 2 e 3 repetem *exatamente* "orange-red hero suit", não "the orange outfit".

### Tamanho do prompt multishot

Prompts multishot rodam um pouco mais longos. Onde um plano único é confortável em 60–120 palavras, um prompt de cinco planos chega confortavelmente a 200–300 palavras. Não encha linguiça — cada palavra deve trabalhar para um dos blocos de plano.

### Como combinar multishot + reference images

Tagar as referências dentro dos blocos de plano que precisam delas. O Shot que precisa do personagem chama `@Image1`; o que precisa do cenário chama `@Image2`. Repetir a tag em cada plano onde aquele elemento aparece — é o que força a consistência através dos cortes (o callback do personagem no último plano é uma técnica clássica para travar a identidade).

### Estrutura-modelo de prompt multishot (copiar)

```
[GLOBAL STYLE/MOOD opening line — one sentence that every shot inherits].

Shot 1: [framing/angle]. @Image1 [character action — ONE beat]. [camera move].
Shot 2: Hard cut to [framing]. @Image1 [new action — ONE beat] in [@Image2 location]. [camera move].
Shot 3: Hard cut to [framing]. [action — ONE beat, callback to Shot 1 subject]. [camera move].

[GLOBAL RENDER NOTES — camera identity, lighting recipe, palette].
[STYLE ANCHOR].
Audio: no music, no background score. Sound effects and ambient only — [SFX list].
Duration: 12–15s, 16:9.
```

### Erros comuns de multishot (e correções)

Esquecer de numerar os planos → o modelo trata blocos sem rótulo como um plano contínuo e os cortes somem. Empilhar ações demais num bloco → uma ação por plano; três ações = três planos. Repetir o mesmo enquadramento em todos os planos → se tudo é medium shot, os cortes parecem inúteis; varie o ângulo. Pôr as notas globais no início em vez do fim → o Seedance segue as notas de fechamento de forma mais confiável. Pedir mais de 5 planos → o modelo começa a dropar ou comprimir planos além de cinco. Faltar a âncora compartilhada → gera clipes não relacionados.

---

## Áudio nativo — SEM MÚSICA

O modelo gera áudio sincronizado junto de cada frame, incluindo efeitos sonoros, som ambiente, música e diálogo com lip sync. Não é pós-processamento — áudio e vídeo vêm do mesmo processo de geração, o que trava o timing.

Como o modelo gera música por padrão, **é obrigatório suprimir explicitamente**. Sempre fechar com:

> *Audio: no music, no background score. Sound effects and ambient only — [SFX].*

Ser específico nos sons aumenta a qualidade. Se o prompt descreve uma explosão, o modelo gera áudio de explosão. Mas "uma explosão massiva que sacode a câmera, destroços batendo no concreto" dá muito mais material à geração de áudio. Cues de som no prompt funcionam como direção de áudio.

**SFX úteis (em inglês, para o prompt):** `springy boing`, `heavy thud`, `glass shatter`, `whoosh`, `bright pop`, `metallic clang`, `slide whistle up/down`, `electronic hum`, `footsteps`, `wind`, `birdsong`, `sizzling`. Stings isolados (não melodia) são ok: `brief orchestral sting`, `harp gliss`.

---

## Estilo de Arte — DreamWorks 3D Polished Animation (ÚNICO)

> Esta skill suporta **apenas** animação 3D estilo DreamWorks. Não há outros estilos — todo prompt produz renderização 3D polida de longa-metragem.

### Look padrão: CGI 3D Feature-Animation (DreamWorks-like)

- **Modelos:** 3D polidos, proporções semi-realistas (cabeça ligeiramente maior que o natural, olhos expressivos mas não exagerados)
- **Iluminação:** cinematográfica motivada — key source identificável, fill suave, rim light para separação
- **Superfície:** detalhe tátil — cabelo volumoso com fios individuais, pele com subsurface scattering suave, tecido com textura visível, olhos com catchlights limpos
- **Atmosfera:** volumétrica sutil (neblina leve, depth fade, god rays quando adequado)
- **Enquadramento:** sempre 16:9, lentes cinematográficas (35mm–85mm equivalent)

**Prompt:** usar o **style anchor** — nunca nomear estúdio.

### Sub-variações tonais dentro do 3D DreamWorks

Mesmo dentro do look 3D polido, o tom visual pode variar. Use estas receitas para ajustar a "personalidade" da cena sem sair do estilo DreamWorks:

| Variação | Ajuste no prompt |
|----------|------------------|
| Épico / Aventura | `heroic scale, dramatic motivated key light, warm golden hour palette, deep contrast shadows, volumetric god rays` |
| Cômico / Leve | `playful energy, bright saturated primaries, soft fill light eliminating harsh shadows, gentle bounce light` |
| Aconchegante / Íntimo | `warm enclosed lighting, soft amber key, shallow depth of field, cozy atmosphere` |
| Noturno / Suspense | `moonlit cool key, deep blue shadows, rim light only, high contrast, atmosphere fog` |
| Sci-Fi / Frio | `cool teal-and-slate palette, hard overhead key, metallic reflections, clinical clean light` |
| Fantasia / Mágico | `bioluminescent pastel light, floating particles, soft colored fill, magical atmosphere, gentle glow` |

---

## Integração com projetos existentes (ex: Liga da Energia)

Quando o usuário trabalha numa série com personagens definidos, **combinar com `ai-animation-keyframes`** e:

- Usar os **character sheets** como `@Image1`, `@Image2` etc., e chamar as tags no texto de cada plano
- Repetir o **style anchor** do projeto em todo prompt; nunca nomear estúdio
- Manter as **proporções semi-realistas**, o **cabelo volumoso detalhado**, e o **detalhe tátil de tecido** (marcas registradas do look DreamWorks 3D)
- **Linguagem visual da Liga da Energia:** luz dourada quente = influência do vilão; luz azul fria do anel de teto = equipe com consciência restaurada. Reforçar isso na receita de luz das notas globais de cada cena. Travar como token constante entre planos (ex.: `cool blue ceiling-ring light` repetido literalmente).

---

## Framework de Hook (2 primeiros segundos)

Todo prompt abre com um gancho visual forte. Escolha UM (descrições em inglês para o prompt):

| # | Nome | Frase de prompt |
|---|------|-----------------|
| 01 | Smash-Zoom | `character SMASH-ZOOMS into camera, impact frame, bulging eyes, motion-blur trails` |
| 02 | Cartoon Body Stretch | `character enters with comedic cartoon stretch — torso elongates, eyes pop, elastic snap-back` |
| 03 | Color Burst | `vibrant color explosion radiates outward, hot-pink and electric-yellow sparkles` |
| 04 | Fourth-Wall Break | `character turns to camera, conspiratorial grin, winks` |
| 05 | Exaggerated Reaction | `face stretches into shocked expression, eyes become giant ovals, silent scream` |
| 06 | Object Transform | `environment element morphs unexpectedly — cloud becomes bird, ground ripples` |
| 07 | Speed-Line Burst | `speed lines burst radially as character spins with motion blur` |
| 08 | Particle Shower | `golden confetti and sparkles cascade across half the frame` |
| 09 | Blink Cut | `character blinks hard, one black frame, instant cut to new angle` |
| 10 | Gravity Flip | `gravity inverts, character floats up as ground becomes ceiling` |

---

## Princípios de Animação — vocabulário (inglês, para o prompt)

| Princípio | Frase de prompt |
|-----------|-----------------|
| Squash & Stretch | `squash on impact, stretch before fast moves, preserve volume` |
| Anticipação | `crouch before jump, inhale before line, wind-up before hit` |
| Follow-Through | `hair and clothing lag 0.2s behind head, fingers settle last` |
| Arcos | `curved motion path, no mechanical straight lines` |
| Timing Snappy | `fast key-pose transitions, short holds on comedic beats` |
| Exagero | `push expression beyond realism, bigger-than-life moves` |
| Ação Secundária | `head turns before body, independent blinks` |
| Smear Frame | `3D model stretches into a motion-blurred smear on the fast frame, preserving volume` |

---

## Paletas de Cor (inglês, para o prompt)

| Paleta | Frase de prompt |
|--------|-----------------|
| Saturada / Energia | `bold saturated primaries — vivid red, electric blue, golden yellow, 100% saturation` |
| Pastel | `soft pastel palette — pale lavender, blush pink, powder blue, mint` |
| Monocromática | `monochrome blue palette, navy to sky to pale, unified scheme` |
| Quente / Nostálgica | `warm nostalgic palette — burnt orange, golden yellow, warm brown` |
| Fria / Profissional | `cool palette — slate blue, teal, cool grays` |
| Terra / Orgânica | `earth tones — warm brown, terracotta, sage green` |
| Neon | `neon palette — electric magenta and cyan on black, glow bloom` |

---

## Template Mestre (plano único) — saída em inglês

```
[OPENING HOOK]. @Image1 [character] [main action in beats].
[ENVIRONMENT — @Image2 if used]. [animation principles: anticipation, squash-stretch, follow-through].
[CAMERA: angle + lens feel + move]. [LIGHTING: motivated key source].
[PALETTE].
[STYLE ANCHOR — polished 3D feature look, semi-realistic proportions, tactile detail, motivated cinematic lighting, 16:9].
Audio: no music, no background score. Sound effects and ambient only — [SFX list].
Duration: [4–6s single shot], 16:9.
```

---

## 3 Exemplos Grandes (saída em inglês)

### EXEMPLO 1 — Multishot 15s, Liga da Energia (reference images)

*Referências: `@Image1` = Tito character sheet, `@Image2` = HQ interior environment.*

```
Heroic 3D feature-animation sequence inside a high-tech command room, calm confident mood.

Shot 1: Wide establishing shot. @Image1 Tito walks from the doorway toward the oval table, the room shown in @Image2 around him, camera tracks alongside at waist height.
Shot 2: Hard cut to a medium shot. @Image1 Tito stops at the table and plants both hands on the edge, shoulders rising as he inhales, slow push-in.
Shot 3: Hard cut to a close-up of @Image1 Tito's face as he looks up, determined jaw, cool blue ceiling-ring light catching his eyes, camera holds steady.

Global render notes: consistent 35mm lens feel, cool blue ceiling-ring light as the key source throughout, clean white-and-cyan sci-fi palette. Tito keeps the exact orange-red hero suit with the red flame insignia in every shot.
Polished 3D feature-animation look, semi-realistic proportions, tousled detailed hair, warm-undertone skin with soft subsurface scattering, expressive proportionate eyes with clean catchlights, tactile fabric detail, composed cinematic lighting, faint volumetric atmosphere, 16:9.
Audio: no music, no background score. Sound effects and ambient only — low room hum, soft footsteps, a faint electronic beep, the quiet tap of hands on the table.
Duration: 15s, 16:9.
```

*Por que funciona:* frase global de abertura que todos os planos herdam; marcadores numerados + "Hard cut to"; lógica wide→medium→close; `@Image1`/`@Image2` chamados no texto; token do suit travado literalmente nos três planos; luz azul como constante; notas globais no fim; sem música.

### EXEMPLO 2 — Plano único 5s, ação cartoon (reference image)

*Referência: `@Image1` = personagem coelho.*

```
@Image1 the rabbit SMASH-ZOOMS into camera with a comedic impact frame, eyes bulging, radial speed-line burst.
The rabbit winds up (0.4s anticipation), then throws a huge punch — the fist squashes oversized on contact, then the body stretches into the recoil. Hair and ears lag behind, settling last.
Low-angle camera, slight handheld energy, snappy timing with 2-frame holds on the extremes.
Bold saturated palette — warm orange ground, hot-pink glove accents.
Polished 3D feature-animation look, semi-realistic proportions, tactile fabric detail, motivated cinematic lighting, faint volumetric atmosphere, 16:9.
Audio: no music, no background score. Sound effects and ambient only — wind-up whistle, heavy thud on impact, springy boing on the recoil.
Duration: 5s, 16:9.
```

### EXEMPLO 3 — Multishot 12s, produto/comida (reference images)

*Referências: `@Image1` = prato finalizado, `@Image2` = cozinha estilizada.*

```
Warm appetizing 3D feature-animation sequence in the stylized kitchen shown in @Image2.

Shot 1: Wide shot, the kitchen from @Image2, golden window light, the dish @Image1 sits centered on the counter, gentle steam rising, camera slowly pushes in.
Shot 2: Hard cut to a medium shot, a stylized hand enters from the right and garnishes @Image1, the steam catches the light, slow dolly in.
Shot 3: Hard cut to a close-up of @Image1, shallow focus on the rim of the plate as a fork gently taps the edge.

Global render notes: 50mm lens feel, soft golden window key light throughout, cream and warm-brown palette. The dish @Image1 keeps the exact same plating in every shot.
Polished 3D feature-animation look, semi-realistic proportions, tactile surface detail, composed cinematic lighting, faint volumetric atmosphere, 16:9.
Audio: no music, no background score. Sound effects and ambient only — soft sizzling, the light clink of a fork on ceramic, quiet kitchen ambience.
Duration: 12s, 16:9.
```

---

## Specs rápidas

- **Aspect ratio:** sempre `16:9`
- **Duração plano único:** 4–6s
- **Duração multishot:** 12–15s (explícita, nunca deixar comprimir)
- **Planos por geração:** máximo 5
- **Referências:** até 9 imagens / 3 vídeos / 3 áudios, total ≤ 12; vídeos somam ≤ 15s e ≤ 50MB
- **Resolução (fal):** 480p (rascunho) ou 720p (final) — não há 1080p/4K no fal
- **Idioma do prompt:** inglês
- **Áudio:** sempre "no music", só SFX + ambiente

---

## Checklist antes de entregar o prompt

- [ ] Prompt escrito em **inglês**
- [ ] `16:9` nas notas globais
- [ ] **Style anchor** de 3D DreamWorks polished animation colado (sem nomear estúdio)
- [ ] Nenhuma palavra banida (photo, anime, cel-shaded, 2D, hand-drawn, pixel art, stop-motion, etc. — lista completa na seção Estilo de Arte)
- [ ] Hook nos 2 primeiros segundos
- [ ] **Referências tagadas** (`@Image1`, `@Image2`…) **e chamadas no texto** de cada plano que as usa
- [ ] Se multishot: marcadores numerados (`Shot 1`, `Hard cut to`), 1 ação por bloco, máx 5 planos, âncora compartilhada, tokens travados literalmente, notas globais no FIM, duração **12–15s**
- [ ] Se plano único: 4–6s
- [ ] **Áudio: "no music" explícito** + SFX/ambiente nomeados
- [ ] Princípios de animação por nome + timing dos momentos-chave
- [ ] Projeto existente: character sheets como ref + regra de luz da série (Liga: dourado=vilão / azul=equipe)

---

## Workflow de uso desta skill

1. **Identificar:** plano único ou multishot? Quais referências (imagens/vídeo) o usuário tem?
2. **Clarificar só se faltar:** tom (cômico/dramático/heróico/whimsical)? quantos planos? qual ação central?
3. **Mapear referências → tags:** `@Image1` = personagem, `@Image2` = cenário, etc.
4. **Montar o prompt em inglês:** hook → ação(ões) por plano → câmera → luz → paleta → style anchor → áudio sem música → duração 16:9
5. **Multishot:** seguir os 4 elementos (marcadores, âncora, 1 ação/bloco, notas no fim), wide-to-tight, tokens travados, 12–15s
6. **Integração de projeto:** se série definida, puxar `ai-animation-keyframes` + regra de luz
7. **Rodar checklist** e entregar
