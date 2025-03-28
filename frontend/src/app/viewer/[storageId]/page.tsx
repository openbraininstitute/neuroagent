import { getPresignedUrl } from "@/lib/storage";
import { Piechart } from "@/components/plots/piechart";
import { Barplot } from "@/components/plots/barplot";
import { Scatterplot } from "@/components/plots/scatterplot";
import { ImagePlot } from "@/components/plots/image";
import { Histogram } from "@/components/plots/histogram";
import { Linechart } from "@/components/plots/linechart";
import {
  JSONPiechart,
  JSONBarplot,
  JSONScatterplot,
  JSONHistogram,
  JSONLinechart,
} from "@/lib/types";

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
    return <ImagePlot url={presignedUrl} />;
  }

  // For JSON-based plots, parse the response
  const data = await response.json();

  switch (category) {
    case "json-piechart":
      return <Piechart data={data as JSONPiechart} />;
    case "json-barplot":
      return <Barplot data={data as JSONBarplot} />;
    case "json-scatterplot":
      return <Scatterplot data={data as JSONScatterplot} />;
    case "json-histogram":
      return <Histogram data={data as JSONHistogram} />;
    case "json-linechart":
      return <Linechart data={data as JSONLinechart} />;
    default:
      return <p>Error: Unsupported file category: {category}</p>;
  }
}
