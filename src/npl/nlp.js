// src/nlp.js
import OpenAI from "openai";
import { OPENAI_API_KEY } from "./config.js";

const client = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function interpretMessage(messageText) {
  const today = new Date().toISOString();

  const prompt = `
Você é uma assistente financeira chamada BIA.
Sua tarefa é transformar frases do usuário em um JSON compatível com o endpoint /api/Transactions.

REGRAS:
- "type": 0 se for receita (ex: recebi, ganhei, entrou, depósito etc.)
- "type": 1 se for despesa (ex: gastei, paguei, comprei, saí etc.)
- "value": valor numérico extraído da frase (ex: 250.75)
- "description": breve descrição do gasto ou ganho.
- "category": tente identificar automaticamente (Alimentação, Transporte, Moradia, Lazer, Contas, Outros)
- "expenseType": 0 (sempre que for despesa, pois é saída variável)
- "date": use a data mencionada, ou a data de hoje se não houver.
- "hasReceipt": true.

IMPORTANTE:
- Retorne apenas o JSON puro, sem texto adicional.
- Se não conseguir interpretar o valor, devolva null.

Frase: "${messageText}"
Hoje é ${today}.
`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Você é um assistente que gera JSONs válidos." },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  // Tenta extrair JSON puro da resposta
  const raw = completion.choices[0].message.content.trim();
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}") + 1;
    const jsonString = raw.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonString);

    // Se não tiver data, adiciona
    if (!parsed.date) parsed.date = today;

    return parsed;
  } catch (err) {
    console.error("Erro ao parsear JSON do modelo:", err, raw);
    throw new Error("Não foi possível interpretar a mensagem");
  }
}
