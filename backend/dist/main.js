import { WebSocketServer } from "ws";
import express from "express";
import http from "http";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const prisma = new PrismaClient();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
wss.on("connection", (ws) => {
    console.log("A user connected");
    ws.on("message", async (data) => {
        const message = data.toString();
        if (message === "Person detected!") {
            const registro = await prisma.entrada.create({});
            wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        success: true,
                        data: [
                            {
                                hora: registro.hora,
                                id: registro.id,
                            },
                        ],
                    }));
                }
            });
        }
    });
    ws.on("close", () => {
        console.log("A user disconnected");
    });
});
app.get("/entradasActuales", async (req, res) => {
    const entradas = await prisma.entrada.findMany({
        orderBy: {
            id: "desc",
        },
    });
    res.json({
        success: true,
        number: entradas.length,
        data: entradas,
    });
});
app.get("/entradasHoy", async (req, res) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const entradas = await prisma.entrada.findMany({
        where: {
            hora: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        orderBy: {
            id: "desc",
        },
    });
    res.json({
        success: true,
        data: entradas.length,
    });
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://0.0.0.0:${PORT}`);
});
