// frontend/src/layout/MainLayout.tsx

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
// НОВОЕ: Импортируем isFullScreenPlayerOpen из usePlayerStore
import { usePlayerStore } from "../stores/usePlayerStore";

const MainLayout = () => {
  const [isCompactView, setIsCompactView] = useState(false);
  // НОВОЕ: Получаем isFullScreenPlayerOpen из usePlayerStore
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

  // Определяем отступ снизу для контента
  let contentPaddingBottom = "pb-0"; // По умолчанию нет отступа

  if (isCompactView) {
    if (isFullScreenPlayerOpen) {
      // Если полноэкранный плеер открыт, ни навигации, ни компактного плеера нет
      contentPaddingBottom = "pb-0";
    } else if (currentSong) {
      // Если есть песня, то плеер (h-16/h-20) + навигация (h-16)
      contentPaddingBottom = "pb-[calc(4rem+4rem)] sm:pb-[calc(5rem+4rem)]"; // 4rem (плеер) + 4rem (навигация) = 8rem (128px)
    } else {
      // Только навигация (h-16), если нет песни и плеер не открыт
      contentPaddingBottom = "pb-16";
    }
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <AudioPlayer />
      <Topbar />

      <ResizablePanelGroup
        direction="horizontal"
        className={`flex-1 flex overflow-hidden p-2 ${contentPaddingBottom}`} // Динамический отступ здесь
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
