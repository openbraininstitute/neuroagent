"use client";

import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useRouter } from "@bprogress/next";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[380px]">
        <CardHeader className="text-center">
          <CardTitle>Welcome to OBI Chat</CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {showLoader ? (
            <div className="mx-auto w-6 h-6 border-2  border-gray-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                setShowLoader(true);
                signIn("keycloak", {
                  callbackUrl: "localhost:3000",
                });
              }}
            >
              Sign in with Keycloak
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
