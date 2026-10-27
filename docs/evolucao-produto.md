# Evolução do Portal Falcon para produto modular

Análise inicial em 26/10/2026. Contexto: aplicação personalizada para a Falcon,
em contêineres num servidor local. A Falcon será o piloto das melhorias.
Esta análise priorizou autenticação, ponto, cálculo financeiro, schema e deploy;
não é uma auditoria exaustiva nem uma validação das regras trabalhistas.

## Decisão de arquitetura

Manter Next.js/TypeScript, Prisma e PostgreSQL nesta etapa. A troca para C# não
resolve permissões ausentes, regras financeiras divergentes ou isolamento de
dados. Não há medição de carga que justifique uma reescrita.

Evoluir como aplicação única dividida por domínio: identidade e acesso,
colaboradores, jornada, remuneração e relatórios. Cada domínio deve conter as
regras usadas pelas telas e pelas ações do servidor; o navegador não deve
decidir valores financeiros persistidos. Extrair serviços separados apenas
quando houver necessidade comprovada de implantação ou escala independente.

## Bloqueadores encontrados

1. `actions/system-user.ts`, `updateSystemUserPassword`: qualquer usuário
   autenticado consegue alterar a senha de outro usuário que não seja ADMIN.
   Restringir alteração de terceiros a ADMIN/MANAGER e exigir senha atual no
   fluxo de troca própria. Testar a matriz de papéis no servidor.
2. `actions/monthly-payroll.ts`, `togglePaymentStatus`, e `actions/overtime.ts`,
   `toggleOvertimeStatus`: exigem sessão, mas não o papel ADMIN/MANAGER.
   Um USER pode invocar as ações apesar de os botões serem limitados na tela.
3. `actions/shift.ts`, `actions/config.ts` e várias ações financeiras não
   verificam a permissão da operação. O proxy exige login, mas isso não substitui
   autorização por operação. Centralizar verificação consultando o usuário
   atual no banco e aplicá-la também nas páginas que consultam Prisma diretamente.
4. O JWT conserva papéis e permissões do login por até oito horas. Remover um
   privilégio ou usuário não invalida imediatamente essa informação. Revalidar
   o usuário no servidor nas operações protegidas e planejar revogação de sessão.
5. `utils/calculatePayroll.ts` e `TimeTrackingClient.tsx` arredondam cada turno
   para horas inteiras. Um turno de 8h20 vira 8h; três turnos perdem uma hora.
   Somar minutos inteiros e arredondar somente valores monetários na fronteira.
6. `TimeTrackingClient.tsx` envia `selectedMonth + 1` a `syncOvertimeEntry`,
   enquanto as prévias usam mês de 0 a 11. Janeiro pode ser sincronizado em
   fevereiro. Padronizar a competência e auditar registros existentes antes de
   qualquer migração; não deslocar todos os meses automaticamente.
7. `calculatePayroll` usa VA/VT fixos, conta ponto vazio como presença e adiciona
   uma hora por registro quando `receivesIntervalHour` está ativo, mesmo sem
   trabalho completo. A tela de ponto usa outro cálculo. Unificar o cálculo,
   separar intervalo realizado de verba de intervalo e testar os dois casos.
8. `generateMonthPreview` calcula salário CLT com taxa de extra vezes 220 em vez
   de usar `baseSalary`. `saveMonthlyPayrollRow` omite VT no total, ao contrário
   do salvamento em lote. Corrigir antes de automatizar pagamentos.
9. Edições de folha/extra permitem alterar valores pagos e salvamentos em lote
   não são atômicos. Bloquear competência fechada no servidor, usar transações
   e registrar reabertura com responsável e motivo. Proteger também contra
   edição concorrente entre fechamento e salvamento.
10. `docker-compose.yml` oferece senha e segredo de sessão previsíveis como
    padrão e publica a porta do PostgreSQL em todas as interfaces. Exigir
    segredos externos, restringir acesso ao banco e testar restauração de backup.
    A imagem final atual não inclui uma etapa operacional de migração.

Os itens 1 a 4 foram tratados na primeira etapa de segurança, descrita abaixo.
Os itens 5 a 9 receberam melhorias na segunda etapa, descrita abaixo; ainda
existem limites nas regras de benefícios e no histórico. O item 10 segue pendente.

