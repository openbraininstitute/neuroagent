"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  projectID: z.string().min(1, { message: "Project ID is required" }),
  virtualLabID: z.string().min(1, { message: "Virtual Lab ID is required" }),
  token: z.string().min(1, { message: "Token is required" }),
});

type ParameterFormProps = {
  initialValues?: {
    projectID: string;
    virtualLabID: string;
    token: string;
  };
};

export function ParameterForm({
  initialValues = {
    projectID: Cookies.get("projectID") || "",
    virtualLabID: Cookies.get("virtualLabID") || "",
    token: Cookies.get("token") || "",
  },
}: ParameterFormProps) {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Set cookies that will be accessible on the server
    Cookies.set("projectID", values.projectID, { expires: 30 }); // 30 days
    Cookies.set("virtualLabID", values.virtualLabID, { expires: 30 });
    Cookies.set("token", values.token, { expires: 30 });

    // Refresh the client-side router
    router.refresh();
  }

  return (
    <div className="flex flex-row justify-center">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-1/2"
          autoComplete="off"
        >
          <FormField
            control={form.control}
            name="virtualLabID"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Virtual Lab ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter virtual lab ID"
                    {...field}
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>Your virtual lab identifier</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="projectID"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project ID</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter project ID"
                    {...field}
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>Your project identifier</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="token"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter token"
                    {...field}
                    autoComplete="off"
                  />
                </FormControl>
                <FormDescription>Your authentication token</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className="hover:scale-[1.05] transition mt-4" type="submit">
            Save Settings
          </Button>
        </form>
      </Form>
    </div>
  );
}
