import { createGameHttpServer } from "./httpServer.ts";

const port = Number(process.env.PORT ?? 3001);
const server = createGameHttpServer();

server.listen(port, "127.0.0.1", () => {
  console.log(`RETRO SNAKE server listening on http://127.0.0.1:${port}`);
});

function shutdown(): void {
  server.close(() => process.exit(0));
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
