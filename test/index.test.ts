import * as index from '../src';

test('index.ts to have Calculator', () => {
  expect(index).toHaveProperty('Calculator');
});

test('index.ts to have Calculator.calculate', () => {
  expect(index.Calculator).toHaveProperty('calculate');
});
