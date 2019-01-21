import { config } from "dotenv";
config();

import { createServer, IncomingMessage } from "http";
import { createHmac } from "crypto";
import { exec } from "child_process";

if (!(process.env.SECRET && process.env.SCRIPT_PATH && process.env.PORT)) {
  throw new Error(
    "SECRET, SCRIPT_PATH, and PORT environment variables are required"
  );
}

const secret = process.env.SECRET!;
const scriptPath = process.env.SCRIPT_PATH!;
const port = process.env.PORT!;

export function readFullBody(request: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let body: Buffer[] = [];
    request
      .on("data", chunk => {
        body.push(chunk);
      })
      .on("end", () => {
        resolve(Buffer.concat(body));
      });
  });
}

export function bodyHash(body: Buffer, key: string) {
  const hash = createHmac("sha1", key)
    .update(body)
    .digest("hex");

  return `sha1=${hash}`;
}

export function runScript(pathToScript: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(scriptPath, (err, stdout, stderr) => {
      process.stdout.write(stdout);
      process.stderr.write(stderr);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const { headers } = req;
  const body = await readFullBody(req);

  const githubPayloadHash = headers["X-Hub-Signature"];
  const requestPayloadHash = bodyHash(body, secret);

  const hookEvent = headers["X-Github-Event"];

  if (githubPayloadHash !== requestPayloadHash) {
    res.statusCode = 500;
    res.write("Signatures don't match");
    return res.end();
  }

  switch (hookEvent) {
    case "push":
      try {
        await runScript(scriptPath);
      } catch (err) {
        res.statusCode = 500;
        res.write("script failed");
        return res.end();
      }
      res.statusCode = 200;
      res.write("success");
      return res.end();
    case "ping":
      res.statusCode = 200;
      res.write("pong");
      return res.end();
    default:
      res.statusCode = 500;
      res.write("Only responds to push events");
      return res.end();
  }
});

server.listen(port);
console.log(`listing for github webhooks on port ${port}`);
