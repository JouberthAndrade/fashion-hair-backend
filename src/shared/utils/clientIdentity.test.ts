import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decidePublicClientIdentity } from './clientIdentity.js';

const maria = {
  id: '1',
  name: 'Maria Silva',
  phone: '11999990001',
  email: 'maria@exemplo.com',
};

describe('decidePublicClientIdentity', () => {
  it('creates a new client when no match', () => {
    const result = decidePublicClientIdentity(
      { name: 'João', email: 'joao@exemplo.com', phone: '11988887777' },
      null,
      null,
    );
    assert.equal(result.type, 'create');
  });

  it('reuses client when email and name match', () => {
    const result = decidePublicClientIdentity(
      { name: 'Maria Silva', email: 'maria@exemplo.com', phone: '11999990001' },
      null,
      maria,
    );
    assert.deepEqual(result, { type: 'reuse', clientId: '1' });
  });

  it('rejects when same email but different name', () => {
    const result = decidePublicClientIdentity(
      { name: 'João Pereira', email: 'maria@exemplo.com', phone: '11999990001' },
      maria,
      maria,
    );
    assert.equal(result.type, 'reject');
  });

  it('rejects when same email but different phone', () => {
    const result = decidePublicClientIdentity(
      { name: 'Maria Silva', email: 'maria@exemplo.com', phone: '21999990001' },
      null,
      maria,
    );
    assert.equal(result.type, 'reject');
  });

  it('rejects when phone and email belong to different clients', () => {
    const result = decidePublicClientIdentity(
      { name: 'Maria Silva', email: 'maria@exemplo.com', phone: '11999990001' },
      { ...maria, id: '2', phone: '11999990001' },
      { ...maria, id: '1' },
    );
    assert.equal(result.type, 'reject');
  });

  it('does not overwrite — reuses without create', () => {
    const result = decidePublicClientIdentity(
      { name: 'maria silva', email: 'MARIA@exemplo.com', phone: '(11) 99999-0001' },
      { ...maria, phone: '11999990001' },
      null,
    );
    assert.equal(result.type, 'reuse');
  });
});
