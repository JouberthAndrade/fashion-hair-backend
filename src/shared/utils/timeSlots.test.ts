import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTimeSlots,
  hasTimeOverlap,
  addMinutesToTime,
} from './timeSlots.js';

describe('generateTimeSlots', () => {
  it('returns slots that fit duration before end of shift', () => {
    const slots = generateTimeSlots('09:00', '12:00', 60, 30);
    assert.deepEqual(slots, ['09:00', '09:30', '10:00', '10:30', '11:00']);
  });

  it('uses minimum 15 minute step', () => {
    const slots = generateTimeSlots('09:00', '10:00', 30, 10);
    assert.deepEqual(slots, ['09:00', '09:15', '09:30']);
  });
});

describe('hasTimeOverlap', () => {
  it('detects overlapping ranges', () => {
    assert.equal(hasTimeOverlap('09:00', '10:00', '09:30', '10:30'), true);
    assert.equal(hasTimeOverlap('09:00', '10:00', '10:00', '11:00'), false);
  });
});

describe('addMinutesToTime', () => {
  it('adds minutes within same day', () => {
    assert.equal(addMinutesToTime('09:15', 45), '10:00');
  });
});
