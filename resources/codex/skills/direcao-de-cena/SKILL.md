---
name: direcao-de-cena
description: Use quando o usuário descrever uma cena com as próprias palavras, colar um trecho de roteiro, ou pedir para decupar, dirigir, planejar ângulos, cobertura, blocking, ritmo, clipes ou frames de uma cena antes da geração. Aplica-se a cenas de cartoon/animação estilo DreamWorks em que é preciso transformar intenção dramática em pré-plano, clipes com motor narrativo e planejamento Seedance-aware.
---

# Direção de Cena

Cria o pré-plano profissional de uma cena — a etapa de découpage onde o diretor decide como filmar antes de gerar qualquer frame. Encoda a metodologia de estúdios de animação e cinema de Hollywood, com foco em cartoon/desenho estilo DreamWorks.

Esta skill é o topo do pipeline. Produz o planejamento criativo que alimenta as skills de ambientes, keyframes e animação.

## Mensagem central

Cada clipe é uma unidade dramática completa, não uma coleção de shots bonitos. Antes de pensar em lente, movimento ou cobertura, a skill precisa responder internamente:

- **Quem quer o quê?** (`want`)
- **O que impede?** (`obstacle`)
- **O que muda?** (`turn`)

Se a resposta não existe, o clipe pode renderizar bem e continuar sem motor dramático. A função desta skill é impedir isso.

## O que faz e NÃO faz

**FAZ:**
- Recebe a descrição de uma cena (palavras do usuário ou trecho de roteiro)
- Produz um pré-plano profissional estruturado
- Define objetivo, beats, estratégia visual, cobertura, blocking, ritmo
- Após aprovação, gera o planejamento de frames pensando no Seedance
- Planeja multishot, continuidade entre shots e transições de câmera para Seedance
- Mantém a geração sem música
- Dispara a execução emitindo o bloco `imagen-action` (create_scene) pro app

**NÃO FAZ:**
- Não gera imagens diretamente (emite imagen-action; o app executa)
- Não anima (isso é da skill de Seedance)
- Não pede trilha nem música; voz, fala e ambiente podem ser usados quando a cena pedir
- A decisão criativa é texto Markdown; a execução é o bloco JSON

## O processo em três fases

```
FASE 1 — PRÉ-PLANO (direção)
descrição da cena → pré-plano profissional → usuário aprova

FASE 2 — PLANEJAMENTO DE FRAMES (produção)
pré-plano aprovado → lista de frames pro Seedance → usuário aprova

FASE 3 — EXECUÇÃO (imagen-action)
planejamento aprovado → bloco imagen-action dispara a geração no app
```

O Director escreve orientação criativa em Markdown nas três fases. Na Fase 3, ao final do texto, anexa o bloco JSON `imagen-action` que o Electron lê e executa. Decisão criativa (texto) e execução técnica (bloco) ficam separadas.

---

# FASE 1 — O PRÉ-PLANO

Siga esta metodologia profissional, na ordem. Cada etapa alimenta a próxima. A Fase 1 não é apenas visual: ela resolve motor dramático, shape, arco, poder espacial e cobertura.

## Regras-mãe da Fase 1

- Nunca começar pela câmera. Comece pelo motor dramático.
- Nunca escrever emoção como label no prompt final. Traduzir tudo para comportamento físico visível.
- Nunca tratar o clipe como colagem de momentos. Cada clipe precisa de pergunta dramática e resposta dentro da sua duração.
- Nunca fazer curva de tensão monotônica. Vales importam; o clímax precisa respirar.
- Nunca depender de memória do engine entre clipes. Toda continuidade relevante precisa ser reestabelecida.

## Passo 0 — Diagnóstico estrutural do clipe ou arco

Antes do pré-plano, diagnostique o tamanho da unidade:

- **1 clipe (15s):** escolher uma forma dramática única
- **4 clipes (60s):** três atos comprimidos
- **8 clipes (120s):** arco completo com reversão central e release
- **12 clipes (180s):** arco com subtrama, falsa vitória e clímax mais espaçado

