const fs = require('fs');
const path = require('path');

// 1. Update actions/employee.ts
const empPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'actions', 'employee.ts');
let empContent = fs.readFileSync(empPath, 'utf8');

if (!empContent.includes('logActivity')) {
  empContent = empContent.replace(
    'import { revalidatePath } from "next/cache";',
    'import { revalidatePath } from "next/cache";\nimport { logActivity } from "@/actions/activity-log";'
  );

  empContent = empContent.replace(
    '  revalidatePath("/colaboradores");\n}',
    '  await logActivity("CRIAR_COLABORADOR", `Nome: ${data.name} | Contrato: ${data.contractType}`);\n  revalidatePath("/colaboradores");\n}'
  );
  
  // Actually, wait, replacing like that might hit multiple revalidatePath calls. Let's do it manually.
  fs.writeFileSync(empPath, empContent, 'utf8');
}

// Better to write a Node script that accurately patches them.
const updateFunction = (content, funcName, insertBefore, logStatement) => {
  const funcStr = `export async function ${funcName}`;
  const idx = content.indexOf(funcStr);
  if (idx === -1) return content;
  
  const endIdx = content.indexOf(insertBefore, idx);
  if (endIdx === -1) return content;
  
  return content.slice(0, endIdx) + logStatement + '\n  ' + content.slice(endIdx);
};

let content = fs.readFileSync(empPath, 'utf8');
content = updateFunction(content, 'addEmployee', 'revalidatePath("/colaboradores");', 'await logActivity("CRIAR_COLABORADOR", `Nome: ${data.name} | Contrato: ${data.contractType}`);');
content = updateFunction(content, 'updateEmployee', 'revalidatePath("/colaboradores");', 'await logActivity("EDITAR_COLABORADOR", `ID: ${id}`);');
content = updateFunction(content, 'archiveEmployee', 'revalidatePath("/colaboradores");', 'await logActivity("ARQUIVAR_COLABORADOR", `ID: ${id}`);');
content = updateFunction(content, 'reactivateEmployee', 'revalidatePath("/colaboradores");', 'await logActivity("REATIVAR_COLABORADOR", `ID: ${id}`);');
fs.writeFileSync(empPath, content, 'utf8');
console.log('employee.ts patched');

// 2. Update actions/system-user.ts
const userPath = path.join('c:', 'Users', 'klgam', 'OneDrive', 'Documentos', 'Programacao', 'portal-falcon', 'actions', 'system-user.ts');
let userContent = fs.readFileSync(userPath, 'utf8');

if (!userContent.includes('logActivity')) {
  userContent = userContent.replace(
    'import { Role } from "@prisma/client";',
    'import { Role } from "@prisma/client";\nimport { logActivity } from "@/actions/activity-log";'
  );
  
  userContent = updateFunction(userContent, 'createSystemUser', 'revalidatePath("/configuracoes/usuarios");', 'await logActivity("CRIAR_USUARIO_SISTEMA", `Username: ${username} | Role: ${role}`);');
  userContent = updateFunction(userContent, 'updateSystemUserRole', 'revalidatePath("/configuracoes/usuarios");', 'await logActivity("ALTERAR_NIVEL_USUARIO", `ID: ${id} | Nova Role: ${newRole}`);');
  userContent = updateFunction(userContent, 'deleteSystemUser', 'revalidatePath("/configuracoes/usuarios");', 'await logActivity("EXCLUIR_USUARIO", `ID: ${id}`);');
  userContent = updateFunction(userContent, 'resetUserPassword', 'revalidatePath("/configuracoes/usuarios");', 'await logActivity("RESET_SENHA", `ID: ${id}`);');
  
  fs.writeFileSync(userPath, userContent, 'utf8');
  console.log('system-user.ts patched');
}
