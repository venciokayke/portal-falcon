const assert = require("assert");

// Mocking the generateUUID logic to test it in Node environment
const generateUUID = (mockCrypto) => {
  const currentCrypto = mockCrypto !== undefined ? mockCrypto : (typeof crypto !== "undefined" ? crypto : undefined);
  
  if (currentCrypto !== undefined && typeof currentCrypto.randomUUID === "function") {
    return currentCrypto.randomUUID();
  }
  
  // RFC4122 version 4 compliant Math.random fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

function runTests() {
  console.log("=== INICIANDO ROTINA DE TESTES DO GERADOR DE RECIBOS ===");

  // Teste 1: Ambiente Seguro (com crypto.randomUUID disponível)
  console.log("\n[Teste 1] Simulação de Ambiente Seguro...");
  const mockCryptoSecure = {
    randomUUID: () => "secure-uuid-1234-5678"
  };
  const secureResult = generateUUID(mockCryptoSecure);
  assert.strictEqual(secureResult, "secure-uuid-1234-5678", "Deveria usar a API crypto.randomUUID() nativa");
  console.log("✓ Sucesso: Usou a API crypto nativa.");

  // Teste 2: Ambiente Não-Seguro (sem crypto.randomUUID disponível, p.ex. HTTP na rede interna)
  console.log("\n[Teste 2] Simulação de Ambiente Não-Seguro (HTTP da Empresa)...");
  const mockCryptoInsecure = {}; // sem randomUUID
  const insecureResult1 = generateUUID(mockCryptoInsecure);
  const insecureResult2 = generateUUID(mockCryptoInsecure);
  
  assert.notStrictEqual(insecureResult1, insecureResult2, "IDs gerados sucessivamente não deveriam ser iguais");
  console.log("✓ Sucesso: Gerou IDs dinâmicos diferentes.");

  // Teste 3: Validação do Padrão RFC4122 v4 no Fallback
  console.log("\n[Teste 3] Validação do Padrão RFC4122 v4...");
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(insecureResult1), `O ID '${insecureResult1}' deveria corresponder ao padrão UUID v4`);
  assert.ok(uuidRegex.test(insecureResult2), `O ID '${insecureResult2}' deveria corresponder ao padrão UUID v4`);
  console.log("✓ Sucesso: IDs gerados pelo fallback seguem o padrão RFC4122 v4.");

  // Teste 4: Teste de Integridade de Inserção de Item
  console.log("\n[Teste 4] Simulação de Inserção de Recibo na Fila...");
  const receiptQueue = [];
  const mockEmployee = { id: "emp-1", name: "ALEXANDRE DE SOUZA RAMOS", document: "111.222.333-44" };
  const mockValue = 500.50;
  const mockDescription = "Adiantamento Salarial";
  const mockPayingCompany = "FALCON SERVIÇOS LTDA";
  const mockDate = "2026-06-30";

  const newItem = {
    id: generateUUID(mockCryptoInsecure), // usa o fallback simulando o ambiente com falha
    employeeName: mockEmployee.name,
    document: mockEmployee.document,
    value: mockValue,
    description: mockDescription,
    payingCompany: mockPayingCompany,
    date: mockDate
  };

  receiptQueue.push(newItem);
  assert.strictEqual(receiptQueue.length, 1, "A fila de recibos deveria conter exatamente 1 item");
  assert.strictEqual(receiptQueue[0].employeeName, mockEmployee.name, "O nome do funcionário deveria corresponder");
  assert.ok(uuidRegex.test(receiptQueue[0].id), "O ID do recibo inserido deveria ser um UUID v4 válido");
  console.log("✓ Sucesso: Recibo estruturado e inserido na fila corretamente.");

  console.log("\n=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
}

try {
  runTests();
  process.exit(0);
} catch (error) {
  console.error("\n❌ FALHA NOS TESTES:");
  console.error(error.message);
  process.exit(1);
}
