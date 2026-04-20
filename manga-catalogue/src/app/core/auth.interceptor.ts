import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthTokenService } from './auth-token.service';

function shouldAttachAuthorization(url: string): boolean {
  if (!url.includes('/api/')) {
    return false;
  }
  if (url.includes('/api/mangahook')) {
    return false;
  }
  if (url.includes('/api/auth/login')) {
    return false;
  }
  if (url.includes('/api/auth/register')) {
    return false;
  }
  if (url.includes('/api/auth/refresh')) {
    return false;
  }
  return true;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(AuthTokenService);
  const router = inject(Router);

  let outgoing = req;
  if (shouldAttachAuthorization(req.url)) {
    const access = tokens.getAccess();
    if (access) {
      outgoing = req.clone({
        setHeaders: { Authorization: `Bearer ${access}` }
      });
    }
  }

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (!shouldAttachAuthorization(req.url) || req.url.includes('/api/auth/refresh')) {
        return throwError(() => error);
      }

      return tokens.refreshAccess$().pipe(
        switchMap((newAccess) => {
          if (!newAccess) {
            void router.navigate(['/login']);
            return throwError(() => error);
          }

          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${newAccess}` }
          });
          return next(retry);
        })
      );
    })
  );
};
