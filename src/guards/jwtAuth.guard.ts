import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    
    const publicRoutes = [
      '/auth/login',
      '/auth/signup',
      '/auth/request',
      '/auth/verify',
      '/exchange-rate',
      '/news'
    ];

    // Autoriser toutes les routes publiques SANS vérification de token
    if (publicRoutes.some(route => request.path.startsWith(route))) {
      return true;
    }

    // Vérifier l'en-tête Authorization
    const authHeader = request.headers.authorization;
    
    // Si pas de header Authorization, ne pas déclencher l'authentification
    if (!authHeader) {
      return true;
    }

    // Continuer avec l'authentification JWT pour les routes protégées
    return super.canActivate(context);
  }
}