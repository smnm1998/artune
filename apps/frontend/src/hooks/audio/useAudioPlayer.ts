import { useState, useRef, useEffect } from 'react';

interface Track {
  id: string;
  preview_url: string | null;
}

/**
 * 오디오 플레이어의 재생 상태를 관리하는 훅
 * @returns {Object} 오디오 플레이어 관련 상태와 핸들러
 * @returns {number|null} returns.playingTrackId - 현재 재생 중인 트랙의 ID
 * @returns {Function} returns.handlePlayPause - 트랙 재생/일시정지를 처리하는 함수
 * @returns {React.RefObject} returns.audioRef - audio 엘리먼트에 연결할 ref
 */
function useAudioPlayer() {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = (track: Track) => {
    if (!track.preview_url) {
      alert('미리듣기를 지원하지 않는 곡입니다.');
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (playingTrackId === track.id) {
      audio.pause();
      setPlayingTrackId(null);
      return;
    }

    audio.pause();
    audio.src = track.preview_url;
    audio.play().catch(() => {});
    setPlayingTrackId(track.id);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setPlayingTrackId(null);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  return {
    playingTrackId,
    handlePlayPause,
    audioRef,
  };
}

export default useAudioPlayer;
