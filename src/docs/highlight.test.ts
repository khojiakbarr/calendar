import { describe, expect, it } from "vitest"
import { highlight, type CodeLanguage } from "./highlight"

const join = (source: string, language: CodeLanguage) =>
  highlight(source, language)
    .map((token) => token.text)
    .join("")

describe("highlight", () => {
  it.each<[CodeLanguage, string]>([
    ["tsx", 'const a = <Calendar height={460} label="x" /> // note'],
    ["ts", "import { a } from 'b'\nconst c = `t${1}`"],
    ["css", "@layer calendar;\n.a { --cal-accent: #3b82f6; width: 10px } /* x */"],
    ["bash", "npm i @hojiakbar_dev/calendar # install"],
  ])("gives back the %s source exactly when its tokens are joined", (language, source) => {
    expect(join(source, language)).toBe(source)
  })

  it("does not read a keyword out of the middle of a longer name", () => {
    const tokens = highlight("constant newValue", "ts")
    expect(tokens).toEqual([{ type: null, text: "constant newValue" }])
  })

  it("marks comments, strings and custom properties", () => {
    expect(highlight("// hi", "ts")[0]).toEqual({ type: "comment", text: "// hi" })
    expect(highlight('"a"', "tsx")[0]).toEqual({ type: "string", text: '"a"' })
    expect(highlight("--cal-accent: red", "css")[0]).toEqual({ type: "property", text: "--cal-accent" })
  })

  it("stops a string at the end of its line, so a stray quote cannot colour the rest", () => {
    const tokens = highlight('"open\nconst a', "ts")
    expect(tokens.find((token) => token.text === "const")?.type).toBe("keyword")
  })
})
