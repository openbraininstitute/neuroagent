"use client";

import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PlotInChat from "@/components/chat/plot-in-chat";

const ConditionalImageRenderer = ({
  src,
  alt,
  ...props
}: {
  src?: string;
  alt?: string;
  [key: string]: unknown;
}) => {
  if (!src) {
    return (
      <div className="ml-20 text-red-500">Error: No image source provided</div>
    );
  }

  const origin = new URL(src).origin;
  const isSameOrigin =
    origin === window.location.origin ||
    origin === "https://staging.openbraininstitute.org";

  if (!isSameOrigin) {
    return (
      <img
        src={src}
        alt={alt}
        {...props}
        className="ml-20"
        style={{ maxHeight: "500px", width: "auto" }}
        onError={(e) => {
          const target = e.target as HTMLElement;
          target.outerHTML = `<a href="${src}" target="_blank" rel="noopener noreferrer" class="ml-20 text-blue-600 underline dark:text-blue-400">${src}</a>`;
        }}
      />
    );
  }

  const storageIdMatch = src.match(/\/storage\/([^/]+)/);
  const isValidUUID =
    storageIdMatch &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      storageIdMatch[1],
    );

  if (!storageIdMatch || !isValidUUID) {
    return (
      <div className="ml-20 block">
        <span className="flex">
          <span className="inline-block rounded-lg border border-yellow-400/50 bg-yellow-50/80 px-4 py-2 text-xs text-yellow-700 dark:border-yellow-600/30 dark:bg-yellow-900/20 dark:text-yellow-400/80">
            Error loading plot. Plots can be seen above.
          </span>
        </span>
      </div>
    );
  }

  return <PlotInChat storageId={storageIdMatch[1]} />;
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: (props) => <ConditionalImageRenderer {...props} />,
          p: ({ children }) => <div>{children}</div>,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content,
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
    ));
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
