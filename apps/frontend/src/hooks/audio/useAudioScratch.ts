import { useRef, useEffect, useState, useCallback } from 'react';

interface UseAudioScratchOptions {
  src?: string;
  isEnabled: boolean;
  scratchDuration?: number;
}

function useAudioScratch({
  src,
  isEnabled,
  scratchDuration = 2,
}: UseAudioScratchOptions) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const isFadingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const prevEnabledRef = useRef(isEnabled);
  const listenerCleanupRef = useRef<(() => void) | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 오디오를 즉시 정지하고 상태를 초기화하는 함수
   */
  const stopAndReset = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 오디오 정지 및 속성 원복
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1.0; // 볼륨 원복
    // playbackRate는 건드리지 않음 (기본 1.0 유지)

    isFadingRef.current = false;
    setIsPlaying(false);
    setError(null);
  }, []);

  /**
   * 페이드아웃 효과 적용 애니메이션 (기존 스크래치 대체)
   */
  const applyFadeOutEffect = useCallback(
    (duration = scratchDuration) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      isFadingRef.current = true;

      const startTime = performance.now();
      const initialVolume = Math.max(0, Math.min(1, audio.volume));

      const animate = (currentTime: number) => {
        const elapsed = (currentTime - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 1 && !audio.paused) {
          const targetVolume = initialVolume * (1.0 - progress);
          audio.volume = Math.max(0, Math.min(1, targetVolume));

          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // 효과 완료 후 완전 정지
          stopAndReset();
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [scratchDuration, stopAndReset],
  );

  /**
   * 재생 시간 추적 및 종료 전 페이드아웃 트리거
   */
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;

    if (!audio || isFadingRef.current || !audio.duration) return;

    const timeRemaining = audio.duration - audio.currentTime;

    // 종료 N초 전 페이드아웃 시작
    if (timeRemaining <= scratchDuration && timeRemaining > 0) {
      isFadingRef.current = true;
      applyFadeOutEffect(scratchDuration);
    }
  }, [scratchDuration, applyFadeOutEffect]);

  // 탭 전환(화면 가림) 감지 -> 즉시 정지
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAndReset();
        if (listenerCleanupRef.current) {
          listenerCleanupRef.current();
          listenerCleanupRef.current = null;
        }
        if (playTimeoutRef.current) {
          clearTimeout(playTimeoutRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stopAndReset]);

  // 호버 해제 감지 -> 짧은 페이드아웃(0.5초)으로 퇴장
  useEffect(() => {
    const wasEnabled = prevEnabledRef.current;
    const isNowDisabled = !isEnabled;

    if (wasEnabled && isNowDisabled) {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      // 재생 중일 때만 페이드아웃
      if (isPlaying) {
        applyFadeOutEffect(0.5);
      }
    }
    prevEnabledRef.current = isEnabled;
  }, [isEnabled, isPlaying, applyFadeOutEffect]);

  // 메인 재생/정지 로직
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    // 기존 리스너 제거
    if (listenerCleanupRef.current) {
      listenerCleanupRef.current();
      listenerCleanupRef.current = null;
    }

    playTimeoutRef.current = setTimeout(() => {
      if (isEnabled && src) {
        // 볼륨 초기화 (재생 시작 전 확실하게)
        audio.volume = 1.0;
        isFadingRef.current = false;

        const handleCanPlay = () => {
          if (document.hidden) return;
          audio
            .play()
            .then(() => {
              setIsPlaying(true);
              setError(null);
            })
            .catch(() => setIsPlaying(false));
        };

        const handleError = () => {
          setIsPlaying(false);
          setError('오디오 로드 실패');
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('timeupdate', handleTimeUpdate);

        listenerCleanupRef.current = () => {
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
        };

        if (audio.readyState >= 3) {
          handleCanPlay();
        }
      } else if (!isFadingRef.current) {
        // 페이드아웃 중이 아니라면 즉시 정지 (ex: 다른 앨범으로 빠르게 이동 시)
        stopAndReset();
      }
    }, 100); // 100ms 디바운스

    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      if (listenerCleanupRef.current) {
        listenerCleanupRef.current();
        listenerCleanupRef.current = null;
      }
    };
  }, [isEnabled, src, handleTimeUpdate, stopAndReset]);

  return {
    audioRef,
    isPlaying,
    error,
  };
}

export default useAudioScratch;
