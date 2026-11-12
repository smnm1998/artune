import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as request from 'supertest';
import type { CompleteEvent, EmotionStreamEvent } from '@artune/shared-types';
import { EmotionModule } from './emotion.module';
import { OpenAIService } from '../openai/openai.service';
import { ITunesService } from '../itunes/itunes.service';
import { ExposureWindow } from '../music/exposure-window';
import { PickResult } from '../openai/pick-prompt';
import { ITunesTrack } from '../itunes/itunes-track.type';

// 실제 모듈 연결(EmotionModule → MusicModule의 노출 창 provider)로 프론트와 같은 POST 스트림 요청을 보낸다.
// 바깥 서비스(OpenAI·iTunes)만 바꾸고, .env는 읽지 않는다 (AppModule은 .env를 불러와서 쓰지 않는다)
const picks: PickResult = {
  emotion: 'joy',
  emotionLabel: '기쁨',
  crisis: false,
  description: '좋은 하루였네요.',
  // 한국 7 · 팝 4 · 일본 1 — 화면 6:3:1에 한국·팝이 1곡씩 남는다
  immerse: [
    ...Array.from({ length: 7 }, (_, i) => ({
      artist: `한국 가수${i}`,
      title: `한국 곡${i}`,
      region: 'korea' as const,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      artist: `Pop Singer${i}`,
      title: `Pop Song${i}`,
      region: 'pop' as const,
    })),
    { artist: '日本の歌手', title: '日本の歌', region: 'jpop' },
  ],
  soothe: [
    { artist: '완화 가수', title: '완화 곡', region: 'korea' },
    { artist: 'Calm Singer', title: 'Calm Song', region: 'pop' },
    { artist: '静かな歌手', title: '静かな歌', region: 'jpop' },
  ],
};

describe('EmotionModule (POST 스트림 경로, 모듈 연결)', () => {
  let app: INestApplication;
  let ids: Map<string, number>;

  beforeEach(async () => {
    ids = new Map();
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          // LASTFM_API_KEY 없이 모듈이 뜨는지도 여기서 확인된다 (R4)
          load: [() => ({ OPENAI_API_KEY: 'test' })],
        }),
        CacheModule.register({ isGlobal: true }),
        EmotionModule,
      ],
    })
      .overrideProvider(OpenAIService)
      .useValue({
        // AI가 곡을 쓰는 대로 넘기는 흉내
        pickSongsStream: jest.fn(async (_text, { onPick } = {}) => {
          for (const pick of picks.immerse) onPick?.('immerse', pick);
          for (const pick of picks.soothe) onPick?.('soothe', pick);
          return picks;
        }),
      })
      .overrideProvider(ITunesService)
      .useValue({
        // 곡마다 고정 trackId — 같은 곡은 요청이 달라도 같은 트랙
        resolveTrack: jest.fn(
          async ({ artist, title }): Promise<ITunesTrack> => {
            const id = ids.get(title) ?? ids.size + 1;
            ids.set(title, id);
            return {
              trackId: id,
              trackName: title,
              artistName: artist,
              collectionName: 'Album',
              artworkUrl100: 'x',
              trackTimeMillis: 1,
              previewUrl: 'p',
              trackViewUrl: 'v',
            };
          },
        ),
        localizeTracks: jest.fn(async (tracks: ITunesTrack[]) => tracks),
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  const analyze = async (body: object) => {
    const res = await request(app.getHttpServer())
      .post('/emotion/analyze-stream')
      .send(body)
      .expect(200);
    const events: EmotionStreamEvent[] = res.text
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => JSON.parse(line.slice('data: '.length)));
    return (events.find((e) => e.type === 'complete') as CompleteEvent).data;
  };

  it('곡마다 곡 키가 실리고, 본문으로 보낸 이력의 곡은 남는 후보가 있으면 빠진다', async () => {
    const first = await analyze({ text: '오늘 좋았어' });
    const tracks = first.playlists.immerse.tracks;
    expect(tracks).toHaveLength(10);
    expect(tracks.every((t) => /^[0-9a-f]{8}$/.test(t.key))).toBe(true);

    // 처음 화면의 한국 곡 2곡을 봤다고 보낸다 → 한국 남는 1곡 + 팝에서 빌린 1곡이 대신 들어온다
    const seenSongs = tracks
      .filter((t) => t.name.startsWith('한국'))
      .slice(0, 2);
    const second = await analyze({
      text: '오늘 좋았어',
      seen: { immerse: seenSongs.map((t) => t.key) },
    });

    const names = second.playlists.immerse.tracks.map((t) => t.name);
    expect(names).toHaveLength(10);
    for (const song of seenSongs) expect(names).not.toContain(song.name);
  });

  it('노출 창은 앱에 하나 — 요청마다 화면 목록이 같은 창에 쌓인다', async () => {
    const exposure = app.get(ExposureWindow, { strict: false });
    const record = jest.spyOn(exposure, 'record');

    await analyze({ text: '첫 번째' });
    await analyze({ text: '두 번째' });

    // 요청 2번 × 모드 2개
    expect(record).toHaveBeenCalledTimes(4);
    expect(record.mock.calls.map(([mode]) => mode).sort()).toEqual([
      'immerse',
      'immerse',
      'soothe',
      'soothe',
    ]);
  });
});
