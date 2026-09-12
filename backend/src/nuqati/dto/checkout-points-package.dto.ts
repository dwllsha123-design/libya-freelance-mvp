import { Transform } from 'class-transformer';
import {
  Allow,
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'packageIdentifierRequired', async: false })
export class PackageIdentifierRequiredConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments): boolean {
    const body = args.object as CheckoutPointsPackageDto;
    return Boolean(resolvePackageIdentifier(body));
  }

  defaultMessage(): string {
    return 'packageId or packageCode is required';
  }
}

/** Prefer packageId; fall back to packageCode. Returns null when neither is usable. */
export function resolvePackageIdentifier(body: {
  packageId?: unknown;
  packageCode?: unknown;
}): string | null {
  if (typeof body.packageId === 'string') {
    const id = body.packageId.trim();
    if (id) return id;
  }
  if (typeof body.packageCode === 'string') {
    const code = body.packageCode.trim();
    if (code) return code;
  }
  return null;
}

/**
 * Canonical Nuqati checkout body: `{ "packageId": "<id-or-code>" }`.
 * `packageCode` is retained for intentional backward compatibility.
 */
export class CheckoutPointsPackageDto {
  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(64)
  packageId?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsString()
  @MaxLength(64)
  packageCode?: string;

  /** Sentinel so the at-least-one constraint always runs (IsOptional would skip property validators). */
  @Allow()
  @Transform(() => true)
  @Validate(PackageIdentifierRequiredConstraint)
  _packageKeyCheck?: true;
}