Se o usuário pedir apenas "a cena", a skill decide se aquilo cabe em 1 clipe ou precisa virar arco. Se 1 clipe ficar superlotado, dividir.

## Passo 1 — Motor dramático

Antes de qualquer câmera, defina:

- **Want:** o que alguém tenta conseguir, evitar, proteger ou forçar
- **Obstacle:** o que resiste, de forma concreta, física, social ou relacional
- **Turn:** o que muda dentro do clipe
- **Objetivo narrativo:** o que o público precisa entender ao fim
- **Objetivo emocional:** o que o público precisa sentir
- **Pergunta dramática:** qual tensão move a cena

Câmera sem motor é câmera aleatória. Se não houver `want + obstacle + turn`, a skill deve dizer que a cena ainda não está pronta para découpage.

## Passo 2 — Forma dramática do clipe

Escolha explicitamente a forma de cada clipe. No máximo combine duas se houver pivô claro no meio.

| Forma | Estrutura | Quando usar |
|---|---|---|
| **Setup -> Turn** | Situação estabelecida -> reversão ou revelação | Diálogo, descoberta, confronto |
| **Ramp** | Escalada contínua até o pico | Perseguição, corrida contra o tempo |
| **Hold -> Release** | Pressão acumulando em silêncio -> gesto libera tudo | Standoff, decisão |
| **Glimpse** | Observacional, atmosférico, temporal | Ambiente, passagem de tempo |

A forma escolhida precisa aparecer nos verbos, no blocking e no ritmo, nunca como label jogado no prompt.

## Passo 3 — Arco e curva de tensão

Se houver múltiplos clipes, mapear função por clipe e tensão relativa.

| Arco | Estrutura mínima | Curva de tensão de referência |
|---|---|---|
| **4 clipes** | estabelecimento -> escalada -> reversão -> resolução | `3 -> 5 -> 8 -> 4` |
| **8 clipes** | setup -> tentativa -> reversão central -> tudo perdido -> clímax -> release | `2 -> 4 -> 5 -> 4 -> 7 -> 9 -> 10 -> 3` |
| **12 clipes** | ato 1 -> 2A -> 2B -> ato 3 -> release | `2 -> 3 -> 5 -> 4 -> 6 -> 7 -> 5 -> 8 -> 10 -> 9 -> 10 -> 2` |

Princípios obrigatórios:

- Um vale antes do clímax aumenta o impacto.
- O clímax é singular; dois picos matam o pico.
- O release sempre aterrissa abaixo do clímax.
- Escalada monotônica é relato, não drama.

## Passo 4 — Personagem em comportamento: want / mask / tell

Todo personagem ativo precisa de pelo menos um `want`. Quando possível, adicionar:

- **Mask:** o que projeta para esconder o want
- **Tell:** o vazamento físico involuntário que denuncia o custo da máscara

Nunca escrever os labels no prompt final. Sempre traduzir para sinal físico visível.

Exemplo de tradução correta:

- errado: "Anna quer sair, mas está nervosa"
- certo: "Anna não para de olhar para a porta; mantém a voz calma, mas o dedo indicador bate no copo, para, bate de novo"

## Passo 5 — Decomposição em beats

Quebre a cena em beats — unidades de mudança. Cada beat é um momento onde algo muda (emoção, informação ou poder).

Para cada beat, anote:
- O que acontece
- O que muda (a virada do beat)
- A emoção dominante
- Quem ganha ou perde poder no espaço

Exemplo:
```
Beat 1: Tito chega confiante → estabelece o herói (emoção: confiança)
Beat 2: Vê o problema → quebra a confiança (emoção: surpresa)
Beat 3: Hesita → conflito interno (emoção: dúvida)
Beat 4: Decide agir → resolução (emoção: determinação)
```

Ritmo-base:

- ~4 beats por clipe de 15s é o natural
- 1 beat = uma unidade dramática com resultado
- 6+ beats em 15s indica sobrecarga; dividir ou comprimir

## Passo 6 — Estratégia visual (a interpretação do diretor)

Aqui mora a arte. Defina a abordagem cinematográfica que serve a cena. Não é uma lista de planos ainda — é o CONCEITO visual.

