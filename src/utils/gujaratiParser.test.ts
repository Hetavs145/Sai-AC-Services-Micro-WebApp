import test from 'node:test';
import assert from 'node:assert/strict';
import { parseVoiceAnnotationCommands } from './gujaratiParser';

test('parses Gujarati voice input matching user example: page 1 par terrace text add kari de, 2 par Bari(window)', () => {
  const transcript = 'page 1 par terrace text add kari de, 2 par Bari(window)';
  const actions = parseVoiceAnnotationCommands(transcript);

  assert.equal(actions.length, 2);
  
  // Page 1 check
  assert.equal(actions[0].pageNumber, 1);
  assert.equal(actions[0].pageIndex, 0);
  assert.match(actions[0].text, /Terrace/i);

  // Page 2 check
  assert.equal(actions[1].pageNumber, 2);
  assert.equal(actions[1].pageIndex, 1);
  assert.match(actions[1].text, /Bari/i);
});

test('parses spoken words in Gujarati script or transliteration', () => {
  const transcript = 'પેજ 1 પર રસોડું, પેજ 2 પર બાથરૂમ';
  const actions = parseVoiceAnnotationCommands(transcript);

  assert.equal(actions.length, 2);
  assert.equal(actions[0].pageNumber, 1);
  assert.match(actions[0].text, /Kitchen/i);
  assert.equal(actions[1].pageNumber, 2);
  assert.match(actions[1].text, /Bathroom/i);
});

test('handles single instruction without commas', () => {
  const transcript = 'page 3 par electrical wiring note';
  const actions = parseVoiceAnnotationCommands(transcript);

  assert.equal(actions.length, 1);
  assert.equal(actions[0].pageNumber, 3);
  assert.match(actions[0].text, /Electrical Wiring/i);
});
