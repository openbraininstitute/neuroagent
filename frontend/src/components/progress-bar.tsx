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
      <Bar className="!absolute z-[9999] !top-auto fill-red-500"></Bar>
    </Progress>
  );
};
