import { IsEnum, IsIn } from 'class-validator';
import { Role } from '@prisma/client';

export class SwitchRoleDto {
  @IsEnum(Role)
  @IsIn([Role.CLIENT, Role.FREELANCER], {
    message: 'يمكن التبديل بين وضع العميل والمستقل فقط',
  })
  role!: Role;
}
