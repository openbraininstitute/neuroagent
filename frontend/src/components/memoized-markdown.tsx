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

  const isSameOrigin = new URL(src).origin === window.location.origin;

  if (!isSameOrigin) {
    return (
      <img
        src={src}
        alt={alt}
        {...props}
        className="ml-20"
        style={{ maxHeight: "500px", width: "auto" }}
      />
    );
  }

  const storageId = src.match(/\/storage\/([^/]+)/)?.[1];

  if (!storageId) {
    return (
      <div className="ml-20 text-red-500">Error: Unable to load image</div>
    );
  }

  return <PlotInChat storageId={storageId} />;
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
