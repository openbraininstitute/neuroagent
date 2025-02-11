export default async function ToolPage({
  params,
}: {
  params: Promise<{ toolName: string }>;
}) {
  const paramsAwaited = await params;
  const toolName = paramsAwaited?.toolName;

  return (
    <>
      <h1 className="text-2xl my-4 text-center font-bold mb-6">{toolName}</h1>
    </>
  );
}
