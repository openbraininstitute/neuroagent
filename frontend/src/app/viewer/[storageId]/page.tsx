import { getPresignedUrl } from "@/lib/storage";
import { Piechart } from "@/components/plots/piechart";
import { Barplot } from "@/components/plots/barplot";
import { Scatterplot } from "@/components/plots/scatterplot";
import { ImagePlot } from "@/components/plots/image";
import { JSONPiechart, JSONBarplot, JSONScatterplot } from "@/lib/types";

export default async function ViewerPage({
  params,
}: {
  params: Promise<{ storageId: string }>;
}) {
  const paramsAwaited = await params;
  const storageId = paramsAwaited.storageId;
  const presignedUrl = await getPresignedUrl(storageId);

  const response = await fetch(presignedUrl);
  const category = response.headers.get("X-Amz-Meta-Category");

  if (category === "image") {
    return (
      <div>
        <ImagePlot url={presignedUrl} />
      </div>
    );
  }

  // For JSON-based plots, parse the response
  const data = await response.json();

  switch (category) {
    case "json-piechart":
      return (
        <div>
          <Piechart data={data as JSONPiechart} />
        </div>
      );
    case "json-barplot":
      return (
        <div>
          <Barplot data={data as JSONBarplot} />
        </div>
      );
    case "json-scatterplot":
      return (
        <div>
          <Scatterplot data={data as JSONScatterplot} />
        </div>
      );
    default:
      return (
        <div>
          <p>Error: Unsupported file category: {category}</p>
        </div>
      );
  }
}
