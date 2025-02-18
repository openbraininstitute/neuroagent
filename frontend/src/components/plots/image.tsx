import Image from "next/image";

type ImagePlotProps = {
  url: string;
  title?: string;
  description?: string;
};

export function ImagePlot({ url, title, description }: ImagePlotProps) {
  console.log(url);
  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {title && <h2 className="text-xl font-bold mb-2">{title}</h2>}
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      <div className="aspect-square relative">
        <Image
          src={url}
          alt={title || "Plot"}
          width={500}
          height={500}
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    </div>
  );
}
