import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnboardingStep, OnboardingStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class CurrentStepResponseDto {
  @ApiProperty({ description: 'Whether the user has selected a category', example: true })
  isCategorySelected: boolean;

  @ApiProperty({
    description: 'Whether first product has been added',
    example: false,
  })
  isFirstProductAdded: boolean;

  @ApiProperty({
    description: 'Whether bot has been connected',
    example: false,
  })
  isBotConnected: boolean;

  @ApiProperty({
    description: 'Next step to complete',
    enum: OnboardingStep,
    example: OnboardingStep.SELECT_CATEGORY,
  })
  nextStep: OnboardingStep;

  @ApiProperty({
    description: 'Overall onboarding status',
    enum: OnboardingStatus,
    example: OnboardingStatus.INCOMPLETE,
  })
  status: OnboardingStatus;
}

export class UpdateNextStepDto {
  @ApiProperty({
    description: 'The step to move to',
    enum: OnboardingStep,
    example: OnboardingStep.SELECT_CATEGORY,
  })
  @IsEnum(OnboardingStep)
  @IsNotEmpty()
  step: OnboardingStep;
}

export class OnboardingProgressResponseDto {
  @ApiProperty({ description: 'The unique identifier of the progress record', example: 1 })
  id: number;

  @ApiProperty({ description: 'Completion percentage', example: 25 })
  percentage: number;

  @ApiProperty({ description: 'Whether the user has selected a category', example: true })
  isCategorySelected: boolean;

  @ApiProperty({ description: 'Whether first product has been added', example: false })
  isFirstProductAdded: boolean;

  @ApiProperty({ description: 'Whether bot has been connected', example: false })
  isBotConnected: boolean;

  @ApiProperty({ description: 'Next step to complete', enum: OnboardingStep, example: OnboardingStep.SELECT_CATEGORY })
  nextStep: OnboardingStep;

  @ApiProperty({ description: 'Overall onboarding status', enum: OnboardingStatus, example: OnboardingStatus.INCOMPLETE })
  status: OnboardingStatus;
}

export class OnboardingStepsResponseDto {
  @ApiProperty({ description: 'List of all onboarding steps', enum: OnboardingStep, isArray: true })
  steps: OnboardingStep[];
}
