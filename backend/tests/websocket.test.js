const test = require('node:test');
const assert = require('node:assert/strict');
const WebSocket = require('ws');

const {
  broadcastToCouple,
  getClients,
  handleWebSocketMessage,
  notifyPartner,
  registerClient,
  unregisterClient
} = require('../websocket');

function createClient(readyState = WebSocket.OPEN) {
  return {
    readyState,
    sent: [],
    send(payload) {
      this.sent.push(JSON.parse(payload));
    }
  };
}

test.beforeEach(() => {
  getClients().clear();
});

test('registerClient keeps multiple devices for one user', () => {
  const firstDevice = createClient();
  const secondDevice = createClient();

  registerClient('user-a', firstDevice, 'user-b');
  registerClient('user-a', secondDevice, 'user-b');

  assert.equal(getClients().get('user-a').size, 2);

  unregisterClient(firstDevice);

  assert.equal(getClients().get('user-a').size, 1);
  assert.equal(getClients().get('user-a').has(secondDevice), true);
});

test('notifyPartner sends to every open partner device and prunes closed sockets', () => {
  const firstDevice = createClient();
  const secondDevice = createClient();
  const closedDevice = createClient(WebSocket.CLOSED);

  registerClient('partner', firstDevice, 'me');
  registerClient('partner', secondDevice, 'me');
  registerClient('partner', closedDevice, 'me');

  const sentCount = notifyPartner('partner', { type: 'sync', data: { source: 'test' } });

  assert.equal(sentCount, 2);
  assert.deepEqual(firstDevice.sent, [{ type: 'sync', data: { source: 'test' } }]);
  assert.deepEqual(secondDevice.sent, [{ type: 'sync', data: { source: 'test' } }]);
  assert.deepEqual(closedDevice.sent, []);
  assert.equal(getClients().get('partner').size, 2);
});

test('broadcastToCouple matches exact members instead of substring membership', () => {
  const firstPartnerDevice = createClient();
  const secondPartnerDevice = createClient();
  const unrelatedDevice = createClient();

  registerClient('11', firstPartnerDevice, null);
  registerClient('22', secondPartnerDevice, null);
  registerClient('1', unrelatedDevice, '333');

  const sentCount = broadcastToCouple('11_22', { type: 'budgetUpdated' });

  assert.equal(sentCount, 2);
  assert.deepEqual(firstPartnerDevice.sent, [{ type: 'budgetUpdated' }]);
  assert.deepEqual(secondPartnerDevice.sent, [{ type: 'budgetUpdated' }]);
  assert.deepEqual(unrelatedDevice.sent, []);
});

test('client supplied profile update messages are ignored', () => {
  const partnerPhone = createClient();
  const partnerLaptop = createClient();
  const sender = createClient();

  registerClient('partner', partnerPhone, 'me');
  registerClient('partner', partnerLaptop, 'me');
  registerClient('me', sender, 'partner');

  handleWebSocketMessage(sender, { type: 'update', data: { field: 'avatar' } });

  assert.deepEqual(partnerPhone.sent, []);
  assert.deepEqual(partnerLaptop.sent, []);
});
