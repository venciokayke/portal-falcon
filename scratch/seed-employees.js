const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const mockEmployees = [
    {
      name: "ALEXANDRE DE SOUZA RAMOS",
      isActive: true,
      registrationCompany: "FALCON_SERVICE",
      contractType: "CLT",
      workSchedule: "SCALE_12X36",
      startParity: "NONE",
      hourlyRate: 14.50,
      paymentMethod: "PIX",
      pixType: "CPF",
      pixKey: "111.222.333-44",
      receivesVA: true,
      receivesVT: true,
      receivesIntervalHour: true,
      receivesNightHazard: true,
      workLocation: "SAMAMBAIA",
      standardHours: "18:00 AS 06:00"
    },
    {
      name: "BEATRIZ GONCALVES NUNES",
      isActive: true,
      registrationCompany: "FALCON_SERVICE",
      contractType: "CLT",
      workSchedule: "FIXED_220",
      startParity: "NONE",
      hourlyRate: null,
      paymentMethod: "BANCARIA",
      bankName: "Banco Itau",
      bankAgency: "0321",
      bankAccount: "98765-4",
      receivesVA: true,
      receivesVT: false,
      receivesIntervalHour: false,
      receivesNightHazard: false,
      workLocation: "BOI FORTE",
      standardHours: "08:00 AS 17:00",
      baseSalary: 1800.00
    },
    {
      name: "CRISTIANO ALVES MARTINS",
      isActive: true,
      registrationCompany: "FALCON_MONITORAMENTO",
      contractType: "CLT",
      workSchedule: "SCALE_12X36",
      startParity: "NONE",
      hourlyRate: 15.00,
      paymentMethod: "PIX",
      pixType: "PHONE",
      pixKey: "(61) 99999-8888",
      receivesVA: true,
      receivesVT: true,
      receivesIntervalHour: true,
      receivesNightHazard: true,
      workLocation: "SAMAMBAIA",
      standardHours: "18:00 AS 06:00"
    },
    {
      name: "DANIELA CARDOSO LOPES",
      isActive: true,
      registrationCompany: "FALCON_MONITORAMENTO",
      contractType: "CLT",
      workSchedule: "FIXED_220",
      startParity: "NONE",
      hourlyRate: null,
      paymentMethod: "PIX",
      pixType: "EMAIL",
      pixKey: "daniela.lopes@example.com",
      receivesVA: true,
      receivesVT: true,
      receivesIntervalHour: false,
      receivesNightHazard: false,
      workLocation: "BOI FORTE",
      standardHours: "08:00 AS 17:00",
      baseSalary: 1950.00
    },
    {
      name: "EDUARDO VIEIRA SANTOS",
      isActive: true,
      registrationCompany: "NAO_REGISTRADO",
      contractType: "PJ_FIXO",
      workSchedule: "CUSTOM",
      startParity: "NONE",
      hourlyRate: null,
      paymentMethod: "ESPECIE",
      receivesVA: false,
      receivesVT: false,
      receivesIntervalHour: false,
      receivesNightHazard: false,
      workLocation: "BOI FORTE",
      standardHours: "08:00 AS 18:00",
      baseSalary: 3500.00
    },
    {
      name: "FERNANDA REIS ROCHA",
      isActive: true,
      registrationCompany: "NAO_REGISTRADO",
      contractType: "PJ_HORISTA",
      workSchedule: "CUSTOM",
      startParity: "NONE",
      hourlyRate: 25.00,
      paymentMethod: "PIX",
      pixType: "EVP",
      pixKey: "123e4567-e89b-12d3-a456-426614174000",
      receivesVA: false,
      receivesVT: false,
      receivesIntervalHour: false,
      receivesNightHazard: false,
      workLocation: "SAMAMBAIA",
      standardHours: "10:00 AS 22:00"
    },
    {
      name: "GUSTAVO DUARTE BARBOSA",
      isActive: true,
      registrationCompany: "FALCON_SERVICE",
      contractType: "HORISTA",
      workSchedule: "CUSTOM",
      startParity: "NONE",
      hourlyRate: 10.00,
      paymentMethod: "PIX",
      pixType: "CPF",
      pixKey: "555.666.777-88",
      receivesVA: true,
      receivesVT: true,
      receivesIntervalHour: false,
      receivesNightHazard: true,
      workLocation: "BOI FORTE",
      standardHours: "19:00 AS 01:00"
    },
    {
      name: "HELENA PINTO ARAUJO",
      isActive: true,
      registrationCompany: "FALCON_SERVICE",
      contractType: "CLT",
      workSchedule: "SCALE_12X36",
      startParity: "NONE",
      hourlyRate: 14.50,
      paymentMethod: "PIX",
      pixType: "CPF",
      pixKey: "222.332.442-55",
      receivesVA: true,
      receivesVT: true,
      receivesIntervalHour: true,
      receivesNightHazard: true,
      workLocation: "SAMAMBAIA",
      standardHours: "06:00 AS 18:00"
    },
    {
      name: "IGOR TEIXEIRA COSTA",
      isActive: true,
      registrationCompany: "FALCON_MONITORAMENTO",
      contractType: "CLT",
      workSchedule: "SCALE_12X36",
      startParity: "NONE",
      hourlyRate: 14.80,
      paymentMethod: "PIX",
      pixType: "CPF",
      pixKey: "777.888.999-00",
      receivesVA: true,
      receivesVT: true,
      receivesIntervalHour: true,
      receivesNightHazard: true,
      workLocation: "SAMAMBAIA",
      standardHours: "06:00 AS 18:00"
    },
    {
      name: "JULIANA MELLO MOREIRA",
      isActive: true,
      registrationCompany: "NAO_REGISTRADO",
      contractType: "PJ_FIXO",
      workSchedule: "CUSTOM",
      startParity: "NONE",
      hourlyRate: null,
      paymentMethod: "PIX",
      pixType: "EMAIL",
      pixKey: "juliana.mello@example.com",
      receivesVA: false,
      receivesVT: false,
      receivesIntervalHour: false,
      receivesNightHazard: false,
      workLocation: "BOI FORTE",
      standardHours: "09:00 AS 18:00",
      baseSalary: 4200.00
    }
  ];

  console.log("Iniciando a carga de colaboradores de teste...");
  for (const emp of mockEmployees) {
    // Verificar se já existe colaborador com o mesmo nome para evitar duplicados
    const existing = await prisma.employee.findFirst({
      where: { name: emp.name }
    });

    if (!existing) {
      await prisma.employee.create({
        data: emp
      });
      console.log(`Colaborador criado: ${emp.name}`);
    } else {
      console.log(`Colaborador já existe: ${emp.name}`);
    }
  }
  console.log("Carga concluída com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro na execução do seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
