import AlbumHoverModal from '@/components/AlbumHoverModal/AlbumHoverModal';
import { Track } from '@/types/track';
import {
  coverSlotStyle,
  albumCoverStyle,
  noImageStyle,
} from './AlbumCard.styles';

interface AlbumCardProps {
  album: Track;
  /** PC — 마우스를 올리면 커버 위에 정보 카드(곡 정보 · 미리듣기 · Apple Music 배지)를 겹친다. 좁은 화면은 누르면 플레이어 모달 */
  hoverInfo?: boolean;
  /** 마우스가 올라가 있다 — 커버가 살짝 커지고 정보 카드가 열린다 (hoverInfo일 때만) */
  isOpen?: boolean;
}

/**
 * 곡 커버 — 정사각형 칸을 꽉 채운다 (11/27 PC 카드의 CD 장식은 뺐다)
 * 커지는 효과는 상태(isOpen)로 준다 — 칸 아래 곡명에 마우스를 올려도 같이 커지고, 터치(탭 후 남는 :hover)에는 안 걸리게
 */
function AlbumCard({
  album,
  hoverInfo = false,
  isOpen = false,
}: AlbumCardProps) {
  const coverUrl = album.album.images[0]?.url || '';
  const open = hoverInfo && isOpen;

  // 이미지를 못 받으면 숨겨 아래 회색 칠이 보이게
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  return (
    <div css={coverSlotStyle} data-open={open}>
      <div css={albumCoverStyle}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={album.name}
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div css={noImageStyle}>커버 없음</div>
        )}
      </div>
      {hoverInfo && <AlbumHoverModal isOpen={open} album={album} />}
    </div>
  );
}

export default AlbumCard;
