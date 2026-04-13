import { Routes } from '@angular/router';

import { authGuard, loginRedirectGuard } from './core/auth.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { CatalogPageComponent } from './features/catalog/catalog-page.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { ProfilePageComponent } from './features/profile/profile-page.component';
import { ShellComponent } from './features/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [loginRedirectGuard]
  },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: DashboardPageComponent
      },
      {
        path: 'profile',
        component: ProfilePageComponent
      },
      {
        path: 'catalog',
        component: CatalogPageComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
