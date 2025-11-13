import amqp from "amqplib";

let channel;
export async function connectQueue() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672");
  channel = await conn.createChannel();
  await channel.assertQueue("whatsapp_incoming", { durable: true });
  console.log("✅ RabbitMQ conectado");
}

export async function publishMessage(data) {
  if (!channel) await connectQueue();
  channel.sendToQueue("whatsapp_incoming", Buffer.from(JSON.stringify(data)), { persistent: true });
}
