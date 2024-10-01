const { spawn } = require("child_process");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const port = process.env.PORT || 3000;
const target = "http://de01.uniplex.xyz:5611";

app.use('/', createProxyMiddleware({
    target: target,
    changeOrigin: true,
    pathRewrite: (path, req) => {
        return path.replace('/', '');
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying request to: ${target}${req.url}`);
    }
}));

function startBotProcess(script) {
    const child = spawn("node", ["--trace-warnings", "--async-stack-traces", script], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    child.on("close", (codeExit) => {
        console.log(`${script} process exited with code: ${codeExit}`);
        if (codeExit !== 0) {
            setTimeout(() => startBotProcess(script), 3000);
        }
    });

    child.on("error", (error) => {
        console.error(`An error occurred starting the ${script} process: ${error}`);
    });
}

startBotProcess("main.js");
// startBotProcess("monitor.js");
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});