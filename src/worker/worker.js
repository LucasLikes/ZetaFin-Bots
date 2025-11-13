import amqp from "amqplib";
import axios from "axios";
import { analyzeText } from "../npl/nlp.js";
import { processImage } from "../utils/ocr.js";
import { logger } from "../utils/logger.js";

async function startWorker() {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();

    await channel.assertQueue("whatsapp_incoming", { durable: true });
    logger.info("👷 Worker conectado ao RabbitMQ e aguardando mensagens...");

    channel.consume("whatsapp_incoming", async (msg) => {
      if (!msg) return;

      const content = JSON.parse(msg.content.toString());
      const { from, msg: text, mediaUrl, mediaType } = content;

      try {
        logger.info(`📩 Mensagem recebida de ${from}`);

        let messageText = text;

        if (mediaType?.startsWith("image/") && mediaUrl) {
          logger.info("🖼️ Imagem recebida — iniciando OCR...");
          messageText = await processImage(mediaUrl);
          logger.info("🔤 Texto extraído via OCR:", messageText);
        }

        // Passa o texto para o NLP
        const result = await analyzeText(messageText);
        logger.info("🧠 Resultado NLP:", result);

        // Envia pro backend
        await axios.post(process.env.C_BACKEND_URL, {
          from,
          msg: messageText,
          result,
        });

        logger.info("💾 Resultado enviado ao backend com sucesso!");
        channel.ack(msg);
      } catch (error) {
        logger.error("❌ Erro ao processar mensagem:", error.message);
        channel.nack(msg, false, false); // dead-letter
      }
    });
  } catch (err) {
    console.error("❌ Erro ao iniciar worker:", err.message);
  }
}

startWorker();
