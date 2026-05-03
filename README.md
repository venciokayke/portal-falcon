<body class="bg-slate-50 text-slate-800 font-sans leading-relaxed">
    <header class="bg-slate-900 text-white py-12 px-6 mb-10 shadow-lg">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-4xl font-bold mb-2">Portal Falcon </h1>
            <p class="text-slate-400 text-lg">Sistema de Gestão de Ponto e Folha de Pagamento</p>
            <div class="mt-4 flex gap-4 text-sm">
                <span class="bg-blue-600 px-3 py-1 rounded-full text-white">Versão 1.0</span>
                <span class="bg-slate-700 px-3 py-1 rounded-full text-slate-300">Engenharia de Software - 6º Período</span>
            </div>
        </div>
    </header>
    <main class="max-w-4xl mx-auto px-6 pb-20">
        <section class="mb-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h2 class="text-2xl font-bold mb-4 border-b pb-2 text-blue-800">1. Visão Geral</h2>
            <p class="mb-4">
                Desenvolvido para a Falcon Serviços, o Portal Falcon automatiza o controle de frequência e a gestão financeira de colaboradores registrados e não registrados. 
                O sistema resolve a complexidade das escalas 12x36 e as projeções mensais de benefícios.
            </p>
        </section>
        <section class="mb-12">
            <h2 class="text-2xl font-bold mb-6 flex items-center gap-2">
                <span class="bg-blue-100 p-2 rounded-lg text-blue-700"></span>
                Requisitos Funcionais
            </h2>
            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-lg mb-2 text-slate-700">Gestão de Ponto</h3>
                    <ul class="list-disc list-inside space-y-2 text-slate-600">
                        <li>Lançamento de múltiplos turnos por dia.</li>
                        <li>Tratamento de jornada que atravessa a meia-noite.</li>
                        <li>Impressão de folhas de ponto formatadas (A4).[cite: 1]</li>
                    </ul>
                </div>
                <div class="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <h3 class="font-bold text-lg mb-2 text-slate-700">Financeiro</h3>
                    <ul class="list-disc list-inside space-y-2 text-slate-600">
                        <li>Cálculo de Horas Extras (R$ 13,00/h).</li>
                        <li>Projeção de VA (R$ 26,00) e VT (R$ 8,60).</li>
                        <li>Desconto retroativo de faltas em benefícios.</li>
                    </ul>
                </div>
            </div>
        </section>
        <section class="mb-12 bg-amber-50 p-8 rounded-xl border border-amber-200">
            <h2 class="text-2xl font-bold mb-4 text-amber-800"> Regras de Negócio Críticas</h2>
            <div class="space-y-4">
                <div class="flex gap-4">
                    <strong class="min-w-[120px] text-amber-900">Escala 12x36:</strong>
                    <p>O sistema permite inverter a paridade (Par/Ímpar) manualmente para ajustar meses de 31 dias.</p>
                </div>
                <div class="flex gap-4">
                    <strong class="min-w-[120px] text-amber-900">Horistas:</strong>
                    <p>Contratos do tipo Horista são travados na escala personalizada (CUSTOM).</p>
                </div>
                <div class="flex gap-4">
                    <strong class="min-w-[120px] text-amber-900">Empresas:</strong>
                    <p>Funcionários são filtrados entre Falcon Service, Monitoramento e Não Registrados.</p>
                </div>
            </div>
        </section>
        <section class="mb-12">
            <h2 class="text-2xl font-bold mb-6"> Especificações Técnicas</h2>
            <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="p-4 border-b font-bold">Tecnologia</th>
                            <th class="p-4 border-b font-bold">Aplicação</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <tr>
                            <td class="p-4 font-medium">Next.js 14</td>
                            <td class="p-4">Framework Fullstack (App Router).</td>
                        </tr>
                        <tr>
                            <td class="p-4 font-medium">Prisma ORM</td>
                            <td class="p-4">Modelagem e comunicação com PostgreSQL.</td>
                        </tr>
                        <tr>
                            <td class="p-4 font-medium">Tailwind CSS</td>
                            <td class="p-4">Estilização responsiva e regras de impressão.</td>
                        </tr>
                        <tr>
                            <td class="p-4 font-medium">PostgreSQL</td>
                            <td class="p-4">Banco de dados relacional (pgAdmin).</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
        <footer class="mt-20 pt-10 border-t border-slate-200 text-center text-slate-500 text-sm no-print">
            <p>Documentação gerada por <strong>Kayke Borges Vêncio</strong></p>
            <p>Goiânia, 2026</p>
        </footer>
    </main>

</body>
</html>
