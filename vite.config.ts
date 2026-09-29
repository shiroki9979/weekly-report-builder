import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin, Connect } from "vite"
import { defineConfig } from "vite"

import { parseDeck } from "./src/lib/deck"
import { validateHtmlFileName } from "./src/lib/html-page"
import { DECK_ID_SOURCE, isDeckId } from "./src/lib/deck-id"
import {
  listDecksInDirectory,
  writeDeckFile,
  createWeekFromPrevious,
  DeckAlreadyExistsError,
} from "./server/decks-store"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const decksDir = path.resolve(
  process.env.DECKS_DIR ?? path.resolve(rootDir, "decks")
)
const DECK_API_ROUTE = new RegExp(`^/(${DECK_ID_SOURCE})$`)
const DECK_JSON_ROUTE = new RegExp(`^/(${DECK_ID_SOURCE}\\.json)$`)
const DECK_HTML_ROUTE = new RegExp(`^/(${DECK_ID_SOURCE})/([^/]+)$`)

function copyInitializedDecksForProductionBuild(
  sourceDir: string,
  outputDir: string
): void {
  // 只複製已存在的 runtime store；安裝仍只走 seedDecksFromDemo，build 不隱含 seed
  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      `Runtime decks store is missing at ${sourceDir}. Run \`pnpm seed:decks\` before building; production build does not seed or create decks/.`
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

function decksApiMiddleware(
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

    sendJson(res, 200, { decks: listDecksInDirectory(decksDir) })
    return
  }

  const match = DECK_API_ROUTE.exec(url)
  if (!match) {
    next()
    return
  }

  const deckId = match[1]

  if (req.method === "PUT") {
    void readRequestBody(req)
      .then((body) => {
        const deck = parseDeck(JSON.parse(body))
        writeDeckFile(decksDir, deckId, deck)
        sendJson(res, 200, { ok: true })
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Failed to save deck file"
        sendJson(res, 400, { error: message })
      })
    return
  }

  if (req.method === "POST") {
    try {
      const deck = createWeekFromPrevious(decksDir, deckId)
      sendJson(res, 201, { deck })
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create week file"
      const status = error instanceof DeckAlreadyExistsError ? 409 : 400
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

function serveDeckJson(fileName: string, res: ServerResponse): boolean {
  const filePath = path.resolve(decksDir, fileName)
  if (!filePath.startsWith(decksDir) || !fs.existsSync(filePath)) {
    return false
  }

  res.setHeader("Content-Type", "application/json")
  fs.createReadStream(filePath).pipe(res)
  return true
}

function serveDeckHtml(
  deckId: string,
  htmlFile: string,
  res: ServerResponse
): void {
  try {
    validateHtmlFileName(htmlFile)
  } catch {
    sendNotFound(res)
    return
  }

  const deckDir = path.resolve(decksDir, deckId)
  const filePath = path.resolve(deckDir, htmlFile)
  if (
    !filePath.startsWith(deckDir) ||
    !fs.existsSync(filePath) ||
    !fs.statSync(filePath).isFile()
  ) {
    sendNotFound(res)
    return
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8")
  fs.createReadStream(filePath).pipe(res)
}

function decksStaticMiddleware(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction
): void {
  const requestPath = req.url?.split("?")[0] ?? ""

  const jsonMatch = DECK_JSON_ROUTE.exec(requestPath)
  if (jsonMatch) {
    if (!serveDeckJson(jsonMatch[1], res)) {
      next()
    }
    return
  }

  const htmlMatch = DECK_HTML_ROUTE.exec(requestPath)
  if (htmlMatch) {
    serveDeckHtml(htmlMatch[1], htmlMatch[2], res)
    return
  }

  next()
}

function decksStaticPlugin(): Plugin {
  return {
    name: "decks-static",
    configureServer(server) {
      // 監聽 Deck 目錄中的 HTML 檔案變更，使外部編輯器存檔時能立即觸發瀏覽器完整重新載入更新預覽
      server.watcher.add(path.resolve(decksDir, "**/*.html"))
      server.watcher.on("change", (file) => {
        if (file.startsWith(decksDir) && file.endsWith(".html")) {
          server.ws.send({ type: "full-reload" })
        }
      })

      server.middlewares.use("/api/decks", decksApiMiddleware)
      server.middlewares.use("/decks", decksStaticMiddleware)
    },
    closeBundle() {
      copyInitializedDecksForProductionBuild(
        decksDir,
        path.resolve(rootDir, "dist/decks")
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), decksStaticPlugin()],
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