Exemplos de estratégias profissionais:

| Estratégia | Como funciona | Quando usar |
|------------|---------------|-------------|
| Isolamento → conexão | Personagens em quadros separados, câmera vai unindo | Cenas de reaproximação |
| Tensão crescente | Planos progressivamente mais fechados e baixos | Confronto, suspense |
| Dinâmica de poder | Quem domina em câmera baixa, quem está frágil em alta | Confrontos desiguais |
| Calmaria → caos | Estático e amplo, depois cortes rápidos e inclinados | Quebra de paz |
| Subjetividade | POVs e closes pra colocar o público na pele do personagem | Imersão emocional |

Escolha (ou combine) e **justifique**: por que essa abordagem serve este objetivo.

## Passo 7 — Gênero como motor

O gênero não é só look. Ele decide contra o que o personagem luta e como a cena resolve.

| Gênero | Motor | Resolução típica |
|---|---|---|
| **Action** | obstáculo externo escalando | resultado físico |
| **Drama** | contradição interna tornada externa | decisão visível |
| **Noir** | erosão moral | custo maior que a conquista |
| **Horror** | pavor acumulando | fuga marcada ou consumo |
| **Comedy** | expectativa -> inversão | aterrissagem da virada |
| **Epic** | propósito em escala | transformação ampliada |

Se o gênero estiver claro, a skill deve usá-lo para escolher verbos, blocking, ritmo e release.

## Passo 8 — Forma narrativa por tipo de cena

O shape da cena vive nos verbos e na geometria, nunca em label explícito. Escolha a forma operacional dominante:

- **Perseguição gap-closing:** distância estreitando
- **Fuga sob pressão:** espaço fecha e depois libera
- **Duelo de iguais:** troca e contra-troca com consequência física
- **Standoff / pré-contato:** imobilidade carregada
- **Reveal:** ocultação -> aparição
- **Transformação:** sujeito muda; câmera acompanha ou orbita
- **Confronto de poder:** eixo de domínio muda de lado
- **Interrogação:** pressão assimétrica
- **Confissão:** câmera aperta, release no corpo
- **Negociação equilibrada:** oferta, contraoferta, acordo ou ruptura
- **Atmosfera / processo temporal:** o ambiente muda a si mesmo

Se a cena estiver sem forma operacional, a skill ainda não deve descer para frame.

## Passo 9 — Poder é espacial

O engine lê corpos no espaço melhor do que abstrações emocionais. Sempre escrever poder como geometria:

- quem está de pé e quem está sentado
- quem pode sair e quem está encurralado
- o que bloqueia fisicamente uma rota
- distância entre corpos, props e saídas
- mãos perto de arma, porta, telefone, prova, botão

Exemplo: em vez de "ele está no controle", usar "ele permanece de pé; ela sentada; a mesa entre os dois".

## Passo 10 — Plano de cobertura (os planos)

Agora os planos concretos. Pense em MONTAGEM — gere cobertura suficiente pra editar.

A regra profissional do master + cobertura:
- **Master shot:** um plano amplo que cobre a cena inteira (segurança, estabelece o espaço)
- **Cobertura:** planos fechados, médios, reações, detalhes, POVs

Para cada plano, defina:
```
- Tipo de plano (geral, médio, primeiro plano, detalhe, POV, sobre o ombro)
- Ângulo (nível dos olhos, baixa, alta, aérea, inclinada)
- Movimento (estático, push-in, pull-back, pan, tilt, tracking)
- Lente/focal quando isso altera a função dramática
- Beat que cobre
- Propósito (por que este plano, neste momento)
```

A coluna "propósito" é o que torna o plano profissional. Cada escolha de câmera serve o beat e a estratégia.

Para diálogo/confronto, use a gramática clássica:
- **Shot/reverse shot:** alterna entre os dois personagens
- **Regra dos 180°:** mantenha a câmera de um lado da linha entre eles
- **Sobre o ombro (OTS):** conecta os dois no mesmo quadro
- **Group OTS:** pros ombros de um grupo encarando o vilão (ouro pra série de equipe)

