import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        this.logger.log(`Attempting to connect to database (attempt ${retries + 1}/${maxRetries})`);
        await this.$connect();
        this.logger.log('Successfully connected to database');
        return;
      } catch (error) {
        retries++;
        this.logger.error(`Database connection failed (attempt ${retries}/${maxRetries}):`, error.message);
        
        if (retries === maxRetries) {
          this.logger.error('All database connection attempts failed');
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retries) * 1000;
        this.logger.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}