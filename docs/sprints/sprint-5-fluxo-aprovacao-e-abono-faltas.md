# Sprint 5: Fluxo de Aprovação de Folhas e Abono de Faltas

Esta sprint foca em implementar a submissão e aprovação mensal de folhas de pagamento/horas extras (com controle de permissões de edição) e o sistema de abono de faltas e períodos de afastamento de colaboradores.

## Checklist de Tarefas

- [x] **Modelagem do Banco de Dados (Prisma)**
  - [x] Adicionar o modelo `AbsenceExemption` no [schema.prisma](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/prisma/schema.prisma)
  - [x] Adicionar o modelo `PayrollStatus` no [schema.prisma](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/prisma/schema.prisma)
  - [x] Executar o comando para sincronizar o banco de dados (`npx prisma db push`)
- [x] **Regras de Negócio e Cálculos**
  - [x] Atualizar [calculatePayroll.ts](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/utils/calculatePayroll.ts) para receber e tratar abonos/afastamentos
  - [x] Ajustar a função `getExpectedWorkDays` para desconsiderar os dias contidos em períodos de afastamento no cálculo de dias previstos de trabalho
- [x] **Server Actions**
  - [x] Criar ações em [employee.ts](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/actions/employee.ts) para buscar, criar e excluir registros de abono/afastamento (`getAbsenceExemptions`, `addAbsenceExemption`, `deleteAbsenceExemption`)
  - [x] Criar arquivo [payroll-status.ts](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/actions/payroll-status.ts) com ações para obter status (`getPayrollStatus`), enviar para análise (`submitPayroll`), aprovar folha (`approvePayroll`) e rejeitar/devolver folha (`rejectPayroll`)
  - [x] Atualizar consultas ao banco de dados em [monthly-payroll.ts](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/actions/monthly-payroll.ts), [payroll.ts](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/actions/payroll.ts) e [page.tsx](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/app/page.tsx) para incluir `absenceExemptions`
- [x] **Interface Gráfica: Abono de Faltas**
  - [x] Desenvolver o modal de abonos/afastamentos `AbsenceExemptionModal.tsx` permitindo adicionar datas de início/fim e o motivo
  - [x] Adicionar o ícone de abonos (`CalendarRange`) na tabela de colaboradores [EmployeeTable.tsx](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/app/colaboradores/components/EmployeeTable.tsx)
- [x] **Interface Gráfica: Fluxo de Aprovação**
  - [x] Renderizar banner de status no topo da toolbar em [PayrollClient.tsx](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/app/folha/components/PayrollClient.tsx)
  - [x] Desativar edições (inputs e botões de alteração) para perfil `USER` se o status for `ENVIADO` ou `APROVADO`
  - [x] Adicionar botões de "Enviar para Análise" (para funcionários) e "Aprovar Folha" / "Recusar" (para gestores)
  - [x] Atualizar a tela de Horas Extras [ExtraHoursClient.tsx](file:///c:/Users/klgam/OneDrive/Documentos/Programacao/portal-falcon/app/horas-extras/components/ExtraHoursClient.tsx) para buscar o status da folha e aplicar os mesmos bloqueios de edição
- [x] **Validação e Compilação**
  - [x] Validar a integridade e rodar verificação do compilador TypeScript (`npx tsc --noEmit`)