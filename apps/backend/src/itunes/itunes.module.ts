import { Module } from '@nestjs/common';
import { ITunesService } from './itunes.service.js';

@Module({
  providers: [ITunesService],
  exports: [ITunesService],
})
export class ITunesModule {}
