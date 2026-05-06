import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SpotifyService } from './spotify.service';
import { ITunesModule } from '../itunes/itunes.module.js';

/**
 * Spotify 음원 추천 모듈
 * - SpotifyService 제공하고 다른 모듈에서 사용할 수 있도록 export
 * - ConfigModule을 import하여 환경변수 접근 가능
 */
@Module({
  imports: [ConfigModule, ITunesModule],
  providers: [SpotifyService],
  exports: [SpotifyService],
})
export class SpotifyModule {}
