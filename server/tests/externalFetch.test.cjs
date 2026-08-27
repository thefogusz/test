const assert = require('node:assert/strict');
const test = require('node:test');

const { createSafeDnsLookup } = require('../lib/externalFetch.cjs');

test('safe DNS lookup returns all public records when Undici requests all addresses', async () => {
  const publicRecords = [
    { address: '93.184.216.34', family: 4 },
    { address: '1.1.1.1', family: 4 },
  ];
  const lookup = createSafeDnsLookup({
    label: 'feed url',
    dnsLookup: async () => publicRecords,
  });

  const result = await new Promise((resolve, reject) => {
    lookup('example.com', { all: true }, (error, addresses) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(addresses);
    });
  });

  assert.deepEqual(result, publicRecords);
});
