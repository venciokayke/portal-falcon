# Sprint 3: Redução do Tamanho dos Recibos na Impressão

Esta sprint otimiza o design e espaçamento dos recibos no PDF de impressão, permitindo que caibam até 3 recibos por página A4 vertical.

## Checklist de Tarefas

- [x] Modificar o particionamento da fila de impressão (`receiptQueue`) de chunks de 2 em 2 para chunks de 3 em 3 em `ReceiptGeneratorClient.tsx`.
- [x] Ajustar as classes de estilo para impressão (`print:`) para diminuir o tamanho dos blocos:
  - [x] Reduzir margens (`m-4` para `m-2`) e paddings internos (`p-8` para `p-4` ou `p-5`).
  - [x] Reduzir o tamanho da fonte do cabeçalho, corpo e data/assinaturas (ex: de `text-2xl` para `text-lg` e de `text-lg` para `text-sm`).
  - [x] Ajustar o layout do container de cada página para `print:h-[297mm]` com 3 elementos filhos flexíveis (`flex-1`).
- [x] Mapear as linhas de corte tracejadas (`✂️ Cortar aqui`) de forma que apareçam entre os recibos e nunca após o último item da página ou no rodapé.
- [x] Ajustar o tratamento de páginas contendo menos de 3 recibos (espaçador flexível) para evitar que o recibo seja esticado verticalmente.
- [x] Validar a visualização de impressão e verificar a formatação A4.