Para o vocabulário completo de planos e ângulos em cartoon — todos os tamanhos (wide, full, medium, close-up, etc.), todas as alturas (eye level, hip level, ground level, baixa, alta) e os enquadramentos especiais (OTS, Group OTS, two-shot, POV, dutch) com quando e como usar cada um — ver `references/planos-e-angulos-cartoon.md`.

Para multishot, continuidade entre shots e transições no Seedance, ver `references/seedance-multishot-transicoes.md`.

## Passo 11 — Blocking (encenação)

Onde os personagens estão e como se movem. Tão importante quanto a câmera.

- Posição inicial de cada personagem
- Movimentos durante a cena
- Como se relacionam no espaço (perto/longe = relação emocional)
- Quem tem saída e quem está travado
- Como a troca de posição muda o eixo de poder

## Passo 12 — Session lock visual

Defina a coerência visual da sessão antes de listar frames:

- **Hard-lock:** paleta de cor, camera body e lente/caráter óptico
- **Soft-lock:** movimento de câmera e luz

Hard-lock só quebra com dispositivo narrativo explícito, como flashback, sonho, memória, epílogo ou salto temporal.

Soft-lock só deve mudar em fronteira natural de cena com pelo menos dois gatilhos claros, como:

- mudança de localização
- mudança de energia
- mudança de hora do dia

Um gatilho sozinho normalmente não justifica quebrar lock.

## Passo 13 — Ritmo, densidade e transições

- Pacing geral (cena calma = planos longos; ação = cortes rápidos)
- Duração aproximada de cada plano
- Como os planos cortam (corte seco, ou momento de animar a transição)
- Curva de tensão do clipe/arco
- Densidade de beats
- Orçamento de diálogo por duração

Orçamento de diálogo de referência:

| Duração | Palavras sugeridas | Trocas máximas |
|---|---|---|
| **5-6s** | 12-16 | 2 |
| **7-8s** | 15-20 | 3 |
| **9-10s** | 20-25 | 4 |
| **11-12s** | 25-30 | 4 |
| **13-15s** | 30-35 | 5-6 |

Ver `references/linguagem-de-camera.md` para o mapeamento completo de câmera → emoção, e `references/planos-e-angulos-cartoon.md` para o vocabulário completo de planos e ângulos em cartoon (tamanhos, alturas, OTS, Group OTS, etc.) com quando usar cada um.

Quando a cena tiver múltiplos shots, use também `references/seedance-multishot-transicoes.md` para decidir corte, continuidade e ponte entre frames.

## Formato de saída do pré-plano

Apresente assim para o usuário aprovar:

```markdown
# PRÉ-PLANO — [Nome da Cena]

## Motor Dramático
- Want: ...
- Obstacle: ...
- Turn: ...
- Narrativo: ...
- Emocional: ...
- Pergunta dramática: ...

## Forma e Arco
- Forma do clipe: ...
- Estrutura do arco: ...
- Curva de tensão: ...
- Gênero / motor: ...
- Forma narrativa dominante: ...

## Personagens
- [Nome]: want / mask / tell

## Beats
1. [beat + mudança + emoção + mudança de poder]
2. ...

## Estratégia Visual
[a abordagem escolhida + justificativa]

## Session Lock
- Hard-lock: paleta / body / lente
- Soft-lock: câmera / luz

## Plano de Cobertura
| # | Plano | Ângulo | Movimento | Lente | Beat | Propósito |
|---|-------|--------|-----------|-------|------|-----------|
| 1 | ... | ... | ... | ... | ... | ... |

## Blocking
[posições e movimentos]

## Ritmo
[pacing + durações + transições + densidade + diálogo]
```

Espere a aprovação antes de ir pra Fase 2.

---

# FASE 2 — PLANEJAMENTO DE FRAMES (Seedance-aware)

Depois do pré-plano aprovado, converta cada plano em necessidades de frame, já pensando em como o Seedance vai animar.

## Regra estrutural da Fase 2

Cada frame e cada prompt precisam ser `self-contained`. O engine não tem memória de sessão entre clipes. Nunca depender de frases como "o mesmo quarto de antes" ou "o personagem do clipe anterior".

