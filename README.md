# Portal Falcon

Sistema de Gestão Integrada de Recursos Humanos, Folha de Pagamento e Controle de Ponto desenvolvido exclusivamente para a **Falcon Serviços e Monitoramento LTDA**.

![Versão](https://img.shields.io/badge/Versão-1.1-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-indigo)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-cyan)

---

## 1. Visão Geral

Desenvolvido para resolver a complexidade administrativa da Falcon, o **Portal Falcon** automatiza o controle de frequência e a gestão financeira de colaboradores registrados e não registrados. O sistema é desenhado para tratar as peculiaridades de escalas de trabalho dinâmicas (ex: 12x36), cálculo de horas extras e as projeções mensais de benefícios com base no comparecimento real.

## 2. Requisitos e Funcionalidades

### Gestão de Colaboradores e Acesso
- **Controle de Acesso Baseado em Níveis (RBAC)**: Diferenciação entre perfis `ADMIN`, `MANAGER` e `USER` via NextAuth.
- **Tipos de Contratos Flexíveis**: Suporte para CLT, PJ Fixo, PJ Horista e Horista Padrão.
- **Gestão de Empresas**: Separação estrutural de colaboradores da *Falcon Service*, *Falcon Monitoramento* e *Não Registrados*.
- **Arquivamento Seguro**: Preservação de histórico financeiro para colaboradores desligados/arquivados.

### Gestão de Ponto (Time Tracking)
- **Lançamento de Múltiplos Turnos**: Suporte a diversos cartões de ponto no mesmo dia.
- **Tratamento de Virada de Dia**: Contagem correta para plantões que atravessam a meia-noite.
- **Impressão Profissional**: Otimizado para geração de PDFs em formato A4, formatados para assinatura em papel.

### Inteligência Financeira e Folha de Pagamento
- **Mecanismo de Faltas Automático**: O sistema mapeia os dias úteis (para CLT/220h) e dias da escala (para 12x36 Par/Ímpar) e subtrai automaticamente as faltas sobre os benefícios (Vale Alimentação e Transporte). Escalas do tipo "CUSTOM" (Horistas/PJ) não geram faltas enganosas.
- **Horas Extras Simplificadas**: Inserção direta de horas, calculadas em tempo real com base no salário ou em taxas da plataforma.
- **Configurações Globais**: Taxas base de Hora Extra, Diária de VA e Diária de VT controláveis centralmente via painel (engrenagem de configuração).
- **Projeções Futuras**: O sistema prevê o quanto de Vale Transporte e Vale Alimentação a empresa deverá carregar para o próximo mês.

### Dashboard e Relatórios
- **Quadro de Avisos Dinâmico**: Alertas automáticos para plantões que ficaram "abertos" (sem saída registrada) e notificação crítica do 5º Dia Útil para folhas ainda não pagas.
- **Projeção Variável**: Soma em tempo real de todos os custos flexíveis (Benefícios + Horas Trabalhadas/Extras) previstos para o mês.
- **Gerador de Recibos Avulsos**: Ferramenta completa para gerar comprovantes em PDF para terceiros ou adiantamentos salariais.

## 3. Regras de Negócio Críticas

1. **Escala 12x36**: O sistema define matematicamente os dias de trabalho baseados no mês e se o funcionário iniciou em um dia `PAR` ou `ÍMPAR`. A paridade pode ser ajustada a qualquer momento para compensar meses de 31 dias.
2. **Exigência CLT**: Colaboradores das filiais registradas (Falcon Service / Monitoramento) são validados rigidamente pelo portal para que não tenham contratos sem carteira assinada.
3. **Bloqueio de Pagamento (Operacional)**: O clique final para marcar uma Folha ou Hora Extra como "PAGA" é estritamente limitado aos cargos Administrativos ou de Gerência. Usuários com acesso `USER` apenas inserem dados e visualizam o sistema.
4. **Modais Globais**: Nenhum `alert()` ou `confirm()` de navegador padrão é utilizado no sistema. A usabilidade depende de Modais construídos no React usando design limpo e moderno (`AlertModal` e `ConfirmModal`).

## 4. Especificações Técnicas

| Tecnologia | Aplicação |
| :--- | :--- |
| **Next.js 14** | Framework Fullstack usando a arquitetura moderna (App Router), Server Actions para integração ágil e sem APIs intermediárias complexas. |
| **Prisma ORM** | Modelagem do banco de dados relacional e tipagem fim-a-fim no TypeScript. |
| **PostgreSQL** | Banco de Dados relacional, estável e escalável, hospedado via Docker ou Localmente. |
| **NextAuth v4** | Gerenciamento de Sessão, JWT, criptografia de senhas (bcrypt) e controle de rotas seguras. |
| **Tailwind CSS** | Estilização utilitária, responsividade e regras rígidas de formatação para impressão física (`print:hidden`, `print:appearance-none`). |
| **Lucide React** | Biblioteca unificada de ícones SVGs e sem utilização de emojis nativos de sistema operacional. |

---

<p align="center">
  <br>
  Documentação mantida e gerada por <strong>Kayke Borges Vêncio</strong><br>
  Goiânia, 2026
</p>
