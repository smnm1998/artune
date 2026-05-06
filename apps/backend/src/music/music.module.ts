import { Module } from '@nestjs/common';
import { MusicService } from './music.service';
import { ITunesModule } from '../itunes/itunes.module';

@Module({
  imports: [ITunesModule],
  providers: [MusicService],
  exports: [MusicService],
})
export class MusicModule {}
