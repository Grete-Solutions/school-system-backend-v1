export class DocumentPricingResponseDto {
  id: string;
  school_id?: string;
  document_type: string;
  price_amount: number;
  currency: string;
  is_active: boolean;
  effective_date: string;
  expiry_date?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  school?: {
    id: string;
    name: string;
  };
  
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}