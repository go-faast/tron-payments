module.exports = {
  'transform': {
    '.(ts|tsx)': 'ts-jest'
  },
  'testEnvironment': 'node',
  'testRegex': '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  'testPathIgnorePatterns': [
    '/dist/'
  ],
  'moduleFileExtensions': [
    'ts',
    'tsx',
    'js'
  ],
  'coveragePathIgnorePatterns': [
    '/node_modules/',
    '/test/'
  ],
  'coverageThreshold': {
    'global': {
      'branches': 5,
      'functions': 5,
      'lines': 5,
      'statements': 5
    }
  },
  'collectCoverageFrom': [
    'src/*.{js,ts}'
  ]
}
