import amqp from "amqplib";
import axios from "axios";
import { analyzeText } from "../npl/nlp.js";
import { processImage } from "../utils/ocr.js";
import { logger } from "../utils/logger.js";
import { config } from "../config.js";
import { sendWhatsAppMessage } from "../bot/twilioClient.js"; // <- Twilio

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

        let messageText = text;

        // Se houver imagem, processa OCR
        if (mediaType?.startsWith("image/") && mediaUrl) {
          logger.info("🖼️ Imagem recebida — iniciando OCR...");
          messageText = await processImage(mediaUrl);
          logger.info("🔤 Texto extraído via OCR:", messageText);
        }

        // Passa o texto para o NLP
        const result = await analyzeText(messageText);
        logger.info("🧠 Resultado NLP:", result);

        if (!result) {
          await sendWhatsAppMessage(from, "❌ Não consegui interpretar sua mensagem.");
          channel.ack(msg);
          return;
        }

        // Envia para o backend
        const payload = {
          type: result.type,
          value: result.value,
          description: result.description,
          category: result.category,
          date: result.date,
          hasReceipt: result.hasReceipt ?? true
        };

        if (result.type === 1) {
          // despesa
          payload.expenseType = result.expenseType ?? 0;
        }

        await axios.post(`${config.backend.url}/api/Transactions`, payload);
        logger.info("💾 Resultado enviado ao backend com sucesso!");

        // Resposta ao usuário via Twilio
        const replyText = `Feito! R$${result.value.toFixed(2)} em ${result.category} no controle 📦 💼\n\n💸\nGasto Registrado!\nValor:\nR$ ${result.value.toFixed(2)}\nCategoria:\n${result.category}\nTipo:\n${result.type === 0 ? 'Receita' : 'Saída Variável'}\nDescrição:\n${result.description}\nData:\n${new Date(result.date).toLocaleDateString('pt-BR')}`;

        await sendWhatsAppMessage(from, replyText);

        channel.ack(msg);
      } catch (error) {
        logger.error("❌ Erro ao processar mensagem:", error.message);

        try {
          await sendWhatsAppMessage(from, "❌ Ocorreu um erro ao processar sua mensagem.");
        } catch (twilioError) {
          logger.error("❌ Erro ao enviar resposta via Twilio:", twilioError.message);
        }

        channel.nack(msg, false, false); // envia para dead-letter
      }
    });
  } catch (err) {
    logger.error("❌ Erro ao iniciar worker:", err.message);
  }
}

// Endpoint para o webhook (POST /webhook)
export async function handleIncoming(req, res) {
  res.status(200).send("ok");
}

// Inicializa o worker
startWorker();
