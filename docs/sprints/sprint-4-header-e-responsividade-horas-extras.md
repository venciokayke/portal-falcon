# Sprint 4: Header, Alinhamento de Botões e Responsividade das Horas Extras

Esta sprint foca em levar o header do Fechamento de Folha para a página de Horas Extras, unificar os layouts de container e barra de ferramentas (toolbar) e otimizar a responsividade dos botões e filtros.

## Checklist de Tarefas

- [x] Atualizar o cabeçalho em `app/horas-extras/page.tsx`:
  - [x] Validar a integridade visual e a compilação do TypeScript.
  - [x] Copiar a estrutura flex-row e classes do cabeçalho de `app/folha/page.tsx`.
  - [x] Mudar a cor do ícone `Clock` para azul (`text-blue-600`), mantendo o ícone correto.
  - [x] Envolver o componente `<ExtraHoursClient />` em um container card com bordas arredondadas e sombra, idêntico ao de folha.
- [x] Ajustar o layout dos cabeçalhos das páginas (Folha e Horas Extras) com o padrão unificado:
  - [x] Atualizar `app/folha/page.tsx` para incluir o wrapper de ícone (`bg-blue-50 rounded-xl`), `print:hidden` e o alinhamento correto.
  - [x] Atualizar `app/horas-extras/page.tsx` para incluir o wrapper de ícone (`bg-blue-50 rounded-xl`) idêntico.
- [x] Alterar o botão "Sincronizar Funcionários" para "Sincronizar" com o ícone `RefreshCw` em `app/folha/components/PayrollClient.tsx`.
- [x] Mudar o ícone de Horas Extras de `Clock` para `Timer` no menu lateral (`components/Sidebar.tsx`) e na página (`app/horas-extras/page.tsx`) para evitar confusão com Lançamento de Ponto.
- [x] Implementar popover flutuante para o campo de observações:
  - [x] Adicionar popover e fallback de title em `app/folha/components/PayrollClient.tsx` para exibição de observações completas ao passar o mouse ou focar.
  - [x] Adicionar o mesmo componente popover e fallback em `app/horas-extras/components/ExtraHoursClient.tsx`.
- [x] Refatorar a barra de ferramentas (toolbar) em `app/horas-extras/components/ExtraHoursClient.tsx`:
  - [x] Alterar o wrapper raiz do componente (remover `space-y-6`).
  - [x] Alterar o wrapper da toolbar para usar borda inferior, sticky e sombra (`px-6 py-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden sticky top-0 z-10 shadow-sm`).
  - [x] Padronizar os seletores de mês/ano como selects individuais com o ícone de calendário separado, idênticos a folha.
  - [x] Ajustar as estatísticas/KPIs exibidos na barra superior para ficarem inline e com design idêntico a folha.
  - [x] Garantir o comportamento responsivo dos botões com `flex-wrap` e espaçamentos consistentes.



