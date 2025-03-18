import Image from "next/image";
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
    <div
      className={`w-full max-w-2xl p-4 overflow-y-auto ${!isInChat && "mx-auto"}`}
    >
      {isInChat ? (
        <Link href={`/viewer/${storageId}`} className="flex gap-2">
          <Link2 className="mt-0.5" />
          <h2 className="text-xl font-bold mb-2 underline">{title}</h2>
        </Link>
      ) : (
        <h2 className="text-xl font-bold mb-2">{title}</h2>
      )}
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      <div className="aspect-square relative">
        <Image
          src={url}
          alt={title || "Plot"}
          width={700}
          height={700}
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
  );
}
