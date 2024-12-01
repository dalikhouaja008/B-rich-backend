import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Ajoutez des logs pour le débogage
    console.log('JwtAuthGuard: Attempting to activate');
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Vous pouvez ajouter une gestion d'erreur personnalisée ici
    console.log('JWT Validation result:', { err, user, info });

    if (err) {
      console.error('JWT Error:', err);
      throw err || new UnauthorizedException('Invalid token');
    }

    if (!user) {
      console.warn('No user found');
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}