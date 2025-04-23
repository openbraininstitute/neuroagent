import { ParameterForm } from "@/components/parameter-form";

export async function generateMetadata() {
  return {
    title: "Settings",
  };
}

export default function SettingsPage() {
  return (
    <>
      <h1 className="my-4 mb-6 text-center text-2xl font-bold">Settings</h1>
      <ParameterForm />
    </>
  );
}
