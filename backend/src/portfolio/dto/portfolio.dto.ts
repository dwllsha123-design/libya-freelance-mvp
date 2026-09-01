import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  projectUrl?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  skillIds!: string[];

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}

export class UpdatePortfolioDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  projectUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds?: string[];

  @IsOptional()
  @IsDateString()
  completedAt?: string | null;
}

export class ReorderPortfolioDto {
  @IsArray()
  @IsUUID('4', { each: true })
  itemIds!: string[];
}
