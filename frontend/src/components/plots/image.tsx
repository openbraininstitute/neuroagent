import Link from "next/link";

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
      className={`relative w-full pb-2 ${!isInChat ? "mt-6 flex flex-col items-center" : ""}`}
    >
      {!isInChat && title && (
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
      )}
      {description && <p className="mb-4 text-gray-600">{description}</p>}

      {isInChat && storageId ? (
        <Link href={`/viewer/${storageId}`}>
          <img
            src={url}
            alt={title || "Plot"}
            className="rounded-md bg-white p-3"
            style={{ maxHeight: "400px", width: "auto", maxWidth: "none" }}
          />
        </Link>
      ) : (
        <img
          src={url}
          alt={title || "Plot"}
          className="rounded-md bg-white p-3"
          style={{ maxHeight: "800px", width: "auto", maxWidth: "none" }}
        />
      )}
    </div>
  );
}
