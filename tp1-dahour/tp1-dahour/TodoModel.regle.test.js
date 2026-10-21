import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TodoModel } from './TodoModel.js';

test('un titre de plus de 60 caractères est refusé', () => {
  assert.throws(() => new TodoModel().add('x'.repeat(61)), /60 caractères/);
});

test('un titre de 60 caractères exactement est accepté', () => {
  const model = new TodoModel();
  model.add('x'.repeat(60));
  assert.equal(model.all().length, 1);
});
