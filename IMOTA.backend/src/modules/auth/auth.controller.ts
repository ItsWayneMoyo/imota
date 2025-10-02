import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  @Post('admin/login')
  async adminLogin(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response
  ) {
    const { email, password } = body;
    // TODO: replace with real admin lookup & password check
    const admin = await this.prisma.user.findUnique({ where: { email } });
    if (!admin || password !== process.env.ADMIN_DUMMY_PASSWORD) {
      return { ok: false, error: 'Invalid credentials' };
    }
    const token = await this.jwt.signAsync({ sub: admin.id, role: 'admin' });
    res.cookie('imota_admin_session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8 * 1000, // 8h
    });
    // ✅ Return token so the admin app can set its own HttpOnly cookie on :3001
    return { ok: true, token };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('imota_admin_session', { path: '/' });
    return { ok: true };
  }

  @Get('session/verify')
  async verify(@Req() req: Request) {
    const token = req.cookies?.['imota_admin_session'];
    if (!token) return { ok: false };
    try {
      const payload = await this.jwt.verifyAsync(token);
      return { ok: true, sub: payload.sub, role: payload.role };
    } catch {
      return { ok: false };
    }
  }
}
