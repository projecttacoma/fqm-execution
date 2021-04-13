module.exports = {
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: [
    'src/_tests_',
    'src/cli.ts',
    'src/Calculator.ts',
    'src/DebugHelper.ts',
    'src/Execution.ts'
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  },
  moduleFileExtensions: ['ts', 'js', 'd.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  testMatch: ['**/test/**/*.test.(ts|js)'],
  testEnvironment: 'node'
};
