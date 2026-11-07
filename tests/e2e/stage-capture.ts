import { expect, test, type Page } from "@playwright/test"
import { writeFileSync } from "node:fs"

export async function fitAtCaptureSize(page: Page) {
  const stage = page.getByTestId("stage-frame")
  await expect(stage.locator(".stage-slide-host")).toBeVisible()
  await stage.evaluate((element) => {
    element.style.width = "1280px"
    element.style.maxWidth = "1280px"
    element.style.height = "720px"
  })
  await expect(async () => {
    const result = await stage.evaluate(async (element) => {
      const moduleUrl = "/src/lib/overflow-measurement.ts"
      const { measureStageOverflow } = await import(moduleUrl)
      return measureStageOverflow(element)
    })
    expect(result).toEqual({ status: "fit" })
    const box = await stage.boundingBox()
    expect([box?.width, box?.height]).toEqual([1280, 720])
  }).toPass()
}

export async function copyPng(page: Page, name: string) {
  await page.evaluate(() => navigator.clipboard.writeText("Pending capture"))
  await page.getByRole("button", { name: "Copy to clipboard" }).click()
  await expect(
    page.getByRole("status").filter({ hasText: "Copied" })
  ).toBeVisible()
  const bytes = Buffer.from(
    await page.evaluate(async () => {
      const item = (await navigator.clipboard.read())[0]
      return Array.from(
        new Uint8Array(await (await item.getType("image/png")).arrayBuffer())
      )
    })
  )
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([2560, 1440])
  writeFileSync(test.info().outputPath(name), bytes)
}
