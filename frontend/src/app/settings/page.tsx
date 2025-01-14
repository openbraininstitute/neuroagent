import { ParameterForm } from "@/components/parameter-form";

export default function SettingsPage() {
  return (
    <>
      <div className="flex flex-col justify-center align-items">
        <h1 className="text-2xl my-4 text-center font-bold mb-6">Settings</h1>
        <ParameterForm />
      </div>
    </>
  );
}
