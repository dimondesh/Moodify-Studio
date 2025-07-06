import { Outlet } from "react-router-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../components/ui/resizable";
import LeftSidebar from "./LeftSidebar";
import FriendsActivity from "./FriendsActivity";
import AudioPlayer from "./AudioPlayer";
import PlaybackControls from "./PlaybackControls";
import Topbar from "../components/ui/Topbar";
import BottomNavigationBar from "./BottomNavigationBar";
import { useEffect, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";

const MainLayout = () => {
  const [isCompactView, setIsCompactView] = useState(false);
  const { currentSong, isFullScreenPlayerOpen } = usePlayerStore();

  useEffect(() => {
    const checkScreenSize = () => {
      const isCompact = window.innerWidth < 1024;
      setIsCompactView(isCompact);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  let contentPaddingBottom = "pb-0";
  if (isCompactView) {
    if (isFullScreenPlayerOpen) {
      contentPaddingBottom = "pb-0";
    } else if (currentSong) {
      contentPaddingBottom = "pb-[calc(4rem+4rem)] sm:pb-[calc(5rem+4rem)]";
    } else {
      contentPaddingBottom = "pb-16";
    }
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <AudioPlayer />
      <Topbar />

      <ResizablePanelGroup
        direction="horizontal"
        className={`flex-1 flex overflow-hidden p-2 ${contentPaddingBottom}`}
      >
        {!isCompactView && (
          <>
            <ResizablePanel
              defaultSize={20}
              minSize={10}
              maxSize={30}
              className="hidden lg:block"
            >
              <LeftSidebar />
            </ResizablePanel>
            <ResizableHandle className="w-2 bg-black rounded-lg transition-colors hidden lg:block" />
          </>
        )}

        <ResizablePanel className="overflow-y-auto flex-1">
          <Outlet />
        </ResizablePanel>

        {!isCompactView && (
          <>
            <ResizableHandle className="w-2 bg-black rounded-lg transition-colors" />
            <ResizablePanel
              defaultSize={20}
              minSize={0}
              maxSize={25}
              collapsedSize={0}
              className="hidden lg:block"
            >
              <FriendsActivity />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Плеер должен быть всегда виден, его видимость/тип контролируется внутри PlaybackControls */}
      <PlaybackControls />

      {/* НОВОЕ: Навигация видна только на мобильных и ТОЛЬКО если полноэкранный плеер НЕ открыт */}
      {isCompactView && !isFullScreenPlayerOpen && <BottomNavigationBar />}
    </div>
  );
};

export default MainLayout;
