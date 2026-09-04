import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Zernio } from '@zernio/node';

export const ZERNIO = Symbol('ZERNIO');

@Module({
  providers: [
    {
      provide: ZERNIO,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Zernio({ apiKey: config.getOrThrow('ZERNIO_API_KEY') }),
    },
  ],
  exports: [ZERNIO],
})
export class ZernioModule {}
