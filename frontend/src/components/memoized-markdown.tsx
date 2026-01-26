import { marked } from "marked";
import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkUnwrapImages from "remark-unwrap-images";
import PlotsInChat from "@/components/chat/plot-in-chat";

const ConditionalImageRenderer = ({
  src,
  alt,
  validStorageIds,
  ...props
}: {
  src?: string;
  alt?: string;
  validStorageIds?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}) => {
  // Check if the src matches the storage pattern and extract the ID
  const storageMatch = src?.match(/\/app\/storage\/(.+)$/);

  if (storageMatch) {
    const storageId = storageMatch[1];
    // Only render plot if the storage ID is valid
    if (!validStorageIds || validStorageIds.includes(storageId)) {
      return <PlotsInChat storageIds={[storageId]} />;
    }
    // Invalid storage ID - show message to check below
    return (
      <span className="my-2 inline-block rounded border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs text-amber-800 dark:border-yellow-700/50 dark:bg-yellow-800/20 dark:text-amber-300">
        Plot could not be displayed here. Please check the visualization below
        the tool call.
      </span>
    );
  }

  // Render normal image for all other URLs, with fallback link on error
  return (
    <img
      src={src}
      alt={alt}
      {...props}
      onError={(e) => {
        e.currentTarget.outerHTML = `<a href="${src}" target="_blank" rel="noopener noreferrer" class="text-sm text-blue-600 underline dark:text-blue-400">${src}</a>`;
      }}
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
    validStorageIds,
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
  (prevProps, nextProps) => prevProps.content === nextProps.content,
);

MemoizedMarkdownBlock.displayName = "MemoizedMarkdownBlock";

export const MemoizedMarkdown = memo(
  ({
    content,
    id,
    validStorageIds,
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
