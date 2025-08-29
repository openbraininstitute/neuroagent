import Image from "next/image";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { useState } from "react";

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
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div
      className={`relative mx-auto w-full max-w-4xl pb-2 ${!isInChat && "mx-auto"}`}
    >
      {isInChat ? (
        <Link href={`/viewer/${storageId}`} className="flex gap-2">
          <Link2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <h2 className="mb-2 text-xl font-bold underline">{title}</h2>
        </Link>
      ) : (
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
      )}

      {description && <p className="mb-4 text-gray-600">{description}</p>}

      <div className="relative w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
        {imageError ? (
          <div className="flex h-64 items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <p>Failed to load image</p>
              <p className="mt-1 text-sm">{title || "Unknown image"}</p>
            </div>
          </div>
        ) : (
          <div className="relative max-h-[80vh] min-h-[300px]">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="text-gray-500">Loading image...</div>
              </div>
            )}
            <Image
              src={url}
              alt={title || "Plot"}
              width={0}
              height={0}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
              className="h-auto max-h-[80vh] w-full object-contain"
              style={{ width: "auto", height: "auto" }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setImageError(true);
                setIsLoading(false);
              }}
              priority={isInChat}
            />
          </div>
        )}
      </div>
    </div>
  );
}
