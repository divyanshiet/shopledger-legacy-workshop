const assert = require('node:assert/strict');
const { test } = require('node:test');
const ledger = require('../lib/ledger');

function customerLedger() {
  return {
    customers: [{
      id: 7,
      name: 'Test Customer',
      openingBalance: 500,
      totalBilled: 2000,
      totalSettled: 1200,
      balance: 1300
    }],
    settlements: [{ id: 500, customerId: 7, amount: 1200 }],
    nextSettlementId: 501
  };
}

test('a numeric settlement updates the balance and prepends a receipt', () => {
  const db = customerLedger();

  const result = ledger.recordSettlement(db, 7, 100.25, 'cash', 'Part payment');

  assert.equal(result.ok, true);
  assert.equal(db.customers[0].totalSettled, 1300.25);
  assert.equal(db.customers[0].balance, 1199.75);
  assert.equal(ledger.listCustomers(db)[0].balance, 1199.75);
  assert.deepEqual(db.settlements.map(entry => entry.id), [501, 500]);
  assert.equal(db.nextSettlementId, 502);
  assert.equal(result.settlement, db.settlements[0]);
  assert.equal(result.settlement.customerId, 7);
  assert.equal(result.settlement.amount, 100.25);
  assert.equal(result.settlement.mode, 'cash');
  assert.equal(result.settlement.note, 'Part payment');
});

test('a string amount updates the numeric settled total and balance', () => {
  const db = customerLedger();

  const result = ledger.recordSettlement(db, '7', '100');

  assert.equal(result.ok, true);
  assert.equal(db.customers[0].totalSettled, 1300);
  assert.equal(db.customers[0].balance, 1200);
  assert.equal(ledger.listCustomers(db)[0].balance, 1200);
  assert.equal(result.settlement.amount, 100);
  assert.equal(result.settlement.mode, 'upi');
  assert.equal(result.settlement.note, 'Khata settlement');
});

test('a numeric payment adds to the total after a string payment', () => {
  const db = customerLedger();
  ledger.recordSettlement(db, 7, '100');

  const result = ledger.recordSettlement(db, 7, 50);

  assert.equal(result.ok, true);
  assert.equal(db.customers[0].totalSettled, 1350);
  assert.equal(db.customers[0].balance, 1150);
  assert.equal(result.settlement.amount, 50);
});

test('a settlement adds numerically to a stored total represented as text', () => {
  const db = customerLedger();
  db.customers[0].totalSettled = '1200';

  assert.equal(ledger.recordSettlement(db, 7, 50).ok, true);
  assert.equal(db.customers[0].totalSettled, 1250);
  assert.equal(db.customers[0].balance, 1250);
});

test('non-positive settlements leave the ledger unchanged', () => {
  const db = customerLedger();

  for (const amount of [0, -5, '0']) {
    assert.deepEqual(ledger.recordSettlement(db, 7, amount), {
      ok: false,
      error: 'Settlement amount must be greater than zero'
    });
  }

  assert.deepEqual(db, customerLedger());
});

test('a decimal amount from the settlement form keeps the settled total numeric', () => {
  const db = customerLedger();

  const result = ledger.recordSettlement(db, '7', '100.25');

  assert.equal(result.ok, true);
  assert.equal(db.customers[0].totalSettled, 1300.25);
  assert.equal(db.customers[0].balance, 1199.75);
  assert.equal(result.settlement.amount, 100.25);
});

test('non-numeric settlement amounts leave the ledger unchanged', () => {
  const db = customerLedger();

  assert.equal(ledger.recordSettlement(db, 7, 'invalid').ok, false);
  assert.deepEqual(db, customerLedger());
});

test('a non-numeric stored total prevents a settlement from damaging the ledger further', () => {
  const db = customerLedger();
  db.customers[0].totalSettled = '120050.2550.25';
  const original = structuredClone(db);

  assert.equal(ledger.recordSettlement(db, 7, 50).ok, false);
  assert.deepEqual(db, original);
});
