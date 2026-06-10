# Harness de Verificação

Este documento estabelece o conjunto de testes e verificações necessárias para atestar o sucesso da implementação.

## Checklist de Validação Geral

- [x] **Compilação**: Executar `npx tsc --noEmit` e garantir que não há erros de compilação TypeScript.
- [x] **Integração Visual**:
  - [x] Acessar `/horas-extras` e verificar se o tema é idêntico a `/folha` (botões azuis, focos e sombras).
  - [x] Verificar se funcionários pagos têm o ícone `CheckCircle2` inline.
- [x] **Edição de Recibos**:
  - [x] Adicionar um recibo manual.
  - [x] Clicar no botão de edição.
  - [x] Modificar todos os campos no modal de edição.
  - [x] Confirmar e verificar se a fila exibe os novos valores.
- [x] **Encaixe de Impressão**:
  - [x] Abrir a visualização de impressão (`window.print()`) com 3 recibos na fila.
  - [x] Verificar se ocupam uma única página A4 vertical sem quebra.
  - [x] Adicionar o 4º recibo e checar se passa para a segunda página corretamente.
  - [x] Validar a presença das linhas de corte.
- [x] **Conflito de Portas**: Garantir que o comando `npm run dev` força o uso da porta 3000 (prevenindo fallbacks silenciosos para a 3001) e verificar que não há redirecionamentos inconsistentes do NextAuth.
