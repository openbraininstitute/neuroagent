"use client";

import {
  AppProgressProvider as ProgressProvider,
  Progress,
  Bar,
} from "@bprogress/next";

const ProgressBar = () => {
  return (
    <ProgressProvider
      color="#2b7fff" // did not find how to do in tailwind ... this is blue-500
      options={{
        template: null,
      }}
    >
      <Progress>
        <Bar className="!absolute z-[9999] !top-auto stroke-red-500"></Bar>
      </Progress>
    </ProgressProvider>
  );
};

export default ProgressBar;