### Primeira etapa implementada: acesso e senhas

- `lib/auth.ts` centraliza sessão, papel e permissões, com consulta do usuário
  atual no banco. As ações e as páginas dos módulos verificam acesso no servidor.
- Pagamento/cancelamento de folha e extras e aprovação/devolução exigem ADMIN
  ou MANAGER. Gerenciar folha ou ponto não concede o poder de aprovar pagamentos.
- A versão da sessão usa `SystemUser.updatedAt`, já existente no schema. Alterar
  uma conta pela aplicação invalida suas sessões; excluir a conta também impede
  acesso. Tokens anteriores a esta versão exigem novo login. Nenhuma migração de
  banco é necessária para esta etapa.
- Senha de terceiros só pode ser alterada por ADMIN/MANAGER; MANAGER não altera
  senha de ADMIN. Troca própria exige senha atual; troca obrigatória só funciona
  para contas nessa condição. O reset usa senha provisória aleatória e novos
  usuários precisam trocar a senha inicial. O reset próprio usa o fluxo com
  senha atual, evitando perder a senha provisória ao encerrar a própria sessão.
- A tabela de usuários recebe apenas os campos usados pela interface, sem hashes
  de senha. Edição da própria conta encerra a sessão e exige novo login.
- Contas sem acesso ao dashboard são encaminhadas ao primeiro módulo permitido.
  Contas sem módulos recebem uma mensagem para solicitar acesso ao administrador.
- Alteração de taxas globais exige ADMIN/MANAGER e rejeita valores inválidos.

`npm test` executa dez testes de segurança e a verificação existente de recibos.
Os testes carregam os módulos reais e substituem sessão, persistência e efeitos
do Next por simuladores; não são testes de integração com banco ou navegador.
Cobrem chamadas anônimas, falta de permissões, revogação de sessão, pagamentos,
trocas de senha, reset aleatório e validação de taxas. A CI executa essa suíte.

Antes de liberar na Falcon: conferir as permissões cadastradas para cada conta
e homologar o login e os fluxos de ADMIN, MANAGER e USER. Todos os usuários deverão
entrar novamente após a atualização. A segunda etapa abaixo trata bloqueio de
valores pagos e transações financeiras. Ainda faltam proteção contra tentativas repetidas de login e revisão
do primeiro acesso; esta entrega não equivale a uma auditoria de segurança completa.

### Segunda etapa implementada: jornada, atestados e apuração

- Cada dia do ponto oferece um botão de abonos/atestados. Ele abre o formulário
  existente com a data preenchida, mesmo em dias sem turno. O usuário pode
  ajustar o período e anexar PDF/JPG/PNG de até 5 MB. O formulário informa que
  salvar também abona o período. Não há lançamento automático de horas fictícias.
- O anexo é persistido junto ao abono no PostgreSQL. Listagens trazem somente
  metadados; o conteúdo sai por download autenticado para quem gerencia ponto ou
  colaboradores, sem cache e como anexo. Exclusão exige confirmação e remove
  período e arquivo. Upload e download registram autor/ação na auditoria.
- O upload verifica tamanho, extensão, MIME e assinatura básica. Isso não é
  antivírus. O armazenamento no banco simplifica a instalação on-premise, mas
  aumenta o tamanho dos backups; migrar para armazenamento privado de objetos
  quando o volume justificar. Não enviar atestados a serviços públicos de análise.
- Turnos recebem saída/retorno de almoço e são gravados por botão Salvar.
  Duração usa minutos, suporta virada noturna e desconta somente intervalo
  completo. Um intervalo incompleto não entra na apuração. Turnos sobrepostos
  são recusados. As folhas de conferência impressas mostram almoço/retorno.
- Registros anteriores continuam sem desconto presumido de almoço. A verba
  intervalar legada fica separada das horas reais e limitada a uma por dia
  completo sem intervalo informado, quando o benefício está habilitado. O crédito
  só gera valor ao ultrapassar a carga-base, preservando essa condição do cálculo legado.
  Essa regra de remuneração deve ser conferida com o DP no piloto.
- O cálculo compartilhado usa a paridade da competência, não arredonda cada
  turno, não conta ponto vazio como presença e usa datas lógicas UTC para abonos.
  A sincronização de extras passou para o servidor, dentro da transação de
  alteração do ponto. Valores calculados não são recebidos do navegador.
