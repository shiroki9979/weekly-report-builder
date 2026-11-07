export type EntryMove = { from: number; to: number }

// 編輯器在清單兩端已停用移動按鈕；越界代表呼叫端狀態錯誤，必須明確失敗而不是默默保留原順序
export function moveEntry<T>(entries: readonly T[], move: EntryMove): T[] {
  assertMoveInRange(entries.length, move)
  const next = [...entries]
  const [entry] = next.splice(move.from, 1)
  next.splice(move.to, 0, entry)
  return next
}

function assertMoveInRange(length: number, { from, to }: EntryMove): void {
  const inRange = (index: number) =>
    Number.isInteger(index) && index >= 0 && index < length
  if (inRange(from) && inRange(to)) return
  throw new Error(`Cannot move entry ${from} to ${to} in a list of ${length}`)
}
