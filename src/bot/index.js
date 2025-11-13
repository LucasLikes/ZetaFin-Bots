import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { router } from "./routes.js";
import { connectQueue } from "./queuePublisher.js";

dotenv.config();
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use("/", router);

connectQueue();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Bot rodando em http://localhost:${PORT}`));
