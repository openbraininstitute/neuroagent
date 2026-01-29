"use client";

import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkUnwrapImages from "remark-unwrap-images";
import PlotsInChat from "@/components/chat/plot-in-chat";
import { PlotSkeleton } from "@/components/plots/skeleton";
import { useStorageId } from "@/lib/storage-queries";

const ConditionalImageRenderer = ({
  src,
  alt,
  validStorageIds = [],
  ...props
}: {
  src?: string;
  alt?: string;
  validStorageIds?: string[];
  [key: string]: unknown;
}) => {
  const matchedStorageId = validStorageIds.find((id) => src?.includes(id));
  const { data: storageId, isPending } = useStorageId(
    matchedStorageId ? src : undefined,
    validStorageIds,
  );

  if (!matchedStorageId) {
    return (
      <img
        src={src || undefined}
        alt={alt}
        {...props}
        className="ml-20"
        style={{ height: "450px", width: "auto" }}
      />
    );
  }

  if (isPending) {
    return <PlotSkeleton className="ml-20" />;
  }

  if (storageId) {
    return <PlotsInChat storageIds={[storageId]} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      {...props}
      className="ml-20"
      style={{ height: "450px", width: "auto" }}
    />
  );
};

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map((token) => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({
    content,
    validStorageIds = [],
  }: {
    content: string;
    validStorageIds?: string[];
  }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkUnwrapImages]}
        components={{
          img: (props) => (
            <ConditionalImageRenderer
              {...props}
              validStorageIds={validStorageIds}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) =>
    prevProps.content === nextProps.content &&
    prevProps.validStorageIds === nextProps.validStorageIds,
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({
    content,
    id,
    validStorageIds = [],
  }: {
    content: string;
    id: string;
    validStorageIds?: string[];
  }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock
        content={block}
        key={`${id}-block_${index}`}
        validStorageIds={validStorageIds}
      />
    ));
  },
);

MemoizedMarkdown.displayName = "MemoizedMarkdown";
