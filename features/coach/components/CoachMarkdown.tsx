import type { ReactNode } from "react";

// Tiny markdown renderer for Mia's replies: paragraphs, headings, bullet and numbered
// lists, **bold**, *italic* and `code`. It builds React elements (never raw HTML),
// so text coming from the AI cannot inject markup. It also works on a half-streamed reply.

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    if (/^(\*\*|__).+\1$/.test(part)) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (/^(\*|_).+\1$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>;
    if (/^`.+`$/.test(part)) {
      return (
        <code key={index} className="rounded bg-surface px-1 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

type Block = { kind: "p" | "h"; lines: string[] } | { kind: "ul" | "ol"; items: string[] };

function blocksOf(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of markdown.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    const last = blocks.at(-1);
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line);

    if (!line) {
      blocks.push({ kind: "p", lines: [] }); // blank line closes the current block
    } else if (bullet || numbered) {
      const kind = bullet ? "ul" : "ol";
      const item = (bullet ?? numbered)![1];
      if (last?.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (heading) {
      blocks.push({ kind: "h", lines: [heading[1]] });
    } else if (last?.kind === "p") {
      last.lines.push(line);
    } else {
      blocks.push({ kind: "p", lines: [line] });
    }
  }
  return blocks.filter((block) => ("items" in block ? block.items.length : block.lines.length));
}

export function CoachMarkdown({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2">
      {blocksOf(text).map((block, index) => {
        if ("items" in block) {
          const List = block.kind;
          return (
            <List
              key={index}
              className={`flex flex-col gap-1 pl-5 ${block.kind === "ul" ? "list-disc" : "list-decimal"}`}
            >
              {block.items.map((item, i) => (
                <li key={i}>{inline(item)}</li>
              ))}
            </List>
          );
        }
        if (block.kind === "h") {
          return (
            <p key={index} className="font-extrabold">
              {inline(block.lines[0])}
            </p>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {inline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
