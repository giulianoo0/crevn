# Seedance Multishot e Transições

Guia prático para converter um pré-plano em `reference frames` para Seedance sem perder continuidade entre shots. Use junto com `planos-e-angulos-cartoon.md`.

## Base observada no Seedance

Pelas páginas públicas do Seedance, o fluxo de vídeo expõe:

- `Start Image`
- `Between Images`
- `Reference Video`
- `Generate Audio`
- controles de movimento de câmera como `Pan`, `Zoom` e `Tilt`
- editor com até 3 vídeos de referência e até 9 imagens de referência

Leitura prática:

- O Seedance aceita sequência e continuidade, não só um frame único
- A câmera pode ser dirigida como movimento contínuo, então transições podem ser desenhadas como continuidade visual
- Como a UI expõe áudio separado, o fluxo desta skill deve manter a música desligada; voz e fala podem ser usados quando a cena pedir

## Regra principal

Multishot não é "várias ações aleatórias no mesmo prompt". Multishot é uma sequência de beats com continuidade visual controlada.

Pense assim:

1. Cada shot tem uma intenção clara
2. Cada transição tem um motivo
3. Cada shot seguinte herda um elemento do anterior
4. A mudança entre shots deve ser legível mesmo em frame estático

## Quando usar multishot

Use multishot quando a cena muda de:

- beat emocional
- posição de câmera
- espaço
- objetivo narrativo
- relação entre personagens
- revelação de informação

Use single-shot quando a mudança for pequena e couber numa única ação contínua.

Regra de preferência:

- `reference images` primeiro
- `start/end` só quando o movimento exigir interpolação mais rígida
- `Between Images` é a forma mais estável de desenhar continuidade entre shots

## Como montar a sequência para reference frames

Para cada shot, defina:

- `start frame`: início do estado visual
- `end frame`: estado final do shot
- `bridge frame`: só quando a transição precisa de ponte
- `anchor`: o que não muda entre shots

### Anchors úteis

Escolha pelo menos um:

- personagem principal
- figurino
- local
- direção de luz
- cor dominante
- objeto-chave

Se o shot 2 não compartilha nada com o shot 1, a continuidade fica fraca.

## Tipos de transição

### Hard cut

Use quando:

- muda o beat
- entra surpresa
- há conflito
- a mudança de espaço é intencional e clara

Como desenhar em reference frames:

- termine o shot anterior com composição limpa
- comece o próximo shot com novo enquadramento e nova intenção
- mantenha só o anchor compartilhado
- prefira dois `reference images` separados em vez de `start/end` quando a troca for um hard cut
- use `Between Images` só se precisar reforçar a ponte visual entre os dois shots

### Cut on action

Use quando:

- o personagem está andando, virando, apontando, pulando ou reagindo
- você quer continuidade energética

Como desenhar:

- o frame final do shot 1 deve mostrar a ação em andamento
- o frame inicial do shot 2 continua a mesma ação em outro ângulo ou distância
- preserve direção de movimento e screen direction

### Match cut

Use quando:

- dois shots diferentes devem parecer conectados por forma, gesto ou composição
- há uma rima visual

Como desenhar:

- repita forma, silhueta, pose ou objeto
- mude o contexto sem quebrar a leitura

### Bridge frame

Use quando:

- a troca de shot é importante, mas uma corte seco ficaria brusco demais
- a ação precisa "passar" pelo corte

Como desenhar:

- crie um frame intermediário que contenha a intenção dos dois shots
- mantenha a pose e a câmera parcialmente entre os estados

### Push-in / pull-back

Use quando:

- a emoção cresce ou afasta
- você quer um arco interno sem trocar de espaço

Como desenhar:

- mantenha o mesmo sujeito e o mesmo eixo
- varie só distância e intensidade

### Pan / tilt / zoom bridge

Use quando:

- a transição é interna ao próprio shot
- você quer chegar no próximo enquadramento sem corte agressivo

Como desenhar:

- declare um movimento único por vez
- não peça pan + zoom + tilt competindo entre si
- mantenha a motivação da câmera clara

## Padrões de sequência recomendados

### Cena de diálogo

1. Wide establish
2. OTS no personagem A
3. Reverse OTS no personagem B
4. Reaction shot

### Cena de revelação

1. Wide establish
2. Push-in para medium
3. Close-up de reação
4. Insert do objeto-chave

### Cena de confronto

1. Ensemble wide
2. Group OTS
3. Clean single no alvo
4. Reaction shot ou close-up

## Como usar em reference frames

Para cada shot da cena:

- gere um `reference image` principal para o shot
- gere um frame de saída quando houver movimento realmente controlado
- marque a transição no documento do frame
- repita o anchor visual em todos os shots conectados

Se a troca for brusca, o frame de saída e o frame de entrada devem diferir mais. Se a troca for suave, eles devem compartilhar mais composição, luz e direção de olhar.

## Regras de continuidade

- mantenha a regra dos 180° em diálogo
- mantenha a direção de entrada e saída do personagem
- não troque de lente, altura e eixo ao mesmo tempo
- não mude o foco da cena e o espaço no mesmo corte, a menos que isso seja a intenção
- não misture várias ações em um único shot

## Quando evitar transições sofisticadas

Evite complicar quando:

- a cena já está clara
- a ação é curta
- o personagem está estático
- o objetivo é só estabelecer o ambiente

Nesses casos, um corte seco simples é melhor.

## Regra de áudio

Para o fluxo desta skill:

- geração sempre sem música
- voz e fala podem ser pedidos quando a cena pedir
- ambiente sonoro só quando fizer parte do beat narrativo

Se o pipeline exigir um campo de áudio, deixe vazio ou desabilitado quando a intenção for silêncio. Se a cena precisar de voz, use só o necessário e mantenha música desligada.
