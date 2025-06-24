import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map(data => {
        // If the data is already wrapped in ApiResponseDto, return as is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        
        return new ApiResponseDto(true, 'Request successful', data);
      })
    );
  }
}