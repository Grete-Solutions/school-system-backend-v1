import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import * as Busboy from 'busboy';
import { Readable } from 'stream';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class BusboyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    return new Observable<void>((subscriber) => {
      const busboy = Busboy({ headers: request.headers });
      const fields: { [key: string]: string } = {};
      let fileData: Buffer[] = [];
      let fileMeta: { filename: string; mimeType: string } | null = null;

      busboy.on('field', (name: string, value: string) => {
        fields[name] = value;
      });

      busboy.on('file', (name: string, file: Readable, info: Busboy.FileInfo) => {
        if (name !== 'file') {
          file.resume();
          return;
        }
        fileMeta = { filename: info.filename, mimeType: info.mimeType };
        file.on('data', (data: Buffer) => fileData.push(data));
        file.on('end', () => {
          request.file = {
            buffer: Buffer.concat(fileData),
            originalname: info.filename,
            mimetype: info.mimeType,
            size: Buffer.concat(fileData).length,
          };
        });
      });

      busboy.on('error', (error: Error) => {
        subscriber.error(new BadRequestException(`File upload failed: ${error.message}`));
      });

      busboy.on('finish', () => {
        request.body = fields;
        if (!request.file) {
          subscriber.error(new BadRequestException('File is required'));
        }
        subscriber.next();
        subscriber.complete();
      });

      request.pipe(busboy);
    }).pipe(
      switchMap(() => next.handle())
    );
  }
}