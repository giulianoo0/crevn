---
name: gerador-ambientes
description: Gera ambientes completos (cenários/backgrounds) para animação cartoon infantil em duas partes — (1) COBERTURA de todos os lados em 21:9 ultrawide a partir de uma foto de referência, e (2) APROXIMAÇÕES DE ÁREA em 16:9 (enquadramentos médios levemente angulados de regiões como porta, janela, guarda-roupa, que servem de referência melhor pra geração dos frames). Use quando o usuário enviar foto de ambiente e pedir os outros ângulos, cobrir todos os lados, criar o cenário completo, gerar aproximações de áreas, ou disser "pega todos os lados desse ambiente", "gera a cobertura do cenário", "preciso de uma aproximação da porta", "gera os ângulos de referência das áreas". Produz a cobertura ultrawide; depois gera aproximações de área (automático ou manual). Tudo NEUTRO e SEM personagens. Closes apertados e câmera dramática são do estágio de keyframe. Funciona com GPT Image e Nano Banana.
---

# Gerador de Ambientes

Gera ambientes completos para animação cartoon infantil em duas partes:

1. **Cobertura** — todos os lados do ambiente em 21:9 ultrawide (set fixo, gerado uma vez)
2. **Aproximações de área** — enquadramentos médios de regiões específicas em 16:9, levemente angulados, com profundidade (referência melhor pra geração de frames)

Ambas produzem material NEUTRO, sem personagens. Closes apertados e câmera dramática são decisão do estágio de keyframe, não desta skill.

Para as aproximações de área, ver `references/aproximacoes-de-area.md`.

## O que esta skill faz e NÃO faz

**FAZ:**
- Recebe 1 foto de referência + informações do ambiente
- Gera a cobertura de todos os lados em 21:9 ultrawide
- Gera aproximações de áreas específicas em 16:9 (médias, anguladas, com profundidade)
- Mantém consistência total entre lados e aproximações
- Produz material NEUTRO (eye-level, sem drama)
- Armazena com metadados

**NÃO FAZ:**
- Não decide câmera cinematográfica (câmera baixa, alta, inclinada) — isso é o estágio de keyframe
- Não coloca personagens — ambientes são sempre vazios

---

# PARTE 1 — COBERTURA (21:9 ultrawide)

## Entrada

```
- 1 foto de referência (imagem base do ambiente)
- Informações:
  • nome do ambiente
  • descrição (o que tem no lugar)
  • iluminação (luz e atmosfera)
  • elementos-chave a preservar
```

## Princípio: a foto de referência é a âncora

A foto enviada vira o master. Todos os lados são derivados dela, mantendo elementos, cores, iluminação e estilo idênticos. A descrição extraída é travada como texto fixo usado em todas as gerações.

## O set de cobertura (todos os lados, 21:9 ultrawide)


| Lado | O que captura |
|------|---------------|
| `frontal` | Vista de frente do espaço, ultrawide |
| `reverso` | Vista oposta (de trás pra frente) |
| `lateral_esq` | Vista do lado esquerdo |
| `lateral_dir` | Vista do lado direito |
| `camera_alta` | Vista de cima, ultrawide |
| `diagonal_esq` | Canto diagonal esquerdo (opcional) |
| `diagonal_dir` | Canto diagonal direito (opcional) |

Mínimo 5 lados (frontal, reverso, laterais, alta). Adicione diagonais para ambientes grandes/complexos.

## Por que 21:9 ultrawide

A proporção 21:9 (ultrawide cinematográfico) captura o máximo de espaço horizontal de cada lado. Isso dá aos agentes a maior quantidade possível de contexto visual, e permite que o estágio de keyframe "recorte" o enquadramento que precisar dentro dessa largura. Quanto mais espaço capturado, menos a IA inventa depois.

Aqui "ultrawide" se refere à proporção 21:9 — sem ambiguidade. Combinado com `wide-angle view` (campo de visão amplo), você captura o espaço inteiro num formato largo e cinematográfico.

Sempre inclua no prompt: `wide-angle view, showing maximum space, nothing cropped, 21:9 ultrawide cinematic aspect ratio`.

Nota: a cobertura fica em 21:9, mas as aproximações de área (Parte 2) ficam em 16:9. São propósitos diferentes — a cobertura é o espaço cinematográfico amplo, a aproximação é uma região focada (mas ainda média, não apertada).

## Prompts de cobertura

### Lado a partir da referência (Nano Banana — melhor consistência)

```
[Anexar foto de referência]
"Using this reference image as the exact same location, generate 
the same environment viewed from [INSTRUÇÃO DO LADO]. Keep all 
elements, furniture, colors, lighting and style absolutely 
identical to the reference. Only the viewpoint changes. 
Neutral eye-level angle, wide-angle view showing maximum space, 
empty no characters, kids cartoon Pixar style, 21:9 ultrawide cinematic aspect ratio."
```

### Lado a partir da referência (GPT Image)

```
[Anexar foto de referência]
"Recreate this exact environment seen from [INSTRUÇÃO DO LADO]. 
Same space, same objects, same lighting and cartoon style as 
the reference. Neutral eye-level, wide-angle view, no characters, 
21:9 ultrawide cinematic aspect ratio."
```

### Instruções por lado (substituir [INSTRUÇÃO DO LADO])

| Lado | Instrução em inglês |
|------|---------------------|
| `frontal` | "a wide front-facing view of the entire space" |
| `reverso` | "the reverse angle, looking back from the opposite end" |
| `lateral_esq` | "the left side of the space, wide view" |
| `lateral_dir` | "the right side of the space, wide view" |
| `camera_alta` | "a high overhead angle looking down over the whole space" |
| `diagonal_esq` | "a wide diagonal view from the left corner" |
| `diagonal_dir` | "a wide diagonal view from the right corner" |

