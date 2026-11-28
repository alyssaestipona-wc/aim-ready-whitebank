import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as reachable with no session at all (sign-in, code verification). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
