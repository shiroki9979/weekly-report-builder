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
import { DECK_ID_SOURCE, isDeckId } from "./src/lib/deck-id"
import {
  listWeeksInDirectory,
  writeWeekFile,
  createWeekFromPrevious,
  WeekAlreadyExistsError,
} from "./server/weeks-store"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const weeksDir = path.resolve(
  process.env.WEEKS_DIR ?? path.resolve(rootDir, "weeks")
)
const WEEK_API_ROUTE = new RegExp(`^/(${DECK_ID_SOURCE})$`)
const WEEK_JSON_ROUTE = new RegExp(`^/(${DECK_ID_SOURCE}\\.json)$`)
const WEEK_HTML_ROUTE = new RegExp(`^/(${DECK_ID_SOURCE})/([^/]+)$`)

function copyInitializedWeeksForProductionBuild(
  sourceDir: string,
  outputDir: string
): void {
  // 只複製已存在的 runtime store；安裝仍只走 seedWeeksFromDemo，build 不隱含 seed
  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      `Runtime weeks store is missing at ${sourceDir}. Run \`pnpm seed:weeks\` before building; production build does not seed or create weeks/.`
    )
  }

  fs.mkdirSync(outputDir, { recursive: true })

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".json")) {
      fs.copyFileSync(
        path.resolve(sourceDir, entry.name),
        path.resolve(outputDir, entry.name)
      )
    } else if (entry.isDirectory() && isDeckId(entry.name)) {
      const targetSubDir = path.resolve(outputDir, entry.name)
      fs.mkdirSync(targetSubDir, { recursive: true })
      const sourceSubDir = path.resolve(sourceDir, entry.name)
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
}

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

  const match = WEEK_API_ROUTE.exec(url)
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
      const status = error instanceof WeekAlreadyExistsError ? 409 : 400
      sendJson(res, status, { error: message })
    }
    return
  }

  sendJson(res, 405, { error: "Method not allowed" })
}

function sendNotFound(res: ServerResponse): void {
  res.statusCode = 404
  res.end("Not found")
}

function serveWeekJson(fileName: string, res: ServerResponse): boolean {
  const filePath = path.resolve(weeksDir, fileName)
  if (!filePath.startsWith(weeksDir) || !fs.existsSync(filePath)) {
    return false
  }

  res.setHeader("Content-Type", "application/json")
  fs.createReadStream(filePath).pipe(res)
  return true
}

function serveWeekHtml(
  monday: string,
  htmlFile: string,
  res: ServerResponse
): void {
  try {
    validateHtmlFileName(htmlFile)
  } catch {
    sendNotFound(res)
    return
  }

  const mondayDir = path.resolve(weeksDir, monday)
  const filePath = path.resolve(mondayDir, htmlFile)
  if (
    !filePath.startsWith(mondayDir) ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    sendNotFound(res)
    return
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8")
  fs.createReadStream(filePath).pipe(res)
}

function weeksStaticMiddleware(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
): void {
  const requestPath = req.url?.split("?")[0] ?? ""

  const jsonMatch = WEEK_JSON_ROUTE.exec(requestPath)
  if (jsonMatch) {
    if (!serveWeekJson(jsonMatch[1], res)) {
      next()
    }
    return
  }

  const htmlMatch = WEEK_HTML_ROUTE.exec(requestPath)
  if (htmlMatch) {
    serveWeekHtml(htmlMatch[1], htmlMatch[2], res)
    return
  }

  next()
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
      server.middlewares.use("/weeks", weeksStaticMiddleware)
    },
    closeBundle() {
      copyInitializedWeeksForProductionBuild(
        weeksDir,
        path.resolve(rootDir, "dist/weeks")
      )
    },
  }
}

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
      },
    },
  },
})
