import path from "node:path"

// 單純 startsWith 會把 decks-evil/ 誤認為 decks/ 底下；以相對路徑判斷才不依賴 id 格式擋下路徑穿越
export function isPathInside(parentDir: string, candidate: string): boolean {
  const relative = path.relative(parentDir, candidate)
  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  )
}
