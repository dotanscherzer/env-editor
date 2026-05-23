import { describe, it, expect, vi, beforeEach } from 'vitest';
import auth from '../auth.js';

function makeReq(headers = {}) {
  return { headers };
}

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('auth middleware', () => {
  beforeEach(() => {
    process.env.EDITOR_TOKEN = 'correct-secret';
  });

  it('returns 401 when Authorization header is missing', () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token does not match EDITOR_TOKEN', () => {
    const req = makeReq({ authorization: 'Bearer wrong-token' });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when token matches', () => {
    const req = makeReq({ authorization: 'Bearer correct-secret' });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts token without Bearer prefix', () => {
    // Current implementation: `replace('Bearer ', '')` is a no-op when there's no Bearer prefix.
    // So `Authorization: correct-secret` (no Bearer) ALSO works. This documents that.
    const req = makeReq({ authorization: 'correct-secret' });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects empty Authorization header', () => {
    const req = makeReq({ authorization: '' });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects when token has trailing whitespace', () => {
    const req = makeReq({ authorization: 'Bearer correct-secret ' });
    const res = makeRes();
    const next = vi.fn();

    auth(req, res, next);

    // Strict equality means whitespace breaks it — this test documents that behavior.
    // If you want to trim, update auth.js and flip this assertion.
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
