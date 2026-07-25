import { Module } from '@nestjs/common';
import { LastfmService } from './lastfm.service';

@Module({
  providers: [LastfmService],
  exports: [LastfmService],
})
export class LastfmModule {}