- A competência interna usa meses 0–11. O antigo envio de mês 1–12 pelo ponto
  foi removido; o alerta de folhas pendentes do dashboard também foi corrigido.
  Registros financeiros antigos não foram deslocados nem reclassificados.
- A prévia usa salário-base para CLT/PJ fixo e horas líquidas para horistas.
  Novos extras automáticos pertencem ao módulo de extras, evitando incluí-los
  também na folha. Rascunhos antigos podem conter duplicações e exigem conferência.
- Sincronizar folha recalcula base/VT de registros não pagos, preservando ajustes
  extras, descontos e observações. Sincronizar extras recalcula as horas a partir
  do ponto, preservando o ajuste monetário avulso. Horas inseridas manualmente
  serão substituídas pelo cálculo quando o ponto for alterado ou sincronizado.
- Edições financeiras em lote são atômicas; linhas pagas não podem ser alteradas.
  Competências enviadas/aprovadas exigem reabertura para edição. O salvamento
  individual da folha inclui VT, e totais de extras são recalculados no servidor.
- A barra lateral reúne ponto, extras e folha em Jornada e pagamentos, mantendo
  as permissões individuais. VA/VT diários ainda usam os valores legados e não há
  cálculo completo de encargos, convenções, feriados e adicionais legais.

Há duas migrações novas: uma aditiva reconcilia tabelas/campos do schema que não
estavam no histórico; outra adiciona almoço e anexos. Não há exclusão nem
conversão de dados financeiros. **Não aplicar na Falcon sem backup e ensaio em
uma cópia do banco**, pois a instalação existente pode ter divergências próprias.

A suíte agora possui 23 testes de segurança, jornada, upload/download e finanças,
além da verificação de recibos. A CI também está configurada para executar um
teste de persistência em PostgreSQL descartável após as migrações. Na validação
inicial, o Docker Desktop estava parado. Após iniciá-lo, as sete migrações foram
aplicadas em PostgreSQL vazio e o teste de persistência passou. Uma cópia do banco
local existente também foi atualizada após conciliação do histórico, sem alterar
o original. Login, páginas autenticadas, download, revogação de sessão e gravação
de almoço/abono foram verificados via HTTP real. A prévia está na porta 3001;
a conferência visual no navegador continua pendente. Consulte
[desenvolvimento local](desenvolvimento-local.md).

## Jornada e almoço

Adicionar início e fim do intervalo ao turno, com suporte a cruzar meia-noite.
Validar pares completos, ordem temporal, sobreposição e intervalo contido no
turno. Um ponto incompleto deve gerar pendência, nunca presença ou horas extras
definitivas. Usar minutos como unidade de cálculo.

Preservar registros antigos: ausência de horários de almoço não prova que não
houve intervalo. Manter identificação de legado e exigir conferência no primeiro
fechamento. Não descontar uma hora retroativamente de todo o histórico.

Mostrar entrada, saída para almoço, retorno e saída. Prever mais de um intervalo
somente se o piloto demonstrar essa necessidade. O intervalo trabalhado ou
indenizado deve ser uma rubrica separada, com regra aprovada pelo responsável
de departamento pessoal.

## Folha e horas extras

Fluxo proposto: ponto → conferência de pendências → apuração → revisão →
aprovação → pagamento → exportação para contabilidade.

Calcular no servidor com versão da regra e memória do cálculo: minutos de
trabalho, intervalos, escala aplicável na competência, taxa e ajustes manuais.
Separar pagamento de horas normais de horistas e pagamento de extras.
Impedir a inclusão da mesma verba em folha e em pagamento avulso.
Guardar os valores aprovados; mudar salário ou taxa atual não deve reescrever
um fechamento histórico. Recalcular apenas rascunhos, com comparação de valores.

Casos mínimos de teste: minutos fracionados, turno noturno, almoço noturno,
turno vazio, abono, paridade mensal, dezembro/janeiro, concorrência no fechamento,
valores pagos imutáveis e usuário sem permissão.

Unificar a barra lateral sob “Jornada e pagamentos”, com destinos internos
Ponto, Apuração de extras e Fechamento. Preservar rotas e permissões individuais;
o agrupamento visual não deve conceder acesso aos demais módulos.

