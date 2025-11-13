import express from "express";
import { handleIncoming } from "../worker/worker.js";

export const router = express.Router();

// Endpoint que o Twilio chama
router.post("/webhook", handleIncoming);

// Endpoint simples para teste
router.get("/health", (req, res) => res.json({ status: "ok" }));
