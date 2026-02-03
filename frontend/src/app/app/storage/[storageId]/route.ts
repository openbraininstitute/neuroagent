import { getPresignedUrl } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ storageId: string }> },
) {
  const { storageId } = await params;
  try {
    const presignedUrl = await getPresignedUrl(storageId);
    return Response.redirect(presignedUrl, 302);
  } catch {
    return new Response(null, { status: 404 });
  }
}

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ storageId: string }> },
) {
  const { storageId } = await params;
  try {
    await getPresignedUrl(storageId);
    return new Response(null, {
      headers: {
        "X-Storage-Id": storageId,
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