## Comercialização: hipótese a validar

O encaixe inicial é gestão operacional de jornada, escalas e pré-fechamento
para empresas de serviços com equipes em postos, aproveitando a experiência
da Falcon. Validar com entrevistas e pilotos pagos antes de ampliar o escopo.
O código atual não comprova demanda, disposição a pagar ou conformidade de uma
folha completa.

Modelo inicial proposto: implantação paga mais assinatura base e faixa de
colaboradores ativos; módulos opcionais para jornada, financeiro e relatórios.
Precificar depois de medir custo de hospedagem, suporte, onboarding e economia
de tempo do cliente. Não há pesquisa de preços nem previsão de receita aqui.

Começar com instância e banco separados por cliente reduz a complexidade de
isolamento do primeiro piloto comercial. Automatizar provisionamento, backup e
atualização para evitar cópias divergentes do código. Posteriormente, se houver
demanda por SaaS compartilhado, introduzir organização, vínculo de usuários,
escopo por organização em tabelas e consultas e testes de acesso cruzado.
O enum `RegistrationCompany` atual representa empresas da Falcon e não é uma
fronteira de segurança entre clientes.

Antes do segundo cliente: substituir marcas e empresas fixas por configuração,
definir módulos contratados no servidor, exportação e encerramento de conta,
suporte e política de atualização. Validar as obrigações aplicáveis ao produto
com especialistas antes de vendê-lo como folha ou registro oficial de ponto.

## Entregas sugeridas

1. Segurança e confiabilidade: autorização, senhas, cálculos e testes de regressão.
2. Piloto Falcon: almoço, apuração única, fechamento protegido e menu agrupado.
3. Operação: homologação, backup/restauração, deploy e monitoramento.
4. Produto: configuração por cliente, módulos e primeiro piloto comercial pago.

Critérios do piloto: comparar o cálculo antigo e o novo numa competência
conferida, medir tempo de fechamento, divergências, correções manuais e horas
de suporte. Liberar a nova apuração gradualmente após aceite do responsável.

## CI/CD preparado no repositório

`.github/workflows/ci.yml`: PRs, push em main/master e execução manual.
Instala o lockfile, valida e gera Prisma, aplica migrações em PostgreSQL
descartável, executa a suíte de testes, TypeScript e build. Nenhum banco de
produção é usado. A suíte cobre autorização, senhas, jornada, anexos e cálculos; o teste antigo de recibos
simula a lógica do gerador e não cobre a apuração financeira.

`.github/workflows/container.yml`: execução manual, após CI, publica imagem
no GHCR com tag do commit somente a partir da branch padrão. Não faz deploy.
`.github/dependabot.yml`: propostas semanais para npm, Actions e Docker.
Esses arquivos só passam a executar após envio ao GitHub.

Também foi corrigida a pré-renderização de login/setup: a verificação de
primeiro acesso passa a ocorrer por requisição, permitindo construir a imagem
sem banco disponível durante o build. Validação local: TypeScript e teste de
recibos e build de produção aprovados. Workflows e publicação ainda precisam executar no GitHub;
não houve acesso nem alteração ao servidor da Falcon.

Para o CD on-premise: escolher um runner dedicado na rede interna, separado do
servidor de produção, com acesso restrito ao destino. Não executar código de PR
nesse runner. Configurar ambiente protegido no GitHub quando disponível no
plano, credenciais de escopo mínimo e aprovação de produção.

Sequência de entrega: construir uma imagem imutável → homologar → backup e
teste periódico de restauração → executar migrações com job/imagem próprios →
atualizar o app → verificar saúde e login → manter imagem anterior para reversão.
Usar migrações compatíveis com a versão anterior; reverter imagem não desfaz
alterações destrutivas do banco. Registrar resultado e versão implantada.

Pendências para ativar o CD: destino e mecanismo de acesso ao servidor,
responsável pelo runner, domínio/TLS, branch de produção, ambiente de homologação,
armazenamento/retensão de backups e janela de atualização da Falcon.

## Referências técnicas

- Autorização de Server Actions: https://nextjs.org/docs/app/guides/authentication
- Imagens e GHCR no Actions: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- Controles de upload: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
