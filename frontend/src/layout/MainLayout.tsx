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
import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../stores/usePlayerStore";
import LyricsPage from "@/pages/LyricsPage/LyricsPage"; // Убедитесь, что этот путь правильный
import DynamicTitleUpdater from "@/components/DynamicTitleUpdater";
// Добавим импорты для Button и ChevronDown если они используются в LyricsPage и вы его вернули
// import { Button } from "../components/ui/button";
// import { ChevronDown } from "lucide-react";

const MainLayout = () => {
  const [isCompactView, setIsCompactView] = useState(false);
  const {
    currentSong,
    isFullScreenPlayerOpen,
    isPlaying,

    isDesktopLyricsOpen,
    isMobileLyricsFullScreen, // <--- Важно
    // setIsFullScreenPlayerOpen // Нам не нужно это здесь, если мы не будем его напрямую менять из MainLayout
  } = usePlayerStore();

  const silentAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const silentAudio = silentAudioRef.current;
    if (!silentAudio) return;

    if (isPlaying) {
      // Пытаемся запустить воспроизведение. На iOS это может не сработать сразу,
      // но сработает после первого взаимодействия пользователя с основным плеером.
      const playPromise = silentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Silent audio play was prevented.", error);
          // Это нормально при первой загрузке страницы, браузер блокирует автоплей.
          // После того как пользователь нажмет play на основном плеере, эта проблема исчезнет.
        });
      }
    } else {
      silentAudio.pause();
    }
  }, [isPlaying]);
  // =======================================================================
  // ===== КОНЕЦ ИСПРАВЛЕНИЯ ДЛЯ ФОНОВОГО ВОСПРОИЗВЕДЕНИЯ НА iOS =====
  // =======================================================================

  useEffect(() => {
    const checkScreenSize = () => {
      const isCompact = window.innerWidth < 1024;
      setIsCompactView(isCompact);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // ОБЯЗАТЕЛЬНО ПРОВЕРЬТЕ ЭТИ ЛОГИ, ОСОБЕННО НА МОБИЛЬНОМ УСТРОЙСТВЕ
  // И СРАВНИТЕ ИХ С ТЕМ, ЧТО ПОКАЗЫВАЮТ ЛОГИ ПЛЕЕРА ИЛИ PlaybackControls
  useEffect(() => {
    console.log("MainLayout (RENDER): isCompactView =", isCompactView);
    console.log(
      "MainLayout (RENDER): isFullScreenPlayerOpen =",
      isFullScreenPlayerOpen
    );
    console.log(
      "MainLayout (RENDER): isMobileLyricsFullScreen =",
      isMobileLyricsFullScreen
    );
  }, [isCompactView, isFullScreenPlayerOpen, isMobileLyricsFullScreen]);

  let contentPaddingBottom = "pb-0";
  if (isCompactView) {
    // В компактном режиме MainLayout не будет рендерить LyricsPage напрямую в Outlet
    // Полноэкранный плеер сам контролирует свои паддинги, а LyricsPage будет Fixed
    if (isFullScreenPlayerOpen || isMobileLyricsFullScreen) {
      // Если открыт плеер ИЛИ лирика, то паддинг не нужен
      contentPaddingBottom = "pb-0";
    } else if (currentSong) {
      contentPaddingBottom = "pb-[calc(4rem+4rem)] sm:pb-[calc(5rem+4rem)]"; // Высота плеера + высота навбара
    } else {
      contentPaddingBottom = "pb-16"; // Высота навбара без плеера
    }
  } else {
    // Десктопный режим
    if (currentSong) {
      contentPaddingBottom = ""; // Высота плеера на десктопе
    } else {
      contentPaddingBottom = "pb-0";
    }
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      <DynamicTitleUpdater /> {/* <-- 2. РАЗМЕЩАЕМ КОМПОНЕНТ ЗДЕСЬ */}
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
          {/*
            Главное изменение:
            Если isMobileLyricsFullScreen: всегда рендерим LyricsPage на весь экран
            Иначе, если isDesktopLyricsOpen: рендерим LyricsPage на десктопе
            Иначе: рендерим обычный Outlet
          */}
          {isMobileLyricsFullScreen ? (
            // Для мобильного полноэкранного режима LyricsPage
            // Этот div будет перекрывать все остальное
            <div className="fixed inset-0 z-[80] bg-zinc-950">
              {" "}
              {/* Убедитесь, что z-index достаточно высок */}
              {/*
                LyricsPage теперь должен сам содержать кнопку закрытия и заголовок,
                используя пропс isMobileFullScreen
              */}
              <LyricsPage isMobileFullScreen={true} />
            </div>
          ) : !isCompactView && isDesktopLyricsOpen ? (
            // Для десктопного режима LyricsPage (внутри ResizablePanel)
            <LyricsPage isMobileFullScreen={false} />
          ) : (
            // Обычный контент маршрута
            <Outlet />
          )}
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
      <PlaybackControls />
      {/* НОВОЕ: Навигация видна только на мобильных и ТОЛЬКО если полноэкранный плеер ИЛИ лирика НЕ открыты */}
      {isCompactView &&
        !isFullScreenPlayerOpen &&
        !isMobileLyricsFullScreen && <BottomNavigationBar />}
    </div>
  );
};

export default MainLayout;
