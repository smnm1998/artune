import { Module } from '@nestjs/common';
import { ITunesService } from './itunes.service';

@Module({
  providers: [ITunesService],
  exports: [ITunesService],
})
export class ITunesModule {}
