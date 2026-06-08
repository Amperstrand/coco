import type { KeyRingRepository, Keypair, KeypairPurpose } from '@cashu/coco-core';
import type { D1Db } from '../db.ts';
import { hexToBytes, bytesToHex } from '../utils.ts';

const DEFAULT_KEYPAIR_PURPOSE: KeypairPurpose = 'p2pk';

type KeypairRow = {
  publicKey: string;
  secretKey: string;
  derivationIndex: number | null;
  purpose?: KeypairPurpose | null;
};

function rowToKeypair(row: KeypairRow): Keypair {
  return {
    publicKeyHex: row.publicKey,
    secretKey: hexToBytes(row.secretKey),
    derivationIndex: row.derivationIndex ?? undefined,
    purpose: row.purpose ?? DEFAULT_KEYPAIR_PURPOSE,
  };
}

export class D1KeyRingRepository implements KeyRingRepository {
  private readonly db: D1Db;

  constructor(db: D1Db) {
    this.db = db;
  }

  async getPersistedKeyPair(
    publicKey: string,
    purpose?: KeypairPurpose,
  ): Promise<Keypair | null> {
    const row = await this.db.get<KeypairRow>(
      `SELECT publicKey, secretKey, derivationIndex, purpose
       FROM coco_cashu_keypairs
       WHERE local_name = ? AND publicKey = ? ${purpose ? 'AND purpose = ?' : ''} LIMIT 1`,
      purpose ? [this.db.localName, publicKey, purpose] : [this.db.localName, publicKey],
    );
    if (!row) return null;

    try {
      return rowToKeypair(row);
    } catch (error) {
      throw new Error(
        `Failed to parse secret key for public key ${publicKey}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async setPersistedKeyPair(keyPair: Keypair): Promise<void> {
    const secretKeyHex = bytesToHex(keyPair.secretKey);
    const purpose = keyPair.purpose ?? DEFAULT_KEYPAIR_PURPOSE;

    await this.db.run(
      `INSERT INTO coco_cashu_keypairs (local_name, publicKey, secretKey, createdAt, derivationIndex, purpose)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(local_name, publicKey) DO UPDATE SET
         secretKey=excluded.secretKey,
         derivationIndex=COALESCE(excluded.derivationIndex, coco_cashu_keypairs.derivationIndex),
         purpose=excluded.purpose`,
      [this.db.localName, keyPair.publicKeyHex, secretKeyHex, Date.now(), keyPair.derivationIndex ?? null, purpose],
    );
  }

  async deletePersistedKeyPair(publicKey: string, purpose?: KeypairPurpose): Promise<void> {
    await this.db.run(
      `DELETE FROM coco_cashu_keypairs WHERE local_name = ? AND publicKey = ? ${purpose ? 'AND purpose = ?' : ''}`,
      purpose ? [this.db.localName, publicKey, purpose] : [this.db.localName, publicKey],
    );
  }

  async getAllPersistedKeyPairs(purpose?: KeypairPurpose): Promise<Keypair[]> {
    const rows = await this.db.all<KeypairRow>(
      `SELECT publicKey, secretKey, derivationIndex, purpose
       FROM coco_cashu_keypairs WHERE local_name = ? ${purpose ? 'AND purpose = ?' : ''}`,
      purpose ? [this.db.localName, purpose] : [this.db.localName],
    );

    return rows.map((row) => {
      try {
        return rowToKeypair(row);
      } catch (error) {
        throw new Error(
          `Failed to parse secret key for public key ${row.publicKey}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    });
  }

  async getLatestKeyPair(purpose?: KeypairPurpose): Promise<Keypair | null> {
    const row = await this.db.get<KeypairRow>(
      `SELECT publicKey, secretKey, derivationIndex, purpose
       FROM coco_cashu_keypairs
       WHERE local_name = ? ${purpose ? 'AND purpose = ?' : ''}
       ORDER BY createdAt DESC LIMIT 1`,
      purpose ? [this.db.localName, purpose] : [this.db.localName],
    );
    if (!row) return null;

    try {
      return rowToKeypair(row);
    } catch (error) {
      throw new Error(
        `Failed to parse latest secret key for public key ${row.publicKey}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async getLastDerivationIndex(purpose?: KeypairPurpose): Promise<number> {
    const row = await this.db.get<{ derivationIndex: number }>(
      `SELECT derivationIndex FROM coco_cashu_keypairs
       WHERE local_name = ? AND derivationIndex IS NOT NULL ${purpose ? 'AND purpose = ?' : ''}
       ORDER BY derivationIndex DESC LIMIT 1`,
      purpose ? [this.db.localName, purpose] : [this.db.localName],
    );
    return row?.derivationIndex ?? -1;
  }
}
