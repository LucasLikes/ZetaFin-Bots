import express from "express";
import { publishMessage } from "./queuePublisher.js";

export const router = express.Router();

// Twilio chama esse endpoint quando chega uma mensagem
router.post("/webhook", async (req, res) => {
  try {
    const { From, Body } = req.body;
    console.log(`📩 Mensagem recebida de ${From}: ${Body}`);

    await publishMessage({ from: From, text: Body, timestamp: Date.now() });

    // Confirma recebimento (Twilio exige resposta 200)
    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
  } catch (err) {
    console.error("❌ Erro no webhook Twilio:", err);
    res.status(500).send("Erro interno");
  }
});

// Endpoint simples para teste
router.get("/health", (req, res) => res.json({ status: "ok" }));
