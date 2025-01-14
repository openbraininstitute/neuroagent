export default function Home() {
  return (
    <>
      <div className="flex flex-col justify-center h-full m-4">
        <div className="flex flex-col justify-center items-center gap-4">
          <h1 className="text-2xl my-4 font-bold mb-6">
            What can I help you with?
          </h1>
          <input
            type="text"
            className="border-2 border-gray-500 w-1/2 p-4 rounded-full"
            placeholder="Message the AI..."
          />
        </div>
      </div>
    </>
  );
}
