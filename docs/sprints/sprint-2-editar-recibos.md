# Sprint 2: Edição de Recibos Emitidos (Não Impressos)

Esta sprint adiciona a possibilidade de editar qualquer recibo que esteja na fila de impressão temporária.

## Checklist de Tarefas

- [x] Definir os estados `editingReceipt` (objeto `ReceiptItem` ou nulo) e `isEditModalOpen` (booleano) em `ReceiptGeneratorClient.tsx`.
- [x] Criar o modal de edição de recibo contendo:
  - [x] Campo de seleção para "Funcionário / Recebedor" (e subcampos manuais se selecionado manualmente).
  - [x] Campo de "Valor (R$)".
  - [x] Campo de "Data do Recibo".
  - [x] Campo de "Empresa Pagadora" (e subcampos manuais se pagador manual).
  - [x] Campo de "Referente a (Motivo)".
  - [x] Botão de "Salvar" (executa a atualização na fila) e "Cancelar" (fecha o modal).
- [x] Adicionar botão com ícone de lápis (`Edit2` ou `Pencil`) em cada item da listagem da fila de impressão (`receiptQueue`).
- [x] Implementar a lógica de salvamento:
  - [x] Substituir o item editado na fila com o novo conteúdo, preservando o ID exclusivo do item.
- [x] Validar a compilação do TypeScript e testar a integridade dos dados no estado do React.
