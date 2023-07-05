module.exports = {
  preset: 'ts-jest',
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    'src/cli.ts',
    'src/calculation/Calculator.ts',
    'src/execution/Execution.ts',
    'src/helpers/DebugHelpers.ts',
    'src/integration-tests',
    'src/scripts'
  ],
  moduleFileExtensions: ['ts', 'js', 'd.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node'
};