Sempre reestabelecer:

- localização completa
- luz, clima e hora do dia
- roupa, cabelo e leitura visual do personagem
- props relevantes
- `<<<uuid>>>` em todos os clipes onde o elemento reaparece

Template-base de prompt self-contained:

```text
[Personagem], [descrição visual breve], [ação].
[Localização], [luz], [hora do dia], [props relevantes].
[O que muda dentro do clipe].
```

## A lógica Seedance: keyframe → animação

O Seedance anima a partir de frames estáticos. Para cada plano do pré-plano, decida:

- **Quantos keyframes** o plano precisa (1 se é movimento simples; 2 se usa start+end frame)
- **O que se move** na animação (só o que muda, não o personagem inteiro)
- **Qual ambiente/aproximação** usar como referência (da biblioteca da skill gerador-ambientes)
- **Qual reference image** usar para cada shot, sempre como base
- **Qual personagem** entra e qual sua pose/expressão
- **Se a cena é single-shot ou multishot**
- **Como a transição entre shots funciona**: corte seco, corte no movimento, match cut, bridge frame, push-in/pull-back, pan/tilt/zoom
- **Música sempre desligada** no destino Seedance
- **Reference image quase sempre antes de start/end**; use start/end só quando o movimento realmente precisar de interpolação controlada

## Decisão start+end frame vs frame único

| Situação | Frames necessários |
|----------|-------------------|
| Plano com identidade visual estável | 1 reference image |
| Movimento leve dentro do plano | 1 reference image + nota de movimento |
| Movimento muito controlado que exige interpolação | 2 frames (start + end) |
| Transformação ou morph | 2 frames (antes + depois) |
| Mudança de beat com novo shot | 1 reference image por shot |
| Transição suave entre dois shots | bridge frame ou `Between Images` |

## Formato de saída do planejamento de frames

```markdown
# PLANEJAMENTO DE FRAMES — [Nome da Cena]

| Plano | Keyframes | Referência (ambiente) | Personagem + pose | O que anima (Seedance) | Transição | Start+End? |
|-------|-----------|----------------------|-------------------|------------------------|-----------|------------|
| 1 | KF1, KF2 | aproximação porta | Tito, chegando | Tito anda até a porta | corte no movimento | Sim |
| 2 | KF3 | cobertura frontal | Tito, parado | leve respiração | corte seco | Não |
```

Liste também:
- Total de keyframes a gerar
- Quais usam aproximações de área vs cobertura ampla
- Ordem de geração recomendada
- Quais shots são contínuos e quais são blocos multishot
- Onde o corte entra e por que ele existe
- Como cada frame reestabelece a continuidade sem depender do clipe anterior
- Confirmação explícita de que a geração é sem música

Espere aprovação antes de ir pra Fase 3.

## Seedance e multishot

Quando a cena pede mais de um momento visual claro, trate como multishot.

- Use multishot para mudanças de beat, troca de espaço, revelação, confronto, reação e volta de energia
- Mantenha um elemento âncora entre shots: personagem, local, paleta ou luz
- Planeje a transição antes de planejar o frame final de cada shot
- Prefira uma transição clara por vez: corte seco, corte no movimento, match cut ou bridge frame
- Não misture muitas ações dentro do mesmo shot; se a ação mudou de intenção, é outro shot
- Para Seedance, a continuidade por referência é mais confiável do que pedir "efeitos de transição" abstratos
- Sempre manter a geração sem música; voz e fala só quando a cena pedir

## Checklist obrigatório antes da Fase 3

Antes de emitir `imagen-action`, verificar internamente:

- cada clipe tem `want + obstacle + turn`
- a curva de tensão respira e tem vale antes do clímax
- o clímax é singular
- os prompts são self-contained
- os verbos carregam o shape; não há labels dramáticos no texto final
- emoção virou comportamento físico visível
- hard-lock está consistente
- soft-lock só muda com gatilho suficiente
- densidade do clipe não estourou
- `<<<uuid>>>` aparece em todos os clipes necessários

---

