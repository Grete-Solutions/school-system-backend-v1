import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import * as fileUpload from 'express-fileupload';

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return from(
      new Promise((resolve, reject) => {
        fileUpload()(request, response, (err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(next.handle());
          }
        });
      })
    );
  }
}