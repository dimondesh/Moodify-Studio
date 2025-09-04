// src/pages/HomePage/HomePageSkeleton.tsx

import FeaturedGridSkeleton from "../../components/ui/skeletons/FeaturedGridSkeleton";
import HorizontalSectionSkeleton from "./HorizontalSectionSkeleton";

const HomePageSkeleton = () => {
  return (
    <div className="p-4 sm:p-6">
      <div className="h-8 w-48 bg-zinc-800 rounded mb-6 animate-pulse" />
      <FeaturedGridSkeleton />
      <div className="space-y-8">
        <HorizontalSectionSkeleton />
        <HorizontalSectionSkeleton />
        <HorizontalSectionSkeleton />
      </div>
    </div>
  );
};

export default HomePageSkeleton;