# FASE 3 — EXECUÇÃO VIA imagen-action

Depois do planejamento de frames aprovado, dispare a geração emitindo um bloco `imagen-action`. O Director NÃO gera a imagem diretamente — ele descreve a ação e o app (Electron) executa.

## Como funciona o contrato

1. O Director escreve a orientação criativa normal em Markdown (o que vai gerar e por quê)
2. Ao final, anexa um bloco JSON em fenced code block com `version`, `action`, `summary`, `payload`
3. O Electron lê o bloco, resolve referências, executa a geração
4. O app devolve `imagen-status` com o estado (`running`, `succeeded`, `failed`)

O bloco NÃO substitui o texto — ele acompanha. Sempre escreva a orientação criativa antes do bloco.

## Qual ação usar

| Ação | Quando usar |
|------|-------------|
| `create_scene` | Cena com frames ordenados, continuidade compartilhada, prompts editáveis por frame, plano pronto pro Seedance. É um grupo estruturado com restrições de continuidade e revisão frame a frame. |
| `generate_classic` | Exploração de imagem independente, variações, stills avulsos. É um lote de imagens separadas, sem continuidade. |

**Para a geração dos frames de uma cena planejada, use sempre `create_scene`** — porque a cena precisa de frames ordenados, continuidade e ficar pronta pro Seedance. `generate_classic` é só pra exploração avulsa fora do fluxo de cena.

## Formato do bloco (exemplo create_scene)

Escreva o texto criativo, depois anexe:

```json
{
  "version": "1.0",
  "action": "create_scene",
  "summary": "Gerar os 4 frames da Cena 1 — chegada do Tito",
  "payload": {
    "scene_name": "Cena 1 - Chegada",
    "aspect_ratio": "16:9",
    "continuity": {
      "characters": ["tito"],
      "environment": "amb-quarto-01",
      "style": "kids cartoon DreamWorks-inspired"
    },
    "frames": [
      {
        "order": 1,
        "id": "KF1",
        "shot": "plano geral",
        "angle": "câmera baixa",
        "movement": "estático",
        "prompt": "[prompt do keyframe — personagem + pose + câmera + referência]",
        "references": {
          "environment": "amb-quarto-01/aproximacoes/porta",
          "character": "tito-refsheet",
          "reference_image": "tito-shot-01-ref"
        },
        "editable": true
      }
    ]
  }
}
```

O schema exato do payload deve bater com o contrato do seu app. Os campos acima cobrem o que o pipeline precisa: ordem, prompt editável, referências resolvíveis (ambiente da biblioteca + personagem), continuidade por reference image e start/end apenas quando o movimento realmente exigir.

## Tratamento do imagen-status

Depois de emitir o bloco, o app devolve `imagen-status`:

- `running` — geração em andamento, aguarde
- `succeeded` — frames gerados, siga para revisão/aprovação
- `failed` — informe o usuário e proponha reenvio ou ajuste

Não emita um novo bloco enquanto o anterior estiver `running`.

## Regra de ouro da Fase 3

```
Texto criativo (Markdown)  →  decisão
+
Bloco imagen-action (JSON) →  execução
```

Sempre os dois juntos, nessa ordem. O texto explica; o bloco dispara. Nunca só o bloco sem orientação.

## Conexão com o resto do pipeline

```
direcao-de-cena (esta skill)
   ├── Fase 1: pré-plano profissional (Markdown)
   ├── Fase 2: planejamento de frames Seedance-aware (Markdown)
   └── Fase 3: bloco imagen-action (JSON) dispara a execução
        ↓ create_scene
app (Electron) → resolve referências e executa a geração dos frames
        ↓ usa
gerador-ambientes → cobertura + aproximações dos ambientes da cena
        ↓
keyframes → gera os frames (personagem + câmera apertada)
        ↓
seedance → anima os keyframes aprovados
```

Esta skill é o cérebro criativo. Ela decide o QUE filmar e COMO (Fases 1-2), e dispara a execução via contrato (Fase 3) — sem gerar imagem diretamente. O app executa; as skills de ambiente/keyframe/seedance fazem o trabalho técnico.
