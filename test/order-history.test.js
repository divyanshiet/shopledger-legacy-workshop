const assert = require('node:assert/strict');
const { test } = require('node:test');
const orders = require('../lib/orders');

function orderHistory() {
  return {
    orders: [
      { id: 1, date: '31/12/2021' },
      { id: 2, date: '01/01/2022' },
      { id: 3, date: '15/01/2022' },
      { id: 4, date: '01/02/2022' }
    ]
  };
}

test('history sorts newest first across months and years without changing stored order', () => {
  const db = orderHistory();

  assert.deepEqual(orders.list(db).map(order => order.id), [4, 3, 2, 1]);
  assert.deepEqual(db.orders.map(order => order.id), [1, 2, 3, 4]);
});

test('date filters include both boundaries when all orders are in the same month', () => {
  const db = {
    orders: [
      { id: 2, date: '01/01/2022' },
      { id: 3, date: '15/01/2022' },
      { id: 5, date: '16/01/2022' }
    ]
  };
  const filters = { from: '2022-01-01', to: '15/01/2022' };

  assert.deepEqual(orders.list(db, filters).map(order => order.id), [3, 2]);
});

test('a January-only range excludes orders in other months', () => {
  const filters = { from: '2022-01-01', to: '2022-01-15' };

  assert.deepEqual(orders.list(orderHistory(), filters).map(order => order.id), [3, 2]);
});

test('a from date includes February and excludes the prior December', () => {
  const filters = { from: '2022-01-15' };

  assert.deepEqual(orders.list(orderHistory(), filters).map(order => order.id), [4, 3]);
});

test('a to date includes the prior December and excludes the later February', () => {
  const filters = { to: '2022-01-15' };

  assert.deepEqual(orders.list(orderHistory(), filters).map(order => order.id), [3, 2, 1]);
});

test('a December-to-January range includes both years', () => {
  const filters = { from: '2021-12-31', to: '2022-01-15' };

  assert.deepEqual(orders.list(orderHistory(), filters).map(order => order.id), [3, 2, 1]);
});

test('orders on the same date appear in reverse insertion order', () => {
  const db = {
    orders: [
      { id: 1, date: '31/01/2022' },
      { id: 2, date: '01/02/2022' },
      { id: 3, date: '01/02/2022' }
    ]
  };

  assert.deepEqual(orders.list(db).map(order => order.id), [3, 2, 1]);
});

test('history orders the same day of the month by year and month', () => {
  const db = {
    orders: [
      { id: 1, date: '01/12/2021' },
      { id: 2, date: '01/01/2022' },
      { id: 3, date: '01/02/2022' }
    ]
  };

  assert.deepEqual(orders.list(db).map(order => order.id), [3, 2, 1]);
});

test('a range spanning two months includes only the orders on its inclusive boundaries', () => {
  const filters = { from: '2022-01-15', to: '2022-02-01' };

  assert.deepEqual(orders.list(orderHistory(), filters).map(order => order.id), [4, 3]);
});

test('history sorts and filters padded and unpadded dates together', () => {
  const db = {
    orders: [
      { id: 1, date: '1/2/2022' },
      { id: 2, date: '09/10/2022' },
      { id: 3, date: '2/10/2022' }
    ]
  };

  assert.deepEqual(orders.list(db).map(order => order.id), [2, 3, 1]);
  assert.deepEqual(orders.list(db, { from: '1/2/2022', to: '2022-10-02' }).map(order => order.id), [3, 1]);
});
