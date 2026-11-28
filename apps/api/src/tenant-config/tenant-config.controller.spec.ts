import 'reflect-metadata';

import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { TenantConfigController } from './tenant-config.controller';

function rolesOf(target: object): unknown {
  return Reflect.getMetadata(ROLES_KEY, target);
}

describe('TenantConfigController roles', () => {
  it('restricts the whole controller to the admin role', () => {
    expect(rolesOf(TenantConfigController)).toEqual(['admin']);
  });
});