## A frase de consistência (obrigatória em todo lado)

> "Keep all elements, colors, lighting and style absolutely identical to the reference. Only the viewpoint changes. Neutral eye-level angle."

A palavra `neutral` é crucial — impede o modelo de adicionar drama. Drama é do keyframe, não do ambiente.

## Schema de armazenamento

O mesmo objeto guarda a cobertura (21:9) e as aproximações de área (16:9). A cobertura é preenchida na Parte 1; as aproximações são adicionadas na Parte 2.

```json
{
  "id": "amb-quarto-01",
  "nome": "Quarto do Tito",
  "descricao_travada": "cozy cartoon bedroom, bed, wardrobe, desk, window with curtains",
  "iluminacao": "warm morning light through window, soft shadows",
  "estilo": "kids cartoon Pixar-inspired",
  "gerador_usado": "nano_banana",
  "foto_referencia": "path/ref.png",
  "cobertura": [
    { "lado": "frontal", "imagem": "path/frontal.png", "proporcao": "21:9" },
    { "lado": "reverso", "imagem": "path/reverso.png", "proporcao": "21:9" },
    { "lado": "lateral_esq", "imagem": "path/lat_esq.png", "proporcao": "21:9" },
    { "lado": "lateral_dir", "imagem": "path/lat_dir.png", "proporcao": "21:9" },
    { "lado": "camera_alta", "imagem": "path/alta.png", "proporcao": "21:9" }
  ],
  "aproximacoes": [
    { "area": "porta", "imagem": "path/aprox_porta.png", "uso": "chegando/entrando", "ref_usada": "frontal", "proporcao": "16:9", "enquadramento": "médio levemente angulado" }
  ]
}
```

Este objeto alimenta o agente de keyframes, que usa os lados da cobertura e as aproximações como referência de background, adiciona o personagem e aperta o close + decide a câmera.

## Workflow da função

```
gerarAmbiente(foto_ref, infos) {
  descricao = travar(extrairDescricao(foto_ref, infos))
  iluminacao = travar(infos.iluminacao)
  
  cobertura = []
  for (lado of SET_DE_COBERTURA) {
    img = gerar(
      promptCobertura(lado, descricao, iluminacao),
      referencia = foto_ref,
      variacoes = 3
    )
    cobertura.push({ lado, imagem: aprovar(img) })
  }
  
  salvar({ id, nome, descricao, iluminacao, foto_ref, cobertura })
}
```

## Regras de qualidade (cobertura)

- SEMPRE 21:9 ultrawide (captura máximo de espaço horizontal)
- SEMPRE neutral eye-level (sem drama)
- SEMPRE empty, no characters
- SEMPRE a foto de referência anexada como âncora
- SEMPRE a frase de consistência presente
- Gerar 3 variações por lado, aprovar a melhor

## Limite técnico

A IA aproxima a geometria, não reproduz com precisão milimétrica. Para cartoon infantil, foto de referência + descrição travada + frase de consistência mantém os lados coerentes. Se precisar de precisão geométrica exata, só com modelagem 3D. Não prometa precisão de engenharia.

---

# PARTE 2 — APROXIMAÇÕES DE ÁREA (16:9)

Depois da cobertura pronta, gere aproximações de áreas específicas do ambiente (a região da porta, o canto do guarda-roupa, o lado da janela).

**Atenção ao que essas aproximações SÃO e NÃO SÃO:**

- ✅ São enquadramentos **médios, quase plano geral**, levemente angulados, com sensação de profundidade
- ✅ São **material de referência melhor** pra IA usar depois na geração dos frames com personagem
- ❌ NÃO são closes apertados de elementos
- ❌ NÃO são o enquadramento final dramático

O close apertado de verdade a IA faz **depois**, no estágio de keyframe, quando coloca o personagem. Essas aproximações só dão à IA um ponto de partida visual melhor daquela região — mais focado que a cobertura ampla, mas ainda com contexto e profundidade.

**Por que não apertar o close aqui:**
Um close apertado de um elemento vazio é referência ruim e mais difícil pra IA trabalhar. Uma aproximação média com profundidade entrega contexto + a área, o que é referência muito melhor. O aperto dramático fica pro keyframe com personagem.

As aproximações funcionam em **dois modos**:

1. **Automático** — você envia as fotos da cobertura e a skill decide quais áreas merecem aproximação, propondo a lista (área + uso sugerido)
2. **Manual** — você pede uma área específica ("aproximação da porta")

Elas:
- Ficam em **16:9** (a cobertura é 21:9)
- São **levemente anguladas** pra dar profundidade (nunca frontais retas)
- Usam o **lado de cobertura mais relevante** como referência
- São amarradas a um **uso narrativo**
- Continuam **neutras** — sem câmera dramática

Passo a passo dos dois modos, critérios de detecção, templates e schema em:

**`references/aproximacoes-de-area.md`**

---

## Fronteira com o resto do pipeline

```
gerador-ambientes (esta skill)
   ├── Parte 1: cobertura 21:9 (todos os lados, neutro)
   └── Parte 2: aproximações de área 16:9 (médias, neutras)
        ↓ alimenta
agente de keyframes → aperta o close + decide câmera + adiciona personagem
```

Esta skill produz todo o material de ambiente (cobertura + aproximações de área), sempre neutro e médio. O close apertado, a câmera dramática e o personagem são do estágio de keyframe.
