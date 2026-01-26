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
      className={`relative mx-auto max-h-screen w-full max-w-2xl overflow-auto pb-2 ${!isInChat && "mx-auto"}`}
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

      <div className="relative h-[500px] w-full rounded-md bg-white p-3">
        <Image
          src={url}
          alt={title || "Plot"}
          fill
          className="object-contain"
          sizes="100vw"
        />
      </div>
    </div>
  );
}
