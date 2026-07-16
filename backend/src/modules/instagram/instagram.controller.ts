import {
  Controller,
  Delete,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import type { JwtPayload } from '@modules/auth/strategies/jwt.strategy';
import { InstagramService } from './instagram.service';

@ApiTags('Instagram')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'instagram', version: '1' })
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('connect')
  @ApiOperation({ summary: 'Get the Instagram OAuth consent-screen URL for the current org' })
  async connect(@CurrentUser() user: JwtPayload): Promise<{ url: string }> {
    return this.instagramService.getConnectUrl(Number(user.userId));
  }

  @Get('account')
  @ApiOperation({ summary: "Get the current org's connected Instagram account, if any" })
  async getAccount(@CurrentUser() user: JwtPayload) {
    return this.instagramService.getAccountForOrg(Number(user.userId));
  }

  @Delete('account')
  @ApiOperation({ summary: 'Disconnect the current org Instagram account' })
  async disconnect(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.instagramService.disconnectAccount(Number(user.userId));
  }
}

/**
 * Meta redirects the browser here after the user approves/denies on Instagram's
 * consent screen — no auth header available, so the initiating org travels via
 * the signed `state` param instead of @CurrentUser().
 */
@ApiExcludeController()
@Controller({ path: 'instagram/callback', version: '1' })
export class InstagramOAuthCallbackController {
  constructor(
    private readonly instagramService: InstagramService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    if (error || !code || !state) {
      return res.redirect(this.buildRedirect('error', 'denied'));
    }

    try {
      const organizationId = this.instagramService.resolveOrganizationFromState(state);
      await this.instagramService.connectAccount(organizationId, code);
      return res.redirect(this.buildRedirect('success'));
    } catch (err: any) {
      return res.redirect(this.buildRedirect('error', err.message?.slice(0, 100)));
    }
  }

  private buildRedirect(status: 'success' | 'error', reason?: string): string {
    const nodeEnv = this.config.get('NODE_ENV');
    const frontendRedirectBase =
      nodeEnv === 'production'
        ? this.config.get<string>('FRONTEND_PRODUCTION_URL')
        : this.config.get<string>('FRONTEND_DEVELOPMENT_URL');
    if (!frontendRedirectBase) {
      throw new Error('Frontend redirect URL is not defined');
    }
    const origin = new URL(frontendRedirectBase).origin;
    const url = new URL('/bots', origin);
    url.searchParams.set('instagram', status);
    if (reason) url.searchParams.set('reason', reason);
    return url.toString();
  }
}
