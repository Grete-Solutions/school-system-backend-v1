import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsBoolean, 
  IsDateString, 
  IsUUID, 
  Min, 
  MaxLength, 
  IsIn 
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDocumentPricingDto {
  @IsOptional()
  @IsUUID()
  school_id?: string;

  @IsString()
  @MaxLength(100)
  document_type: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  price_amount: number;

  @IsOptional()
  @IsString()
  @IsIn(['GHS', 'USD', 'EUR', 'GBP']) // Add more currencies as needed
  currency?: string = 'GHS';

  @IsOptional()
  @IsBoolean()
  is_active?: boolean = true;

  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}