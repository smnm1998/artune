import { Module } from '@nestjs/common';
import { MusicService } from './music.service';
import { ITunesModule } from '../itunes/itunes.module';
import { LastfmModule } from '../lastfm/lastfm.module';

@Module({
  imports: [ITunesModule, LastfmModule],
  providers: [MusicService],
  exports: [MusicService],
})
export class MusicModule {}
