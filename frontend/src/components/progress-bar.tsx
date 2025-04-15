"use client";

import {
  AppProgressProvider as ProgressProvider,
  Progress,
  Bar,
} from "@bprogress/next";

export function ProgressBarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProgressProvider
      color="#2b7fff"
      options={{
        template: null,
      }}
    >
      {children}
    </ProgressProvider>
  );
}

export const ProgressBar = () => {
  return (
    <Progress>
      <Bar className="!absolute !top-auto z-[9999] fill-red-500"></Bar>
    </Progress>
  );
};
