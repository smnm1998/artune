export interface Artist {
  name: string;
}

export interface AlbumInfo {
  name: string;
  images: { url: string }[];
}

export interface Track {
  id: string;
  name: string;
  artists: Artist[];
  album: AlbumInfo;
  preview_url: string | null;
}
