// 只提供 weeks-client 會讀到的 Response 欄位，讓 fetch stub 在各測試檔一致
export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}
