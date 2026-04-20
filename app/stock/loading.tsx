import { SkeletonTable } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6">
      <SkeletonTable rows={12} cols={8} />
    </div>
  );
}
