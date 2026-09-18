import { expect, test } from "@playwright/test"

test("fails closed when the capture root is missing", async ({ page }) => {
  await page.goto("/tests/e2e/overflow-harness.html")
  const result = await page.evaluate(async () => {
    return window.measureStageOverflow(document.body)
  })
  expect(result).toEqual({
    status: "measurement-failed",
    message: "Capture measurement root was not found",
  })
})

test("reports descendant overflow on both axes with a 1px tolerance", async ({
  page,
}) => {
  await page.goto("/tests/e2e/overflow-harness.html")
  const result = await page.evaluate(async (attr) => {
    const root = document.createElement("div")
    root.setAttribute(attr, "")
    root.style.cssText =
      "width:1280px;height:720px;overflow:hidden;position:relative;"
    const child = document.createElement("div")
    child.style.cssText =
      "position:absolute;left:1290px;top:730px;width:20px;height:20px;"
    child.textContent = "x"
    root.append(child)
    document.body.append(root)
    return window.measureStageOverflow(root)
  }, "data-stage-capture-root")

  expect(result.status).toBe("overflow")
  if (result.status === "overflow") {
    expect(result.axes).toEqual(
      expect.arrayContaining(["horizontal", "vertical"])
    )
  }
})

test("treats a 1px overshoot as fit", async ({ page }) => {
  await page.goto("/tests/e2e/overflow-harness.html")
  const result = await page.evaluate(async (attr) => {
    const root = document.createElement("div")
    root.setAttribute(attr, "")
    root.style.cssText =
      "width:1280px;height:720px;overflow:hidden;position:relative;"
    const child = document.createElement("div")
    child.style.cssText =
      "position:absolute;left:0;top:0;width:1280.5px;height:720.5px;"
    root.append(child)
    document.body.append(root)
    return window.measureStageOverflow(root)
  }, "data-stage-capture-root")

  expect(result).toEqual({ status: "fit" })
})

test("times out when fonts never settle", async ({ page }) => {
  await page.goto("/tests/e2e/overflow-harness.html")
  const result = await page.evaluate(async (attr) => {
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: new Promise(() => undefined) },
    })
    const root = document.createElement("div")
    root.setAttribute(attr, "")
    root.style.cssText = "width:1280px;height:720px;"
    document.body.append(root)
    return window.measureStageOverflow(root, { timeoutMs: 50 })
  }, "data-stage-capture-root")

  expect(result.status).toBe("measurement-failed")
  if (result.status === "measurement-failed") {
    expect(result.message).toMatch(/timed out/i)
  }
})
