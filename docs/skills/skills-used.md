# Skills Utilizadas

Este documento detalha as principais competências técnicas aplicadas no desenvolvimento destas melhorias.

## 1. Controle de Layout para Impressão com CSS (Print Media Queries)
- **Técnica**: Utilização de `@media print` e regras como `size: A4 portrait/landscape`, `break-inside-avoid`, e `break-after-page` para formatação rigorosa de páginas físicas.
- **Aplicações**:
  - Encaixar exatamente 3 recibos por página A4 mantendo a proporção vertical.
  - Imprimir tabela de horas extras em modo paisagem sem cortar colunas.

## 2. Gerenciamento de Fila de Estado em Memória (React State Queue)
- **Técnica**: Manipulação de arrays complexos em memória com hooks `useState` e transições do React, incluindo operações de lote, mutações diretas via IDs e divisão de dados (chunks).
- **Aplicações**:
  - CRUD em lote de recibos.
  - Sincronização offline-first para impressão antes da persistência ou descarte.
