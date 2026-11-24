import { describe, expect, it } from "vitest"

import { absentWhenBlank, isBlank } from "@/lib/optional-text"

describe("optional text", () => {
  it.each(["", " ", "\n\t "])("treats %j as blank", (text) => {
    expect(isBlank(text)).toBe(true)
    expect(absentWhenBlank(text)).toBeUndefined()
  })

  it("keeps written text exactly as typed, trailing space included", () => {
    expect(isBlank(" Risks ")).toBe(false)
    expect(absentWhenBlank(" Risks ")).toBe(" Risks ")
  })

  it("passes absence through", () => {
    expect(absentWhenBlank(undefined)).toBeUndefined()
  })
})
