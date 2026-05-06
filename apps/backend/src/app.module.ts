import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmotionModule } from './emotion/emotion.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 모든 모듈에서 사용 가능
      envFilePath: '.env',
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 60 * 1000, // 1시간 (ms)
      max: 100,
    }),
    EmotionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
