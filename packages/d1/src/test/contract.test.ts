import { describe, it, expect } from 'bun:test';
import {
  runRepositoryTransactionContract,
  runAuthSessionRepositoryContract,
  runProofRepositoryContract,
  runMintOperationRepositoryContract,
  runPaymentRequestReceiveRepositoryContract,
  runReceiveOperationRepositoryContract,
  runSendOperationRepositoryContract,
  runMeltOperationRepositoryContract,
  runMeltQuoteRepositoryContract,
} from '@cashu/coco-adapter-tests';
import { D1Repositories } from '../index.ts';
import { createD1Mock } from './helpers.ts';

async function createRepositories() {
  const d1 = createD1Mock();
  const repositories = new D1Repositories({ d1Database: d1, localName: 'test-user' });
  await repositories.init();
  return {
    repositories,
    dispose: async () => {},
  };
}

runRepositoryTransactionContract(
  {
    createRepositories,
    testConcurrentRootOperationIsolation: false,
  },
  { describe, it, expect },
);

runAuthSessionRepositoryContract({ createRepositories }, { describe, it, expect });
runProofRepositoryContract({ createRepositories }, { describe, it, expect });
runMintOperationRepositoryContract({ createRepositories }, { describe, it, expect });
runReceiveOperationRepositoryContract({ createRepositories }, { describe, it, expect });
runSendOperationRepositoryContract({ createRepositories }, { describe, it, expect });
runMeltOperationRepositoryContract({ createRepositories }, { describe, it, expect });
runMeltQuoteRepositoryContract({ createRepositories }, { describe, it, expect });
runPaymentRequestReceiveRepositoryContract({ createRepositories }, { describe, it, expect });
