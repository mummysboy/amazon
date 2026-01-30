import { Module, Global } from '@nestjs/common';
import { IngestionLoggerService } from './services/ingestion-logger.service';

@Global()
@Module({
  providers: [IngestionLoggerService],
  exports: [IngestionLoggerService],
})
export class CommonModule {}
