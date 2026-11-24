// 作者文字只剩空白時視同沒寫：必填欄位算缺內容，選填欄位算缺席。
// 一條規則給 chrome、Deck Title 與 Export Readiness 共用，免得同一種空白在不同入口有不同結果

export function isBlank(text: string): boolean {
  return text.trim() === ""
}

// 有內容時保留原輸入，打字中的尾端空白才不會被吃掉
export function absentWhenBlank(text: string | undefined): string | undefined {
  return text === undefined || isBlank(text) ? undefined : text
}
