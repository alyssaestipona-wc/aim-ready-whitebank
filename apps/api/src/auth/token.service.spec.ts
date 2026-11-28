import { TokenService } from './token.service';

describe('TokenService', () => {
  const ORIGINAL_SECRET = process.env.AUTH_JWT_SECRET;
  let tokens: TokenService;

  beforeAll(() => {
    process.env.AUTH_JWT_SECRET = 'test-secret';
    tokens = new TokenService();
  });

  afterAll(() => {
    process.env.AUTH_JWT_SECRET = ORIGINAL_SECRET;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const claims = {
    sub: 'u1',
    tenantId: 'kalinaw',
    appScope: 'borrower' as const,
    role: 'borrower' as const,
    email: 'juan@email.com',
  };

  it('verifies a session token it signed', () => {
    const token = tokens.signSession(claims);
    const payload = tokens.verifySession(token);
    expect(payload).toMatchObject(claims);
  });

  it('rejects a tampered session token', () => {
    const token = tokens.signSession(claims);
    const tampered = token.slice(0, -2) + (token.endsWith('a') ? 'bb' : 'aa');
    expect(tokens.verifySession(tampered)).toBeNull();
  });

  it('rejects an expired session token', () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(Date.now() - 10 * 60 * 60 * 1000);
    const token = tokens.signSession(claims);
    expect(tokens.verifySession(token)).toBeNull();
  });

  it('rejects a pending token presented as a session token', () => {
    const pending = tokens.signPending({ ...claims, code: '123456' });
    expect(tokens.verifySession(pending)).toBeNull();
  });

  it('round-trips a pending token', () => {
    const pending = tokens.signPending({ ...claims, code: '654321' });
    const payload = tokens.verifyPending(pending);
    expect(payload).toMatchObject({ ...claims, code: '654321' });
  });

  it('rejects an expired pending token', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(Date.now() - 60 * 60 * 1000);
    const pending = tokens.signPending({ ...claims, code: '111111' });
    expect(tokens.verifyPending(pending)).toBeNull();
  });
});
