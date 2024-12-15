import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from 'src/auth/auth.service';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { Permission } from 'src/roles/dtos/role.dto';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private reflector: Reflector, private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.userId;

    // Étape 1 : Vérifier si l'utilisateur est authentifié
   /* if (!userId) {
      throw new UnauthorizedException('User ID not found in the request.');
    }*/

    // Étape 2 : Récupérer les permissions nécessaires pour cette route
    const routePermissions: Permission[] = this.reflector.getAllAndOverride(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucune permission n'est requise pour la route, accès autorisé
    if (!routePermissions || routePermissions.length === 0) {
      return true;
    }

    console.log(`Route permissions required: ${JSON.stringify(routePermissions)}`);

    // Étape 3 : Récupérer les permissions utilisateur
    try {
      const userPermissions = await this.authService.getUserPermissions(userId);

      console.log(`User permissions: ${JSON.stringify(userPermissions)}`);

      // Étape 4 : Vérifier si l'utilisateur dispose de toutes les permissions nécessaires
      const hasAllPermissions = routePermissions.every((routePermission) => {
        const userPermission = userPermissions.find(
          (perm) => perm.resource === routePermission.resource,
        );

        // Si aucune permission n'existe pour cette ressource
        if (!userPermission) {
          console.error(`Missing permission for resource: ${routePermission.resource}`);
          return false;
        }

        // Vérifier que toutes les actions requises sont présentes
        const allActionsAvailable = routePermission.actions.every((requiredAction) =>
          userPermission.actions.includes(requiredAction),
        );

        if (!allActionsAvailable) {
          console.error(
            `Permission actions mismatch: Required: ${routePermission.actions}, Available: ${userPermission.actions}`,
          );
        }

        return allActionsAvailable;
      });

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          'User does not have the required permissions for this route.',
        );
      }
    } catch (error) {
      console.error('Permission verification failed:', error.message);
      throw new ForbiddenException('Access denied due to insufficient permissions.');
    }

    // Si toutes les validations sont réussies
    return true;
  }
}
