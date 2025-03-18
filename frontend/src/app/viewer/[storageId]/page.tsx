import { getPresignedUrl } from "@/lib/storage";
import { Piechart } from "@/components/plots/piechart";
import { Barplot } from "@/components/plots/barplot";
import { Scatterplot } from "@/components/plots/scatterplot";
import { ImagePlot } from "@/components/plots/image";
import { Histogram } from "@/components/plots/histogram";
import { Linechart } from "@/components/plots/linechart";

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

  switch (category) {
    case "image":
      return <ImagePlot url={presignedUrl} />;
    case "json-piechart":
      return <Piechart presignedUrl={presignedUrl ?? ""} />;
    case "json-barplot":
      return <Barplot presignedUrl={presignedUrl ?? ""} />;
    case "json-scatterplot":
      return <Scatterplot presignedUrl={presignedUrl ?? ""} />;
    case "json-histogram":
      return <Histogram presignedUrl={presignedUrl ?? ""} />;
    case "json-linechart":
      return <Linechart presignedUrl={presignedUrl ?? ""} />;
    default:
      return <p>Error: Unsupported file category: {category}</p>;
  }
}
