# Aproximações de Área (Parte 2 do Gerador de Ambientes)

Referência completa para gerar aproximações de áreas específicas do ambiente. Use depois que a cobertura (Parte 1) estiver pronta.

## O que são as aproximações de área

São enquadramentos **médios, quase plano geral**, de regiões específicas do ambiente — a região da porta, o canto do guarda-roupa, o lado da janela. Levemente angulados pra dar profundidade. Neutros, sem personagens, em 16:9.

**O ponto central:** elas NÃO são closes apertados. São aproximações suaves que servem de **referência melhor** pra IA usar depois, quando for gerar os frames com personagem. O close apertado e dramático a IA faz nessa etapa posterior — aqui a gente só entrega um ponto de partida visual mais focado que a cobertura ampla, mas ainda com contexto e profundidade.

## O enquadramento correto

| Característica | Como deve ser |
|----------------|---------------|
| Distância | Média, quase plano geral — NÃO apertado |
| Ângulo | Levemente angulado (nunca frontal reto) |
| Profundidade | Sensação de profundidade, contexto ao redor visível |
| Foco | A região/área, mas com o entorno aparecendo |

**Errado:** close apertado da maçaneta da porta
**Certo:** enquadramento médio da região da porta, levemente de lado, mostrando a porta + o espaço ao redor com profundidade

## Por que não apertar o close aqui

1. Um close apertado de um elemento vazio é referência ruim — a IA tem pouco contexto pra trabalhar
2. Uma aproximação média com profundidade entrega contexto + a área = referência muito melhor
3. O aperto dramático depende do personagem e da intenção da cena — isso é decisão do keyframe, não do ambiente
4. Mantendo a aproximação suave, a mesma referência serve pra vários closes diferentes depois

## Os dois modos de operação

### Modo automático — a skill decide

Você envia as fotos da cobertura e a skill analisa, identifica as áreas que merecem aproximação e propõe a lista.

```
Entrada: as imagens de cobertura do ambiente
   ↓
A skill analisa e identifica áreas relevantes
   ↓
Propõe: lista de aproximações sugeridas (área + uso narrativo)
   ↓
Você aprova → gera as aproximações
```

**Critérios de detecção automática** (o que a skill procura nas imagens):

| Categoria | Exemplos | Por que merece aproximação |
|-----------|----------|----------------------------|
| Áreas interativas | região da porta, da gaveta, do interruptor | Personagem age ali |
| Entradas e saídas | porta, janela, escada | Momentos de chegada/saída |
| Áreas de móveis funcionais | canto da cama, da mesa, do guarda-roupa | Personagem interage na história |
| Áreas em destaque | qualquer região visualmente enfatizada | Provável relevância narrativa |

A skill olha a cobertura, encontra essas áreas e propõe uma aproximação média de cada, já sugerindo um uso narrativo provável.

### Modo manual — você pede

Você especifica a área e a skill gera direto, sem análise.

```
Entrada: cobertura + pedido específico ("aproximação da porta")
   ↓
A skill gera a aproximação daquela área
```

### Fluxo combinado recomendado

```
1. Skill roda automático  → propõe lista de aproximações
2. Você revisa            → remove/adiciona
3. Para cada aprovada:
     gera aproximação média 16:9, levemente angulada
```

## Escolha da referência: o lado certo da cobertura

Cada aproximação usa o lado de cobertura que melhor mostra aquela área:

| Área a aproximar | Lado de cobertura usado como referência |
|------------------|------------------------------------------|
| Região da porta | frontal |
| Canto do guarda-roupa (parede esquerda) | lateral_esq |
| Lado da janela (parede direita) | lateral_dir |
| Área da mesa central | frontal ou camera_alta |
| Área do fundo | reverso |

No modo automático, a skill escolhe a referência sozinha ao localizar a área na cobertura. No manual, escolhe pela área pedida.

## Prompts de aproximação

### Aproximação a partir da cobertura (Nano Banana — melhor)

```
[Anexar o lado de cobertura relevante]
"Using this reference image as the exact same location, generate a 
medium framing focused on the [ÁREA: door area / wardrobe corner / 
window side], slightly angled to create a sense of depth. Keep some 
distance — almost a wide shot, NOT a tight close-up — showing the 
area together with its surrounding context. Keep all elements, 
colors, lighting and style absolutely identical to the reference. 
Neutral, empty no characters, kids cartoon Pixar style, 16:9 widescreen."
```

