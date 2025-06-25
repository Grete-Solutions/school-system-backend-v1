import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { supabaseProvider } from '../config/supabase.config';

@Global() // This makes the module global, so you don't need to import it everywhere
@Module({
  imports: [ConfigModule],
  providers: [supabaseProvider],
  exports: [supabaseProvider],
})
export class SupabaseModule {}