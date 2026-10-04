"use client";

/** 輕量 Markdown → HTML（標題、粗體、斜體、列表、程式碼、分隔線） */
export function renderMarkdown(src: string): string {
  if (!src) return "";
  let s = src.replace(/\r\n/g, "\n");

  s = s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");

  s = s.replace(/```[\w]*\n([\s\S]*?)```/g, (_m, code) => {
    return `<pre class="md-pre"><code>${code.trim()}</code></pre>`;
  });
  s = s.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');

  s = s.replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  s = s.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  s = s.replace(/^---+$/gm, '<hr class="md-hr" />');

  s = s.replace(/^(?:- |\* )(.+)(?:\n(?:- |\* ).+)*/gm, (block) => {
    const items = block
      .split("\n")
      .map((line) => line.replace(/^(?:- |\* )/, "").trim())
      .filter(Boolean)
      .map((t) => `<li>${t}</li>`)
      .join("");
    return `<ul class="md-ul">${items}</ul>`;
  });

  s = s.replace(/^(?:\d+\. )(.+)(?:\n(?:\d+\. ).+)*/gm, (block) => {
    const items = block
      .split("\n")
      .map((line) => line.replace(/^\d+\. /, "").trim())
      .filter(Boolean)
      .map((t) => `<li>${t}</li>`)
      .join("");
    return `<ol class="md-ol">${items}</ol>`;
  });

  const parts = s.split(/\n{2,}/);
  s = parts
    .map((p) => {
      const t = p.trim();
      if (!t) return "";
      if (/^<(h[1-3]|ul|ol|pre|hr|p|blockquote)/.test(t)) return t;
      return `<p class="md-p">${t.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return s;
}

export function MarkdownBody({ content }: { content: string }) {
  return (
    <div
      className="md-body"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
