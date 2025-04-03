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
import { saveSettings } from "@/actions/save-settings";
import { useActionState } from "react";

const formSchema = z.object({
  projectID: z.string(),
  virtualLabID: z.string(),
});

type ParameterFormProps = {
  initialValues?: {
    projectID?: string;
    virtualLabID?: string;
  };
};

export function ParameterForm({
  initialValues = {
    projectID: Cookies.get("projectID") || "",
    virtualLabID: Cookies.get("virtualLabID") || "",
  },
}: ParameterFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });
  const [, action] = useActionState(saveSettings, null);

  return (
    <div className="flex flex-row justify-center">
      <Form {...form}>
        <form action={action} className="w-1/2" autoComplete="off">
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
          <Button className="mt-4 transition hover:scale-[1.05]" type="submit">
            Save Settings
          </Button>
        </form>
      </Form>
    </div>
  );
}