### Aproximação a partir da cobertura (GPT Image)

```
[Anexar o lado de cobertura relevante]
"Create a medium framing of the [ÁREA] from this environment, 
slightly angled for depth. Keep distance — almost a wide shot, 
not a tight close-up — showing the area with surrounding context. 
Same design, colors, lighting and cartoon style as the reference. 
Neutral, no characters, 16:9 widescreen."
```

## As frases-chave (obrigatórias)

Duas instruções que não podem faltar:

> "slightly angled to create a sense of depth" — garante a profundidade

> "almost a wide shot, NOT a tight close-up" — impede o aperto excessivo

Sem essas duas, o modelo tende a apertar demais ou fazer um frontal chapado sem profundidade.

## Proporção: aproximações em 16:9

Ficam em **16:9**, diferente da cobertura (21:9). A cobertura é o espaço amplo; a aproximação é uma região focada. Ao usar um lado de cobertura 21:9 como referência, o modelo recorta pra 16:9 naturalmente — esperado e correto.

## Schema de armazenamento

As aproximações entram no array `aproximacoes` do mesmo objeto do ambiente:

```json
{
  "id": "amb-quarto-01",
  "...": "(cobertura da Parte 1)",
  "aproximacoes": [
    {
      "area": "porta",
      "imagem": "path/aprox_porta.png",
      "uso": "personagem chegando/entrando",
      "ref_usada": "frontal",
      "proporcao": "16:9",
      "enquadramento": "médio levemente angulado"
    },
    {
      "area": "guarda_roupa",
      "imagem": "path/aprox_guarda_roupa.png",
      "uso": "pegar roupa/mochila",
      "ref_usada": "lateral_esq",
      "proporcao": "16:9",
      "enquadramento": "médio levemente angulado"
    }
  ]
}
```

O campo `uso` é o que o agente de keyframes consulta pra puxar a aproximação certa.

## Como o agente de keyframes usa

```
Roteiro: "Tito chega e abre a porta"
→ busca o ambiente, aproximacoes onde uso = "chegando"
→ retorna a aproximação da porta (média, neutra, 16:9)
→ agente de keyframe usa como referência, adiciona Tito,
   e AGORA aperta o close + decide a câmera dramática
```

A aproximação é o ponto de partida. O close final apertado nasce aqui, com o personagem.

## Workflow das funções

### Modo automático — detecta e propõe

```
detectarAproximacoes(ambiente) {
  candidatos = []
  for (imagem of ambiente.cobertura) {
    areas = analisarImagem(imagem)   // procura áreas interativas,
                                      // entradas, móveis, destaques
    for (a of areas) {
      candidatos.push({
        area: a.nome,
        uso_sugerido: inferirUso(a),
        ref_sugerida: imagem.lado
      })
    }
  }
  return candidatos  // usuário revisa antes de gerar
}
```

### Geração (vale pros dois modos)

```
gerarAproximacao(ambiente, area, uso) {
  lado_ref = escolherLadoRelevante(ambiente, area)
  
  img = gerar(
    promptAproximacao(area),   // médio, angulado, com profundidade
    referencia = ambiente.cobertura[lado_ref],
    variacoes = 3
  )
  
  ambiente.aproximacoes.push({
    area, imagem: aprovar(img), uso,
    ref_usada: lado_ref, proporcao: "16:9",
    enquadramento: "médio levemente angulado"
  })
}
```

## Regras de qualidade

- SEMPRE médio/quase plano geral — NUNCA close apertado
- SEMPRE levemente angulado (profundidade), nunca frontal chapado
- SEMPRE neutral (sem drama)
- SEMPRE empty, no characters
- SEMPRE 16:9 widescreen
- SEMPRE o lado de cobertura relevante como referência
- SEMPRE as duas frases-chave (profundidade + não apertar)
- SEMPRE amarrar a um uso narrativo
- Gerar 3 variações, aprovar a melhor
- No automático, propor lista e deixar o usuário revisar antes de gerar

## Lembrete sobre a divisão de trabalho

```
Aproximação de área (aqui)     → médio, neutro, referência
        ↓
Keyframe com personagem (depois) → aperta o close + decide câmera
```

Esta etapa entrega referência boa. O close apertado e o drama nascem no keyframe, com o personagem dentro.
