import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@j3d/shared-types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response already formatted as ApiResponse, return directly
        if (response && typeof response === 'object' && 'success' in response) {
          return response;
        }

        const platformVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v1.0.0-local';
        return {
          success: true,
          data: response,
          meta: {
            platformVersion,
          },
        };
      }),
    );
  }
}
