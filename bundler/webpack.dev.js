// bundler/webpack.dev.js
const path = require("path");
const { merge } = require("webpack-merge");
const commonConfiguration = require("./webpack.common.js");
const portFinderSync = require("portfinder-sync");
const os = require("os");

function lanAddress() {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) return net.address;
      }
    }
  } catch {}
  return "localhost";
}

const infoColor = (m) => `\u001b[1m\u001b[34m${m}\u001b[39m\u001b[22m`;

module.exports = merge(commonConfiguration, {
  mode: "development",
  stats: "errors-warnings",
  infrastructureLogging: { level: "warn" },

  devtool: "eval-cheap-module-source-map",

  devServer: {
    // v5 schema — do NOT put `https` here. Use `server` instead.
    server: "http",                              // or: { type: "http" } ; use "https" if you need TLS
    host: "0.0.0.0",
    port: portFinderSync.getPort(5174),
    open: false,
    allowedHosts: "all",
    hot: true,                                   // HMR
    liveReload: true,
    historyApiFallback: true,

    static: {
      directory: path.join(__dirname, "../static"),
      watch: true,
    },

    watchFiles: ["src/**", "static/**"],

    client: {
      overlay: true,
      logging: "info",
      progress: false,
    },

    // Valid in v5; replaces deprecated onAfterSetupMiddleware
    setupMiddlewares(middlewares, devServer) {
      const server = devServer && devServer.server;
      if (server) {
        server.on("listening", () => {
          const addr = server.address();
          const port = typeof addr === "object" && addr ? addr.port : devServer.options.port;
          const proto = (devServer.options.server && devServer.options.server.type === "https") ? "https" : "http";
          const local = `${proto}://localhost:${port}`;
          const lan = `${proto}://${lanAddress()}:${port}`;
          console.log(`Project running at:\n  - ${infoColor(lan)}\n  - ${infoColor(local)}`);
        });
      }
      return middlewares;
    },
  },
});
