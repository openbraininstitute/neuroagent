export default async function PageThread({
  params,
}: {
  params: Promise<{ threadID: string }>;
}) {
  const paramsAwaited = await params;
  const threadId = paramsAwaited?.threadID;

  return (
    <>
      <h1 className="text-2xl my-4 text-center font-bold mb-6">
        Thread #{threadId}
      </h1>
    </>
  );
}
