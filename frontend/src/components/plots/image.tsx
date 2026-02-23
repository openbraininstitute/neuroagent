import Link from "next/link";
import { Link2 } from "lucide-react";

type ImagePlotProps = {
  url: string;
  storageId?: string;
  isInChat?: boolean;
  title?: string;
  description?: string;
};

export function ImagePlot({
  url,
  title,
  description,
  isInChat,
  storageId,
}: ImagePlotProps) {
  const content = (
    <>
      {isInChat && title && (
        <Link
          href={`/viewer/${storageId}`}
          className="inline-flex items-center gap-2"
        >
          <Link2 className="size-5" />
          <span className="mb-2 text-xl font-bold underline">{title}</span>
        </Link>
      )}
      {!isInChat && title && (
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
      )}
      {description && <p className="mb-4 text-gray-600">{description}</p>}

      <img
        src={url}
        alt={title || "Plot"}
        className="rounded-md bg-white p-1"
        style={{ maxHeight: "400px", width: "auto" }}
      />
    </>
  );

  return (
    <div className="relative max-h-[450px] max-w-3xl">
      {isInChat ? (
        <Link href={`/viewer/${storageId}`} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
