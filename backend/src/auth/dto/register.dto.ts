import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';
import {
  PASSWORD_COMPLEXITY_MESSAGE,
  PASSWORD_COMPLEXITY_REGEX,
} from '../password.util.js';
import { AuthClientMetaDto } from './auth-session.dto.js';

export class RegisterDto extends AuthClientMetaDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_COMPLEXITY_REGEX, {
    message: PASSWORD_COMPLEXITY_MESSAGE,
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword!: string;

  /** Public registration: CLIENT / FREELANCER only — never staff. */
  @IsIn([Role.FREELANCER, Role.CLIENT], {
    message: 'Role must be FREELANCER or CLIENT',
  })
  role!: Role;
}
