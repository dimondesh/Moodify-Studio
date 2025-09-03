// src/pages/HomePage/HorizontalSectionSkeleton.tsx

const HorizontalSectionSkeleton = () => {
  return (
    <div className="mb-8">
      <div className="h-8 w-48 bg-zinc-800 rounded mb-4 animate-pulse" />
      <div className="flex space-x-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-800/40 p-4 rounded-md animate-pulse w-40 sm:w-48 flex-shrink-0"
          >
            <div className="aspect-square rounded-md bg-zinc-700 mb-4" />
            <div className="h-4 bg-zinc-700 rounded w-3/4 mb-2" />
            <div className="h-4 bg-zinc-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
};
export default HorizontalSectionSkeleton;
