import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin, Connect } from "vite"
import { defineConfig } from "vite"

import { parseWeekDocument } from "./src/lib/week-document"
import { validateHtmlFileName } from "./src/lib/html-page"
import {
  listWeeksInDirectory,
  writeWeekFile,
  createWeekFromPrevious,
} from "./server/weeks-store"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const weeksDir = path.resolve(
  process.env.WEEKS_DIR ?? path.resolve(rootDir, "weeks")
)

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

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
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
      // 監聽週報目錄中的 HTML 檔案變更，使外部編輯器存檔時能立即觸發瀏覽器完整重新載入更新預覽
      server.watcher.add(path.resolve(weeksDir, "**/*.html"))
      server.watcher.on("change", (file) => {
        if (file.startsWith(weeksDir) && file.endsWith(".html")) {
          server.ws.send({ type: "full-reload" })
        }
      })

      server.middlewares.use("/api/weeks", weeksApiMiddleware)
      server.middlewares.use("/weeks", (req, res, next) => {
        const requestPath = req.url?.split("?")[0] ?? ""

        const jsonMatch = /^\/(\d{4}-\d{2}-\d{2}\.json)$/.exec(requestPath)
        if (jsonMatch) {
          const fileName = jsonMatch[1]
          const filePath = path.resolve(weeksDir, fileName)
          if (!filePath.startsWith(weeksDir) || !fs.existsSync(filePath)) {
            next()
            return
          }

          res.setHeader("Content-Type", "application/json")
          fs.createReadStream(filePath).pipe(res)
          return
        }

        const htmlMatch = /^\/(\d{4}-\d{2}-\d{2})\/([^/]+)$/.exec(requestPath)
        if (htmlMatch) {
          const monday = htmlMatch[1]
          const htmlFile = htmlMatch[2]

          try {
            validateHtmlFileName(htmlFile)
          } catch {
            res.statusCode = 404
            res.end("Not found")
            return
          }

          const mondayDir = path.resolve(weeksDir, monday)
          const filePath = path.resolve(mondayDir, htmlFile)

          if (
            !filePath.startsWith(mondayDir) ||
            !fs.existsSync(filePath) ||
            !fs.statSync(filePath).isFile()
          ) {
            res.statusCode = 404
            res.end("Not found")
            return
          }

          res.setHeader("Content-Type", "text/html; charset=utf-8")
          fs.createReadStream(filePath).pipe(res)
          return
        }

        next()
      })
    },
    closeBundle() {
      const outputDir = path.resolve(rootDir, "dist/weeks")
      fs.mkdirSync(outputDir, { recursive: true })

      for (const entry of fs.readdirSync(weeksDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          fs.copyFileSync(
            path.resolve(weeksDir, entry.name),
            path.resolve(outputDir, entry.name)
          )
        } else if (
          entry.isDirectory() &&
          /^\d{4}-\d{2}-\d{2}$/.test(entry.name)
        ) {
          const targetSubDir = path.resolve(outputDir, entry.name)
          fs.mkdirSync(targetSubDir, { recursive: true })
          const sourceSubDir = path.resolve(weeksDir, entry.name)
          for (const file of fs.readdirSync(sourceSubDir)) {
            if (file.endsWith(".html")) {
              fs.copyFileSync(
                path.resolve(sourceSubDir, file),
                path.resolve(targetSubDir, file)
              )
            }
          }
        }
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
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, "index.html"),
        prototype: path.resolve(rootDir, "prototype.html"),
      },
    },
  },
})
