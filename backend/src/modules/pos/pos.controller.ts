import { Controller, Post, Get, Body, Param, UseGuards, Request, ForbiddenException, ParseIntPipe } from '@nestjs/common';
import { PosService } from './pos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MemberRole } from '@prisma/client';

@Controller('pos')
@UseGuards(JwtAuthGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('shifts/open')
  async openShift(@Request() req, @Body() body: { startingCash: number }) {
    return this.posService.openShift(Number(req.user.userId), body.startingCash);
  }

  @Get('shifts/current')
  async getCurrentShift(@Request() req) {
    return this.posService.getCurrentShift(Number(req.user.userId));
  }

  @Post('shifts/:id/close')
  async closeShift(
    @Request() req,
    @Param('id', ParseIntPipe) shiftId: number,
    @Body() body: { actualCash: number }
  ) {
    return this.posService.closeShift(Number(req.user.userId), shiftId, body.actualCash);
  }

  @Post('checkout')
  async checkout(@Request() req, @Body() body: any) {
    return this.posService.checkout(Number(req.user.userId), body);
  }
}
