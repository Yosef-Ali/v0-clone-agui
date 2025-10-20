import { startServer } from "./server.js";
import { loadEnvironment } from "./utils/env.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  loadEnvironment();

  try {
    const { app, httpServer } = await startServer();

    const close = () => {
      logger.info("Received shutdown signal, closing server...");
      httpServer.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGINT", close);
    process.on("SIGTERM", close);

    logger.info(
      `Backend ready on port ${app.get("port")} (env: ${app.get("env")})`
    );
  } catch (error) {
    logger.error("Failed to start backend server", { error });
    process.exit(1);
  }
}

void bootstrap();
