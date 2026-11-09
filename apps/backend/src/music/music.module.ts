import { Module } from '@nestjs/common';
import { MusicService } from './music.service';
import { ITunesModule } from '../itunes/itunes.module';
import { ExposureWindow } from './exposure-window';

@Module({
  imports: [ITunesModule],
  // 노출 기록은 프로세스에 하나 — 모든 요청이 같은 창을 쓴다(DB 보류, r2-design §8 결정 6)
  providers: [
    MusicService,
    { provide: ExposureWindow, useValue: new ExposureWindow() },
  ],
  exports: [MusicService],
})
export class MusicModule {}
