const test = require('node:test');
const assert = require('node:assert');

function evaluateAppStatus(installedVersion, availableVersion, packageId) {
  if (!packageId) return 'UNMATCHED';
  if (availableVersion && availableVersion !== installedVersion) {
    return 'UPDATE_AVAILABLE';
  }
  return 'UP_TO_DATE';
}

function isValidPackageId(packageId) {
  return /^[a-zA-Z0-9._-]+$/.test(packageId);
}

test('Unit Test - Identifies available update when newer version exists', () => {
  assert.strictEqual(
    evaluateAppStatus('1.20.0', '1.21.2', 'Microsoft.VisualStudioCode'),
    'UPDATE_AVAILABLE'
  );
});

test('Unit Test - Marks up-to-date when versions match', () => {
  assert.strictEqual(
    evaluateAppStatus('1.21.2', '1.21.2', 'Microsoft.VisualStudioCode'),
    'UP_TO_DATE'
  );
});

test('Unit Test - Marks unmatched when packageId is missing', () => {
  assert.strictEqual(evaluateAppStatus('1.0.0', null, null), 'UNMATCHED');
});

test('Security Test - Rejects command injection in packageId', () => {
  assert.strictEqual(isValidPackageId('Google.Chrome && rm -rf /'), false);
  assert.strictEqual(isValidPackageId('Google.Chrome'), true);
});