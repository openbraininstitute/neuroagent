import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      {/* Title section */}
      <div className="relative flex justify-center items-center p-6 w-full">
        <Skeleton className="h-9 w-[300px]" /> {/* h-9 matches text-3xl */}
      </div>

      {/* Single Human Message skeleton */}
      <div className="flex justify-end p-8">
        <Card className="max-w-[80%]">
          <CardContent>
            <Skeleton className="h-16 w-[400px]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
