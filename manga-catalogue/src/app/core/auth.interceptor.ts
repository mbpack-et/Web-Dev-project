import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { MangaStoreService } from './manga-store.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(MangaStoreService);
  const token = store.accessToken();
  const isDjangoApi = req.url.startsWith('/api/') && !req.url.startsWith('/api/mangahook');

  if (!token || !isDjangoApi) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
