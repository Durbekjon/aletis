import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendCustomerMessageDto {
  @ApiProperty({ example: "Salom! Buyurtmangiz ertaga yetkaziladi." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  content: string;
}
