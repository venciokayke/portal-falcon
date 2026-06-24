const fs = require('fs');
const path = require('path');

const targetPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'app', 'configuracoes', 'usuarios', 'components', 'UserFormModal.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const checkboxes = `
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Permissões Adicionais</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white border border-gray-200 p-4 rounded-lg">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="permissions" value="VIEW_DASHBOARD" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    Acessar Dashboard
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="permissions" value="MANAGE_EMPLOYEES" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    Gerenciar Colaboradores
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="permissions" value="MANAGE_SHIFTS" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    Lançar / Editar Ponto
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="permissions" value="MANAGE_PAYROLL" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    Gerenciar Folha e Pagamentos
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="permissions" value="VIEW_REPORTS" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    Acessar Relatórios (Contab./Benef.)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" name="permissions" value="VIEW_AUDIT" className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4" />
                    Visualizar Auditoria
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Usuários <strong>ADMIN</strong> já possuem todas as permissões. Use isto para granular o acesso de usuários <strong>USER</strong> ou <strong>MANAGER</strong>.
                </p>
              </div>
`;

content = content.replace(
  '<option value="ADMIN">ADMIN — Acesso Total</option>\n                </select>\n              </div>',
  '<option value="ADMIN">ADMIN — Acesso Total</option>\n                </select>\n              </div>\n' + checkboxes
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('UserFormModal updated');
