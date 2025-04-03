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
      className={`w-full max-w-2xl overflow-y-auto p-4 ${!isInChat && "mx-auto"}`}
    >
      {isInChat ? (
        <Link href={`/viewer/${storageId}`} className="flex gap-2">
          <Link2 className="mt-0.5" />
          <h2 className="mb-2 text-xl font-bold underline">{title}</h2>
        </Link>
      ) : (
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
      )}
      {description && <p className="mb-4 text-gray-600">{description}</p>}
      <div className="relative aspect-square">
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
