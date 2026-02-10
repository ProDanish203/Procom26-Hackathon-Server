import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty({ message: 'Message text is required' })
  @IsString()
  @ApiProperty({ type: String, example: 'Hello, I need help with my account.' })
  text: string;
}
