import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { MangaStoreService } from './manga-store.service';

export const authGuard: CanActivateFn = () => {
  const store = inject(MangaStoreService);
  const router = inject(Router);

  return store.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const loginRedirectGuard: CanActivateFn = () => {
  const store = inject(MangaStoreService);
  const router = inject(Router);

  return store.isAuthenticated() ? router.createUrlTree(['/app']) : true;
};
