import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

export const supabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  useFactory: (configService: ConfigService) => {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    const supabaseServiceRoleKey = configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new BadRequestException('Supabase URL or Service Role Key is missing in configuration');
    }

    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  },
  inject: [ConfigService],
};