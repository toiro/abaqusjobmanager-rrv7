import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouterHonoServer({
      runtime: "bun",
      defaultLogger: false, // Disable Hono's default logger
      configure: (app) => {
        // Add custom LogTape-integrated HTTP logging
        const { httpLogger } = require("./app/lib/middleware/httpLogger");
        app.use("*", httpLogger());
      }
    }),
    reactRouter(),
    tsconfigPaths(),
  ],
});
