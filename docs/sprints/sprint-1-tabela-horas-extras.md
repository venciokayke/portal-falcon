# Sprint 1: Alinhamento Visual da Tabela de Horas Extras

Esta sprint foca em padronizar a tabela de Horas Extras para seguir a mesma identidade visual e de interação da tabela de Fechamento de Folhas.

## Checklist de Tarefas

- [x] Mudar o tema de cores de `ExtraHoursClient.tsx` de laranja para azul (botão salvar, filtros, destaques de inputs, etc.)
- [x] Atualizar o visual do botão de status de pagamento:
  - [x] Utilizar a estrutura de botões com cantos arredondados do fechamento de folha (`Pago` com background verde e ícone de check, `Pagar` com borda e círculo cinza).
  - [x] Implementar a desabilitação com spinner durante a transição (`statusTransition`).
- [x] Incluir o ícone de `CheckCircle2` inline ao lado do nome do funcionário caso o status seja `PAGO`.
- [x] Adicionar tag `<style>` com as configurações de `@media print` no topo de `ExtraHoursClient.tsx` forçando folha A4 paisagem (`landscape`) e ocultando os campos desnecessários no PDF.
- [x] Garantir que o design das linhas (`tr`) e dos inputs de observações siga exatamente os mesmos efeitos de hover e foco.
- [x] Validar integridade e compilação do TypeScript.
