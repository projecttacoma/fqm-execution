module.exports = {
  preset: 'ts-jest',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    'src/integration-tests',
    'src/cli.ts',
    'src/calculation/Calculator.ts',
    'src/helpers/DebugHelpers.ts',
    'src/execution/Execution.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'd.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node'
};
