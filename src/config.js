import dotenv from "dotenv";

// Carregar variáveis de ambiente
dotenv.config();

// Validar variáveis obrigatórias
const required = [
  "OPENAI_API_KEY",
  "C_BACKEND_URL",
  "RABBITMQ_URL",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Variável de ambiente obrigatória não configurada: ${key}`);
    process.exit(1);
  }
}

// Exportar configurações
export const config = {
  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.2"),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "500"),
  },

  // Backend ZetaFin
  backend: {
    url: process.env.C_BACKEND_URL,
    timeout: parseInt(process.env.BACKEND_TIMEOUT || "10000"),
    // Adicionar JWT token quando implementar autenticação
    // jwtToken: process.env.BACKEND_JWT_TOKEN,
  },

  // RabbitMQ
  queue: {
    url: process.env.RABBITMQ_URL,
    name: "whatsapp_incoming",
    dlqName: "whatsapp_incoming_dlq",
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || "3"),
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || "5000"),
  },

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  },

  // Servidor
  server: {
    port: parseInt(process.env.PORT || "3000"),
    verifyToken: process.env.VERIFY_TOKEN || "minha_chave_segura",
    env: process.env.NODE_ENV || "development",
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || "info",
    directory: process.env.LOG_DIR || "logs",
  },

  // OCR
  ocr: {
    enabled: process.env.OCR_ENABLED === "true",
    language: process.env.OCR_LANGUAGE || "por",
  },
};

// Exportações individuais para compatibilidade
export const OPENAI_API_KEY = config.openai.apiKey;
export const C_BACKEND_URL = config.backend.url;
export const RABBITMQ_URL = config.queue.url;
export const VERIFY_TOKEN = config.server.verifyToken;

// Validação de URLs
try {
  new URL(config.backend.url);
} catch (error) {
  console.error(`❌ URL do backend inválida: ${config.backend.url}`);
  process.exit(1);
}

// Log de configurações (sem dados sensíveis)
if (config.server.env === "development") {
  console.log("⚙️ Configurações carregadas:");
  console.log("- Ambiente:", config.server.env);
  console.log("- Porta:", config.server.port);
  console.log("- Backend:", config.backend.url);
  console.log("- OpenAI Model:", config.openai.model);
  console.log("- OCR:", config.ocr.enabled ? "Habilitado" : "Desabilitado");
}