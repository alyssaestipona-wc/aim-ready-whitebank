import { SetMetadata } from '@nestjs/common';

import type { Role } from '@aim-ready/contracts';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles; absent on a route means any authenticated role. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
