import amqp from "amqplib";
import axios from "axios";
import { interpretMessage } from "../npl/nlp.js";
import { processImage } from "../utils/ocr.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";
import { sendWhatsAppMessage } from "../bot/twilioClient.js";

async function startWorker() {
  try {
    const conn = await amqp.connect(config.queue.url);
    const channel = await conn.createChannel();

    await channel.assertQueue("whatsapp_incoming", { durable: true });
    logger.info("👷 Worker conectado ao RabbitMQ e aguardando mensagens...");

    channel.consume("whatsapp_incoming", async (msg) => {
      if (!msg) return;

      const content = JSON.parse(msg.content.toString());
      const { from, text, mediaUrl, mediaType } = content;

      try {
        logger.info(`📩 Mensagem recebida de ${from}`);

        // ===== ETAPA 1: AUTENTICAÇÃO =====
        logger.info("🔐 Autenticando usuário via WhatsApp...");
        
        const authResponse = await axios.post(
          `${config.backend.url}/api/WhatsAppAuth/authenticate`,
          { whatsAppNumber: from }
        );

        if (!authResponse.data || !authResponse.data.token) {
          logger.warn(`⚠️ WhatsApp ${from} não está vinculado a nenhum usuário`);
          await sendWhatsAppMessage(
            from,
            "❌ Seu WhatsApp não está vinculado a nenhuma conta ZetaFin.\n\n" +
            "Para começar a usar, faça login no app e vincule seu número em Configurações > WhatsApp Bot."
          );
          channel.ack(msg);
          return;
        }

        const { token, userId, userName } = authResponse.data;
        logger.info(`✅ Usuário autenticado: ${userName} (${userId})`);

        // ===== ETAPA 2: PROCESSAR MENSAGEM =====
        let messageText = text;

        // Se houver imagem, processa OCR
        if (mediaType?.startsWith("image/") && mediaUrl) {
          logger.info("🖼️ Imagem recebida — iniciando OCR...");
          messageText = await processImage(mediaUrl);
          logger.info("🔤 Texto extraído via OCR:", messageText);
        }

        // ===== ETAPA 3: NLP =====
        logger.info("🧠 Processando NLP...");
        const result = await interpretMessage(messageText);
        logger.info("📊 Resultado NLP:", result);

        if (!result || !result.value) {
          await sendWhatsAppMessage(
            from,
            "❌ Não consegui interpretar sua mensagem.\n\n" +
            "Tente: 'Gastei 50 no Uber' ou 'Recebi 1000 de salário'"
          );
          channel.ack(msg);
          return;
        }

        // ===== ETAPA 4: ENVIAR PARA BACKEND =====
        const payload = {
          type: result.type,
          value: result.value,
          description: result.description,
          category: result.category,
          date: result.date,
          hasReceipt: result.hasReceipt ?? true
        };

        if (result.type === 1) {
          // Despesa
          payload.expenseType = result.expenseType ?? 1; // Padrão: Variáveis
        }

        logger.info("💾 Enviando transação ao backend...", payload);

        const transactionResponse = await axios.post(
          `${config.backend.url}/api/Transactions`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          }
        );

        logger.info("✅ Transação salva no backend!", transactionResponse.data);

        // ===== ETAPA 5: RESPOSTA FORMATADA =====
        const transaction = transactionResponse.data;
        const isIncome = result.type === 0;
        const emoji = isIncome ? "💰" : "💸";
        const typeText = isIncome ? "Receita" : "Despesa";
        
        const expenseTypeMap = {
          0: "Fixas",
          1: "Variáveis",
          2: "Desnecessários"
        };

        const replyText = `
${emoji} ${typeText} Registrada!

💵 Valor: R$ ${result.value.toFixed(2)}
📂 Categoria: ${result.category}
${!isIncome ? `🏷️ Tipo: ${expenseTypeMap[result.expenseType] || 'Variáveis'}` : ''}
📝 Descrição: ${result.description}
📅 Data: ${new Date(result.date).toLocaleDateString('pt-BR')}

✅ Salvo com sucesso no ZetaFin!
        `.trim();

        await sendWhatsAppMessage(from, replyText);
        logger.info("✅ Resposta enviada ao usuário");

        channel.ack(msg);

      } catch (error) {
        logger.error("❌ Erro ao processar mensagem:", error.message);

        if (error.response) {
          logger.error("Backend error:", error.response.data);
        }

        try {
          if (error.response?.status === 404) {
            await sendWhatsAppMessage(
              from,
              "❌ Seu WhatsApp não está vinculado.\n\n" +
              "Vincule no app: Configurações > WhatsApp Bot"
            );
          } else {
            await sendWhatsAppMessage(
              from,
              "❌ Ocorreu um erro ao processar sua mensagem.\n\n" +
              "Tente novamente em alguns instantes."
            );
          }
        } catch (twilioError) {
          logger.error("❌ Erro ao enviar resposta via Twilio:", twilioError.message);
        }

        channel.nack(msg, false, false);
      }
    });
  } catch (err) {
    logger.error("❌ Erro ao iniciar worker:", err.message);
  }
}

startWorker();