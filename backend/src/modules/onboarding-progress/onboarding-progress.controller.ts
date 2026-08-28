import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { OnboardingProgressService } from './onboarding-progress.service';
import {
  CurrentStepResponseDto,
  OnboardingProgressResponseDto,
  OnboardingStepsResponseDto,
  UpdateNextStepDto,
} from './dto';

@ApiTags('onboarding-progress')
@Controller('onboarding-progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnboardingProgressController {
  constructor(private readonly onboardingProgressService: OnboardingProgressService) {}

  @Get('current-step')
  @ApiOperation({
    summary: 'Get current onboarding step',
    description: 'Returns the current onboarding step and progress status for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Current onboarding step retrieved successfully',
    type: CurrentStepResponseDto,
  })
  async getCurrentStep(
    @CurrentUser() user: JwtPayload,
  ): Promise<CurrentStepResponseDto> {
    return this.onboardingProgressService.getCurrentStep(Number(user.userId));
  }

  @Patch('next-step')
  @ApiOperation({
    summary: 'Update onboarding step',
    description: 'Moves the onboarding progress to the next step',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding step updated successfully',
    type: OnboardingProgressResponseDto,
  })
  async handleNextStep(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNextStepDto,
  ): Promise<OnboardingProgressResponseDto> {
    return this.onboardingProgressService.handleNextStep(
      Number(user.userId),
      dto.step,
    );
  }

  @Get('steps')
  @ApiOperation({
    summary: 'Get all onboarding steps',
    description: 'Returns a list of all available onboarding steps in order',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding steps retrieved successfully',
    type: OnboardingStepsResponseDto,
  })
  getOnboardingSteps(): OnboardingStepsResponseDto {
    return this.onboardingProgressService.getOnboardingSteps();
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Get full onboarding progress',
    description: 'Returns the full onboarding progress details',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding progress retrieved successfully',
    type: OnboardingProgressResponseDto,
  })
  async getProgress(
    @CurrentUser() user: JwtPayload,
  ): Promise<OnboardingProgressResponseDto> {
    return this.onboardingProgressService.getProgress(Number(user.userId));
  }
}
