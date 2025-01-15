import { BMessage } from "@/lib/types";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings-provider";

async function getMessages(threadId: string): Promise<BMessage[]> {
  const settings = await getSettings();

  const response = await fetch(
    `${env.BACKEND_URL}/threads/${threadId}/messages`,
    {
      headers: {
        Authorization: `Bearer ${settings.token}`,
      },
    },
  );

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export default async function PageThread({
  params,
}: {
  params: Promise<{ threadID: string }>;
}) {
  const paramsAwaited = await params;
  const threadId = paramsAwaited?.threadID;

  const messages = await getMessages(threadId);

  return (
    <>
      <h1 className="text-2xl my-4 text-center font-bold mb-6">
        Thread #{threadId}
      </h1>
      <pre className="whitespace-pre-wrap">
        {JSON.stringify(messages, null, 2)}
      </pre>
    </>
  );
}
