import { expect, test } from "@playwright/test"

import { resetE2eDecks } from "./decks-reset"

test.beforeEach(() => resetE2eDecks())

test("collapses and expands speaker notes from the title row", async ({
  page,
}) => {
  await page.goto("/")
  const toggle = page.getByRole("button", { name: /Speaker notes/i })
  await expect(toggle).toHaveAttribute("aria-expanded", "true")

  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "false")

  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
})

test("keeps speaker notes collapsed when the viewport size changes", async ({
  page,
}) => {
  await page.goto("/")
  const toggle = page.getByRole("button", { name: /Speaker notes/i })
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "false")

  const notes = page.getByText("No speaker notes", { exact: true })

  for (const viewport of [
    { width: 1440, height: 875 },
    { width: 1440, height: 1200 },
    { width: 1024, height: 768 },
    { width: 1440, height: 600 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
    )

    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(notes).toBeHidden()
  }

  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await expect(notes).toBeVisible()
})

test("moves speaker notes between below and beside the slide", async ({
  page,
}) => {
  await page.goto("/")
  const notes = page.getByText("No speaker notes", { exact: true })
  const resizeHandle = page.getByRole("separator", {
    name: "Resize speaker notes",
  })
  await expect(notes).toBeVisible()

  await page.getByRole("button", { name: "Move notes to right" }).click()

  await expect(resizeHandle).toHaveAttribute("aria-orientation", "vertical")
  await expect(notes).toBeVisible()
  const besideSlide = await page.getByTestId("stage-frame").boundingBox()
  const besideNotes = await notes.boundingBox()
  expect(besideSlide).not.toBeNull()
  expect(besideNotes!.x).toBeGreaterThanOrEqual(
    besideSlide!.x + besideSlide!.width
  )

  const handle = await resizeHandle.boundingBox()
  expect(handle).not.toBeNull()
  const handleX = handle!.x + handle!.width / 2
  const handleY = handle!.y + handle!.height / 2
  await page.mouse.move(handleX, handleY)
  await page.mouse.down()
  await page.mouse.move(handleX - 80, handleY, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(async () => (await notes.boundingBox())?.x)
    .toBeLessThan(besideNotes!.x)

  await page.getByRole("button", { name: "Move notes below slide" }).click()

  await expect(resizeHandle).toHaveAttribute("aria-orientation", "horizontal")
  await expect(notes).toBeVisible()
  const belowSlide = await page.getByTestId("stage-frame").boundingBox()
  const belowNotes = await notes.boundingBox()
  expect(belowSlide).not.toBeNull()
  expect(belowNotes!.y).toBeGreaterThanOrEqual(
    belowSlide!.y + belowSlide!.height
  )
})

test("keeps speaker notes collapsed when changing position and resizing beside the slide", async ({
  page,
}) => {
  await page.goto("/")
  const toggle = page.getByRole("button", {
    name: "Speaker notes",
    exact: true,
  })
  const notes = page.getByText("No speaker notes", { exact: true })
  await expect(notes).toBeVisible()
  await toggle.click()

  await page.getByRole("button", { name: "Move notes to right" }).click()

  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await expect(toggle).toBeVisible()
  await expect(notes).toBeHidden()

  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
    )
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(notes).toBeHidden()
  }

  await toggle.focus()
  await page.keyboard.press("Enter")
  await expect(notes).toBeVisible()
  await toggle.click()
  await page.getByRole("button", { name: "Move notes below slide" }).click()
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await expect(notes).toBeHidden()

  await toggle.click()
  await expect(notes).toBeVisible()
})

test("collapses and expands the editor panel from the header", async ({
  page,
}) => {
  await page.goto("/")
  const sidebarLabel = page.getByText("Sidebar", { exact: true })
  await expect(sidebarLabel).toBeVisible()

  await page.getByRole("button", { name: "Collapse editor panel" }).click()
  await expect(
    page.getByRole("button", { name: "Expand editor panel" })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(sidebarLabel).toBeHidden()

  await page.getByRole("button", { name: "Expand editor panel" }).click()
  await expect(sidebarLabel).toBeVisible()
})
