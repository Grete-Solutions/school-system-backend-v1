import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) throw new Error('JWT_SECRET is not defined');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid token');
    }
    return { sub: user.id, role: user.role };
  }
}