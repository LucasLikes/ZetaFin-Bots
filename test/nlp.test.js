import { jest } from "@jest/globals";
import { interpretMessage, validateTransaction } from "../src/npl/nlp.js";

// Mock do OpenAI
jest.mock("openai", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe("NLP - Interpretação de Mensagens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("interpretMessage()", () => {
    test("deve interpretar uma despesa corretamente", async () => {
      const message = "Gastei 150 no mercado";

      const result = await interpretMessage(message);

      expect(result).toMatchObject({
        type: 1, // Despesa
        value: expect.any(Number),
        description: expect.any(String),
        category: expect.any(String),
        expenseType: expect.any(Number),
        date: expect.any(String),
      });

      expect(result.value).toBeGreaterThan(0);
    });

    test("deve interpretar uma receita corretamente", async () => {
      const message = "Recebi 2000 de salário";

      const result = await interpretMessage(message);

      expect(result).toMatchObject({
        type: 0, // Receita
        value: 2000,
        expenseType: null,
      });
    });

    test("deve categorizar alimentação corretamente", async () => {
      const message = "Paguei 80 no restaurante";

      const result = await interpretMessage(message);

      expect(result.category).toBe("Alimentação");
    });

    test("deve categorizar contas fixas corretamente", async () => {
      const message = "Paguei a conta de luz de 120 reais";

      const result = await interpretMessage(message);

      expect(result.category).toBe("Contas Fixas");
      expect(result.expenseType).toBe(0); // Fixas
    });

    test("deve detectar comprovante quando mencionado", async () => {
      const message = "Gastei 50 no mercado, tenho o comprovante";

      const result = await interpretMessage(message);

      expect(result.hasReceipt).toBe(true);
    });

    test("deve usar data de hoje quando não especificada", async () => {
      const message = "Gastei 100 reais";

      const result = await interpretMessage(message);

      const today = new Date().toISOString().split("T")[0];
      expect(result.date).toBe(today);
    });

    test("deve lançar erro para mensagem inválida", async () => {
      const message = "Olá, como vai?";

      await expect(interpretMessage(message)).rejects.toThrow();
    });
  });

  describe("validateTransaction()", () => {
    test("deve validar transação válida", () => {
      const transaction = {
        type: 1,
        value: 100,
        description: "Teste",
        category: "Alimentação",
        expenseType: 1,
        date: "2025-11-13",
      };

      expect(() => validateTransaction(transaction)).not.toThrow();
    });

    test("deve rejeitar transação sem campo obrigatório", () => {
      const transaction = {
        type: 1,
        value: 100,
        // Faltando description
        category: "Alimentação",
        date: "2025-11-13",
      };

      expect(() => validateTransaction(transaction)).toThrow("description");
    });

    test("deve rejeitar despesa sem expenseType", () => {
      const transaction = {
        type: 1, // Despesa
        value: 100,
        description: "Teste",
        category: "Alimentação",
        // Faltando expenseType
        date: "2025-11-13",
      };

      expect(() => validateTransaction(transaction)).toThrow("expenseType");
    });

    test("deve aceitar receita sem expenseType", () => {
      const transaction = {
        type: 0, // Receita
        value: 100,
        description: "Teste",
        category: "Salário",
        date: "2025-11-13",
      };

      expect(() => validateTransaction(transaction)).not.toThrow();
    });
  });
});

describe("Categorização Automática", () => {
  const testCases = [
    { message: "Gastei 50 no supermercado", expected: "Alimentação" },
    { message: "Paguei 30 de Uber", expected: "Transporte" },
    { message: "Comprei roupa por 80", expected: "Compras" },
    { message: "Consulta médica 150", expected: "Saúde" },
    { message: "Aluguel de 1200", expected: "Moradia" },
    { message: "Cinema 40 reais", expected: "Lazer" },
  ];

  testCases.forEach(({ message, expected }) => {
    test(`deve categorizar "${message}" como ${expected}`, async () => {
      const result = await interpretMessage(message);
      expect(result.category).toBe(expected);
    });
  });
});

describe("Extração de Valores", () => {
  const testCases = [
    { message: "Gastei 150", expected: 150 },
    { message: "Paguei 150.50", expected: 150.5 },
    { message: "R$ 1.500,00", expected: 1500 },
    { message: "Mil reais", expected: 1000 },
  ];

  testCases.forEach(({ message, expected }) => {
    test(`deve extrair valor ${expected} de "${message}"`, async () => {
      const result = await interpretMessage(message);
      expect(result.value).toBe(expected);
    });
  });
});