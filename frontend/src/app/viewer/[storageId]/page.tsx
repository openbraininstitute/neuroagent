import { getPresignedUrl } from "@/lib/storage";
import { ImagePlot } from "@/components/plots/image";
import { Plots } from "@/components/plots/plotly";

export async function generateMetadata() {
  return {
    title: "Plot viewing",
  };
}

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

  switch (category) {
    case "image":
      return <ImagePlot url={presignedUrl} />;
    case "json":
      return (
        <div className="overflow-y-auto">
          <Plots presignedUrl={presignedUrl ?? ""} />
        </div>
      );
    default:
      return <p>Error: Unsupported file category: {category}</p>;
  }
}
