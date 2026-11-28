import 'reflect-metadata';

import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { ApplicationsController } from './applications.controller';

/** Reads `@Roles` metadata by identity, not by calling the method. */
const proto = ApplicationsController.prototype as unknown as Record<
  string,
  object
>;
function rolesOf(target: object): unknown {
  return Reflect.getMetadata(ROLES_KEY, target);
}

/**
 * Declarative route-gating check: the guard itself is unit-tested generically
 * (session-role.guard.spec.ts); this just proves each route carries the
 * `@Roles` metadata this change's spec requires, since a wrong or missing
 * decorator would silently open or lock a route with no other test catching it.
 */
describe('ApplicationsController roles', () => {
  const STAFF_ROLES = [
    'branch',
    'officer',
    'approver',
    'ops',
    'opssup',
    'risk',
    'compliance',
  ];

  it('restricts list/detail to staff roles, not borrower', () => {
    expect(rolesOf(proto.list)).toEqual(STAFF_ROLES);
    expect(rolesOf(proto.detail)).toEqual(STAFF_ROLES);
  });

  it('leaves create/close borrower-only at the class level', () => {
    expect(rolesOf(ApplicationsController)).toEqual(['borrower']);
    expect(rolesOf(proto.create)).toBeUndefined();
    expect(rolesOf(proto.close)).toBeUndefined();
  });

  it('restricts decide to the approver role only, not every staff role', () => {
    expect(rolesOf(proto.decide)).toEqual(['approver']);
  });
});
