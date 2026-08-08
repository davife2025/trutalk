import { buildServer } from "./server";
import { env } from "./config/env";

const app = buildServer();

app
  .listen({ port: env.port, host: "0.0.0.0" })
  .then(() => app.log.info(`API listening on port ${env.port}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
