export default function HomePage() {
  return (
    <div>
      <h1>Neuroagent Backend API</h1>
      <p>TypeScript backend with Vercel AI SDK integration</p>
      <ul>
        <li>
          <a href="/api/healthz">Health Check</a>
        </li>
        <li>
          <a href="/api/settings">Settings</a>
        </li>
      </ul>
    </div>
  );
}
