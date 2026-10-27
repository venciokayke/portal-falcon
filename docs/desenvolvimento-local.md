# Testar no computador (Windows / PowerShell)

## Prévia preparada nesta sessão

A versão nova foi iniciada em **http://127.0.0.1:3001**, usando uma cópia do
banco local chamada `falcon_clone`, na porta 55433. As contas existentes foram
copiadas: use seu login habitual. As alterações feitas nessa prévia ficam na
cópia, sem afetar o `falcon_db` original.

A aplicação antiga continua na porta 3000. O contêiner
`falcon-validation-20261026` é temporário e foi criado com `--rm`; parar esse
contêiner descarta os bancos de validação. Um backup anterior à atualização está
em `scratch/db-backups/`, diretório ignorado pelo Git.

O banco original foi criado sem histórico de migrações. Ele **não foi alterado**.
Não execute `migrate deploy` diretamente nele: primeiro é necessário conciliar
o histórico, como foi validado na cópia. O schema da cópia antes da atualização
foi comparado ao schema anterior do repositório e não apresentou diferenças.

Validação executada: migrações desde banco vazio, persistência de almoço/anexo,
atualização da cópia existente, login real, páginas autenticadas, download de
atestado, revogação de sessão e salvamento de almoço/abono por Server Actions via
HTTP. A interação visual num navegador ainda precisa da conferência do usuário.

## Execução habitual

Se as dependências e o banco já estão preparados:

```powershell
docker compose up -d db
npm.cmd run dev
```

Abra http://localhost:3000. O Docker Desktop precisa estar aberto para iniciar
o PostgreSQL. `npm.cmd` e `npx.cmd` evitam o bloqueio de scripts `.ps1` do PowerShell.
Para parar o Next, pressione Ctrl+C. Para parar o banco sem apagar dados:
`docker compose stop db`.

## Preparar ou atualizar o ambiente local

1. Abra o Docker Desktop e espere o mecanismo de contêineres ficar disponível.
2. Se não houver `.env`, copie `.env.example` para `.env`. Use credenciais locais,
   `POSTGRES_PORT=5433` e `NEXTAUTH_URL=http://localhost:3000`.
3. Configure `DATABASE_URL` com o mesmo usuário, senha e banco do Compose:
   `postgresql://USUARIO:SENHA@localhost:5433/falcon_db?schema=public`.
   Caracteres especiais na senha precisam ser codificados para URL.
4. Gere um segredo para `NEXTAUTH_SECRET` com
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
5. Execute na raiz do projeto:

```powershell
npm.cmd ci
docker compose up -d db
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm.cmd run dev
```

Confirme que `DATABASE_URL` aponta para o banco **local** antes de migrar. Não use
os dados da instalação da Falcon para desenvolvimento. Se o Prisma indicar que
o banco existente não tem histórico de migrações, pare e concilie o histórico;
não execute `migrate reset` ou opções de perda de dados.

No primeiro uso de um banco vazio, `/setup` cria o administrador. Em um banco já
usado, entre com a conta existente. As alterações de segurança exigem novo login.

## Conferir as novas funcionalidades

- No ponto de um colaborador, adicione um turno de 08:00 a 17:20, com almoço de
  12:00 a 13:00, e clique em Salvar. O total deve ser **8:20**.
- Teste um turno de 19:00 a 07:00 e almoço de 00:30 a 01:30: total **11:00**.
- Clique no ícone de calendário do dia para abrir abonos/atestados. Confira as
  datas, selecione PDF/JPG/PNG até 5 MB e salve. A ação também abona o período.
- Verifique o indicador Abonado no dia e o download autenticado do documento.
  Excluir o abono também exclui o arquivo, após confirmação.
- Abra o grupo Jornada e pagamentos para acessar ponto, extras e folha.
- Gere uma prévia com salário-base cadastrado. Valores pagos e competências
  enviadas/aprovadas não podem ser editados sem reabertura/cancelamento apropriado.

## Verificações automáticas

```powershell
npm.cmd test
npm.cmd run build
```

A CI também executa `npm run test:db` num PostgreSQL descartável após aplicar
as migrações. Esse teste só aceita bancos chamados `falcon_ci` ou `falcon_test`;
ele reverte os registros de teste ao terminar.
