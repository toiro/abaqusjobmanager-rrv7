import { reactRouter } from "@react-router/dev/vite";
import { reactRouterHonoServer } from "react-router-hono-server/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    reactRouterHonoServer({
      runtime: "bun",
      // configure: (app: any) => {
      //   // Add custom LogTape-integrated HTTP logging
      //   const { httpLogger } = require("./app/lib/middleware/http-logger");
      //   app.use("*", httpLogger());
      // }
    }),
    reactRouter(),
    tsconfigPaths(),
  ],
  ssr: {
    noExternal: [],
    external: ["bun:sqlite", "fs", "path"],
  },
  optimizeDeps: {
    exclude: ["bun:sqlite"]
  },
});
