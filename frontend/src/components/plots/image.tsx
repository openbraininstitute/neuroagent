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
  return (
    <div className="relative pb-2">
      {isInChat ? (
        <Link href={`/viewer/${storageId}`} className="flex gap-2">
          <Link2 className="mt-0.5" />
          <h2 className="mb-2 text-xl font-bold underline">{title}</h2>
        </Link>
      ) : (
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
      )}
      {description && <p className="mb-4 text-gray-600">{description}</p>}

      <img
        src={url}
        alt={title || "Plot"}
        className="rounded-md bg-white p-3"
        style={{ maxHeight: "500px", width: "auto", maxWidth: "none" }}
      />
    </div>
  );
}
