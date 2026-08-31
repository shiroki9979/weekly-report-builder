import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { Plugin } from "vite"
import { defineConfig } from "vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const weeksDir = path.resolve(rootDir, "weeks")

function weeksStaticPlugin(): Plugin {
  return {
    name: "weeks-static",
    configureServer(server) {
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
