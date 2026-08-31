import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin, Connect } from "vite"
import { defineConfig } from "vite"

import { parseWeekDocument } from "./src/lib/week-document"
import {
  listWeeksInDirectory,
  writeWeekFile,
  createWeekFromPrevious,
} from "./server/weeks-store"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const weeksDir = path.resolve(rootDir, "weeks")

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    req.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk))
    })

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"))
    })

    req.on("error", reject)
  })
}

function sendJson(
  res: ServerResponse,
  status: number,
  payload: unknown
): void {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json")
  res.end(JSON.stringify(payload))
}

function weeksApiMiddleware(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
): void {
  const url = req.url ?? ""

  if (url === "" || url === "/") {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed" })
      return
    }

    sendJson(res, 200, { weeks: listWeeksInDirectory(weeksDir) })
    return
  }

  const match = /^\/(\d{4}-\d{2}-\d{2})$/.exec(url)
  if (!match) {
    next()
    return
  }

  const monday = match[1]

  if (req.method === "PUT") {
    void readRequestBody(req)
      .then((body) => {
        const week = parseWeekDocument(JSON.parse(body))
        writeWeekFile(weeksDir, monday, week)
        sendJson(res, 200, { ok: true })
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Failed to save week file"
        sendJson(res, 400, { error: message })
      })
    return
  }

  if (req.method === "POST") {
    try {
      const week = createWeekFromPrevious(weeksDir, monday)
      sendJson(res, 201, { week })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create week file"
      const status = message.includes("already exists") ? 409 : 400
      sendJson(res, status, { error: message })
    }
    return
  }

  sendJson(res, 405, { error: "Method not allowed" })
}

function weeksStaticPlugin(): Plugin {
  return {
    name: "weeks-static",
    configureServer(server) {
      server.middlewares.use("/api/weeks", weeksApiMiddleware)
      server.middlewares.use("/weeks", (req, res, next) => {
        const requestPath = req.url?.split("?")[0] ?? ""
        const fileName = path.basename(requestPath)

        if (!fileName.endsWith(".json")) {
          next()
          return
        }

        const filePath = path.resolve(weeksDir, fileName)
        if (!filePath.startsWith(weeksDir) || !fs.existsSync(filePath)) {
          next()
          return
        }

        res.setHeader("Content-Type", "application/json")
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      const outputDir = path.resolve(rootDir, "dist/weeks")
      fs.mkdirSync(outputDir, { recursive: true })

      for (const fileName of fs.readdirSync(weeksDir)) {
        if (!fileName.endsWith(".json")) {
          continue
        }

        fs.copyFileSync(
          path.resolve(weeksDir, fileName),
          path.resolve(outputDir, fileName)
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), weeksStaticPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
})
