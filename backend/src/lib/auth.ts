import { HttpRequest } from '@azure/functions';

export interface UserPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}

/**
 * Extract user information from Azure Static Web Apps authentication
 * SWA injects user info via /.auth/me or headers
 */
export function getUserFromRequest(req: HttpRequest): UserPrincipal | null {
  // In production, this comes from the /.auth/me endpoint or x-ms-client-principal header
  // For now, we'll use a header-based approach that matches Azure SWA pattern
  
  const principalHeader = req.headers.get('x-ms-client-principal');
  
  if (principalHeader) {
    try {
      const principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString('utf-8'));
      return {
        userId: principal.userId ?? principal.sub ?? principal.oid,
        userDetails: principal.userDetails || principal.name || principal.email,
        identityProvider: principal.identityProvider || 'aad',
        userRoles: principal.userRoles || [],
      };
    } catch (error) {
      console.error('Error parsing client principal:', error);
      return null;
    }
  }
  
  // Fallback for local development (not for production use)
  if (process.env.NODE_ENV === 'development') {
    return {
      userId: '00000000-0000-0000-0000-000000000001',
      userDetails: 'Developer User',
      identityProvider: 'aad',
      userRoles: ['authenticated'],
    };
  }
  
  return null;
}

export function requireAuthentication(req: HttpRequest): UserPrincipal {
  const user = getUserFromRequest(req);
  if (!user) {
    throw new Error('Unauthorized: No valid user principal found');
  }
  return user;
}
