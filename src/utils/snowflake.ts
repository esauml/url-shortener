import { getWorkerId } from "./getWorkerId";
import { ValidationError, SystemClockError } from "../errors/AppError";
import { config } from '@/config';

export class Snowflake {
  private static readonly EPOCH = 1704067200000n;

  private static readonly WORKER_ID_BITS = 10n;
  private static readonly SEQUENCE_BITS = 12n;

  private static readonly MAX_WORKER_ID =
    (1n << Snowflake.WORKER_ID_BITS) - 1n;

  private static readonly MAX_SEQUENCE =
    (1n << Snowflake.SEQUENCE_BITS) - 1n;

  private static readonly WORKER_ID_SHIFT =
    Snowflake.SEQUENCE_BITS;

  private static readonly TIMESTAMP_SHIFT =
    Snowflake.SEQUENCE_BITS + Snowflake.WORKER_ID_BITS;

  private lastTimestamp = -1n;
  private sequence = 0n;

  constructor(private readonly workerId: number) {
    if (
      workerId < 0 ||
      BigInt(workerId) > Snowflake.MAX_WORKER_ID
    ) {
      throw new ValidationError(
        `workerId must be between 0 and ${Snowflake.MAX_WORKER_ID}`
      );
    }
  }

  generate(): bigint {
    let timestamp = this.currentTimestamp();

    if (timestamp < this.lastTimestamp) {
      throw new SystemClockError(
        `Clock moved backwards. Refusing for ${this.lastTimestamp - timestamp} ms`
      );
    }

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & Snowflake.MAX_SEQUENCE;

      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    return (
      (timestamp << Snowflake.TIMESTAMP_SHIFT) |
      (BigInt(this.workerId) << Snowflake.WORKER_ID_SHIFT) |
      this.sequence
    );
  }

  private currentTimestamp(): bigint {
    return BigInt(Date.now()) - Snowflake.EPOCH;
  }

  private waitNextMillis(current: bigint): bigint {
    let ts = this.currentTimestamp();
    while (ts <= current) {
      ts = this.currentTimestamp();
    }
    return ts;
  }
}

/**
 * Convert a bigint to base62 string
 */
export function toBase62(num: bigint): string {
  const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  if (num === 0n) return BASE62_CHARS[0]!;

  let result = '';
  while (num > 0n) {
    result = BASE62_CHARS[Number(num % 62n)] + result;
    num = num / 62n;
  }
  return result;
}

/**
 * Factory function to create Snowflake generator based on environment
 */
export function createSnowflake(): Snowflake {
  const workerId = getWorkerIdFromEnvironment();
  const snowflake = new Snowflake(workerId);
  console.log(`Snowflake generator initialized: Worker ID=${workerId}`);
  return snowflake;
}

function getWorkerIdFromEnvironment(): number {
  // config.workerId is already fully resolved (explicit or derived from hostname hash)
  return config.workerId;
}
