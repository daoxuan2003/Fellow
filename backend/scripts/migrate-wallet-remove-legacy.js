require('dotenv').config();

const mongoose = require('mongoose');

const LEGACY_COLLECTIONS = Object.freeze([
  'categories',
  'networths',
  'budgetsettings'
]);

function missingWalletKind(type) {
  return {
    type,
    $or: [
      { kind: { $exists: false } },
      { kind: null }
    ]
  };
}

async function normalizeTransactionKinds(db) {
  const transactions = db.collection('transactions');
  await transactions.bulkWrite([
    { updateMany: { filter: missingWalletKind('income'), update: { $set: { kind: 'income' } } } },
    { updateMany: { filter: missingWalletKind('expense'), update: { $set: { kind: 'expense' } } } },
    { updateMany: { filter: missingWalletKind('transfer'), update: { $set: { kind: 'asset_transfer' } } } }
  ], { ordered: true });
}

async function dropLegacyCollections(db) {
  for (const collectionName of LEGACY_COLLECTIONS) {
    try {
      await db.dropCollection(collectionName);
    } catch (error) {
      if (error?.code !== 26 && error?.codeName !== 'NamespaceNotFound') throw error;
    }
  }
}

async function removeLegacyWalletData(db) {
  if (!db || typeof db.collection !== 'function' || typeof db.dropCollection !== 'function') {
    throw new TypeError('A MongoDB database handle is required');
  }
  await normalizeTransactionKinds(db);
  await dropLegacyCollections(db);
  return { status: 'completed' };
}

async function run() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await removeLegacyWalletData(mongoose.connection.db);
    process.stdout.write('Wallet legacy cleanup completed safely.\n');
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch(() => {
    process.stderr.write('Wallet legacy cleanup failed safely.\n');
    process.exitCode = 1;
  });
}

module.exports = {
  LEGACY_COLLECTIONS,
  missingWalletKind,
  normalizeTransactionKinds,
  dropLegacyCollections,
  removeLegacyWalletData
};
