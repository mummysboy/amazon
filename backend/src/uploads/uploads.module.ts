import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { IngestionLoggerService } from '../common/services/ingestion-logger.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, IngestionLoggerService],
  exports: [UploadsService],
})
export class UploadsModule {}
