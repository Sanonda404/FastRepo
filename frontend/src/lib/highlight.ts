import hljs from "highlight.js/lib/common"
import dart from "highlight.js/lib/languages/dart"
import dockerfile from "highlight.js/lib/languages/dockerfile"
import powershell from "highlight.js/lib/languages/powershell"

hljs.registerLanguage("dart", dart)
hljs.registerLanguage("dockerfile", dockerfile)
hljs.registerLanguage("powershell", powershell)

const EXTENSION_LANGUAGES: Record<string, string> = {
  // Web
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "javascript",
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "typescript",
  html: "xml", htm: "xml", svg: "xml", xml: "xml",
  css: "css", scss: "scss", sass: "scss", less: "less",
  // Scripting
  py: "python", rb: "ruby", php: "php", pl: "perl", lua: "lua",
  sh: "bash", bash: "bash", zsh: "bash", ksh: "bash",
  ps1: "powershell", psm1: "powershell",
  // Compiled / systems
  c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hxx: "cpp",
  cs: "csharp", go: "go", rs: "rust", java: "java", kt: "kotlin", kts: "kotlin",
  swift: "swift", dart: "dart",
  // Data / config
  json: "json", jsonc: "json", yml: "yaml", yaml: "yaml",
  ini: "ini", cfg: "ini", conf: "ini", properties: "ini",
  sql: "sql", graphql: "graphql", gql: "graphql",
  md: "markdown", markdown: "markdown", diff: "diff", patch: "diff",
}

const FILENAME_LANGUAGES: Record<string, string> = {
  dockerfile: "dockerfile",
  makefile: "makefile",
  gemfile: "ruby",
  rakefile: "ruby",
  vagrantfile: "ruby",
}

const DOTFILE_LANGUAGES: Record<string, string> = {
  ".gitignore": "plaintext",
  ".dockerignore": "plaintext",
  ".gitattributes": "plaintext",
  ".env": "plaintext",
  ".editorconfig": "ini",
  ".npmrc": "ini",
}

function languageFor(filename: string): string | undefined {
  const base = filename.toLowerCase().split("/").pop() ?? ""
  if (!base) return undefined
  if (FILENAME_LANGUAGES[base]) return FILENAME_LANGUAGES[base]
  const dot = base.lastIndexOf(".")
  if (dot < 1) return DOTFILE_LANGUAGES[base]
  return EXTENSION_LANGUAGES[base.slice(dot + 1)]
}

// Splits highlighted HTML into lines, closing and reopening any open <span> tags
// across line breaks so multi-line tokens (comments, strings) stay highlighted.
function splitIntoLines(html: string): string[] {
  const lines: string[] = []
  const openTags: string[] = []
  let current = ""
  let i = 0
  while (i < html.length) {
    const char = html[i]
    if (char === "\n") {
      lines.push(current + openTags.map((tag) => `</${tag}>`).join(""))
      current = openTags.map((tag) => `<${tag}>`).join("")
      i += 1
      continue
    }
    if (char === "<" && html.startsWith("<span", i)) {
      const end = html.indexOf(">", i)
      openTags.push(html.slice(i + 1, end))
      current += html.slice(i, end + 1)
      i = end + 1
      continue
    }
    if (char === "<" && html.startsWith("</span>", i)) {
      openTags.pop()
      current += "</span>"
      i += 7
      continue
    }
    current += char
    i += 1
  }
  lines.push(current + openTags.map((tag) => `</${tag}>`).join(""))
  return lines
}

export function highlightedLines(code: string, filename: string): string[] {
  const language = languageFor(filename)
  const html = language && hljs.getLanguage(language)
    ? hljs.highlight(code, { language, ignoreIllegals: true }).value
    : hljs.highlightAuto(code).value
  return splitIntoLines(html)
}
