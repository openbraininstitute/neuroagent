"use client";

import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PlotInChat from "@/components/chat/plot-in-chat";
import { PlotSkeleton } from "@/components/plots/skeleton";
import { useStorageId } from "@/lib/storage-queries";

const ConditionalImageRenderer = ({
  src,
  alt,
  ...props
}: {
  src?: string;
  alt?: string;
  [key: string]: unknown;
}) => {
  const { data: storageId } = useStorageId(src);

  if (!src || storageId === undefined) {
    return <PlotSkeleton className="ml-20" />;
  }

  return storageId ? (
    <PlotInChat storageId={storageId} />
  ) : (
    <img
      src={src}
      alt={alt}
      {...props}
      className="ml-20"
      style={{ maxHeight: "500px", width: "auto" }}
    />
  );
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
