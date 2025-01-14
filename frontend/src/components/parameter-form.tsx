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
import { useStore } from "@/config/store";
import { useEffect } from "react";

const formSchema = z.object({
  projectID: z.string().min(1, { message: "Project ID is required" }),
  virtualLabID: z.string().min(1, { message: "Virtual Lab ID is required" }),
  token: z.string().min(1, { message: "Token is required" }),
});

export function ParameterForm() {
  const {
    projectID,
    virtualLabID,
    token,
    setProjectID,
    setVirtualLabID,
    setToken,
  } = useStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectID: "",
      virtualLabID: "",
      token: "",
    },
  });

  // Update form with store values on mount
  useEffect(() => {
    form.reset({
      projectID,
      virtualLabID,
      token,
    });
  }, [form, projectID, virtualLabID, token]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setProjectID(values.projectID);
    setVirtualLabID(values.virtualLabID);
    setToken(values.token);
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
          <Button className="hover:scale-[1.05] transition" type="submit">
            Save Settings
          </Button>
        </form>
      </Form>
    </div>
  );
}
