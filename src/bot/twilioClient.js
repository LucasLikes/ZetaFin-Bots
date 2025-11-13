// src/bot/twilioClient.js
import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendWhatsAppMessage(to, body) {
  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to,
      body,
    });
    console.log("✅ Mensagem enviada:", message.sid);
    return message;
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem Twilio:", err.message);
    throw err;
  }
}
