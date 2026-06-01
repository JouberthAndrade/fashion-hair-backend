import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collaboratorMatchesService,
  inferServiceSpecialtyFromName,
  resolveServiceSpecialty,
} from './serviceSpecialty.js';

describe('serviceSpecialty', () => {
  it('infers specialty from service name', () => {
    assert.equal(inferServiceSpecialtyFromName('Corte Feminino'), 'HAIRDRESSER');
    assert.equal(inferServiceSpecialtyFromName('Manicure'), 'MANICURE');
    assert.equal(inferServiceSpecialtyFromName('Pedicure'), 'PEDICURE');
    assert.equal(inferServiceSpecialtyFromName('Maquiagem Festa'), 'MAKEUP_ARTIST');
  });

  it('prefers explicit specialty on service record', () => {
    assert.equal(
      resolveServiceSpecialty({ name: 'Pacote Especial', specialty: 'MAKEUP_ARTIST' }),
      'MAKEUP_ARTIST',
    );
  });

  it('filters collaborators by compatible specialty', () => {
    const manicure = { name: 'Manicure' };
    const pedicure = { name: 'Pedicure' };
    const corte = { name: 'Corte Masculino' };

    assert.equal(collaboratorMatchesService('MANICURE', manicure), true);
    assert.equal(collaboratorMatchesService('HAIRDRESSER', manicure), false);
    assert.equal(collaboratorMatchesService('MANICURE', pedicure), true);
    assert.equal(collaboratorMatchesService('PEDICURE', pedicure), true);
    assert.equal(collaboratorMatchesService('HAIRDRESSER', corte), true);
    assert.equal(collaboratorMatchesService('MANICURE', corte), false);
  });
});
