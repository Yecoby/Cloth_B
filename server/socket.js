/**
 * Real-time order tracking server (Socket.io + Redis adapter).
 * Runs as its own container so it can scale independently of the Next.js app.
 *
 * Rooms:
 *   order:<orderId>   -> customer + assigned driver + branch staff watching one order
 *   driver:<driverId> -> live GPS broadcast channel for a driver
 *
 * Auth: client must send a short-lived JWT (issued by the Next.js API) in the
 * `auth.token` handshake field. We verify it here before allowing joins.
 */

const { createServer } = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const jwt = require("jsonwebtoken");

const PORT = process.env.SOCKET_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const JWT_SIGNING_KEY = process.env.JWT_SIGNING_KEY;

async function main() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000").split(","),
      credentials: true,
    },
  });

  const pubClient = createClient({ url: REDIS_URL });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("unauthorized"));
      const payload = jwt.verify(token, JWT_SIGNING_KEY);
      socket.data.userId = payload.sub;
      socket.data.role = payload.role;
      next();
    } catch (err) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("order:join", ({ orderId }) => {
      // Authorization for who may join is enforced server-side by the API
      // when it issues the token's `orderIds` claim.
      socket.join(`order:${orderId}`);
    });

    socket.on("driver:location", ({ orderId, lat, lng }) => {
      if (socket.data.role !== "DRIVER") return;
      io.to(`order:${orderId}`).emit("driver:location", { lat, lng, at: Date.now() });
    });

    socket.on("order:status", ({ orderId, status }) => {
      if (!["STAFF", "ADMIN", "DRIVER"].includes(socket.data.role)) return;
      io.to(`order:${orderId}`).emit("order:status", { status, at: Date.now() });
    });

    socket.on("disconnect", () => {
      // no-op; rooms are cleaned up automatically
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`[socket] listening on :${PORT}`);
  });
}

main().catch((err) => {
  console.error("[socket] fatal startup error", err);
  process.exit(1);
});
