import * as migration_20261006_055302_baseline from './20261006_055302_baseline';
import * as migration_20261006_063505_sessions_and_cart_invariants from './20261006_063505_sessions_and_cart_invariants';
import * as migration_20261006_064405_rate_limits from './20261006_064405_rate_limits';

export const migrations = [
  {
    up: migration_20261006_055302_baseline.up,
    down: migration_20261006_055302_baseline.down,
    name: '20261006_055302_baseline',
  },
  {
    up: migration_20261006_063505_sessions_and_cart_invariants.up,
    down: migration_20261006_063505_sessions_and_cart_invariants.down,
    name: '20261006_063505_sessions_and_cart_invariants',
  },
  {
    up: migration_20261006_064405_rate_limits.up,
    down: migration_20261006_064405_rate_limits.down,
    name: '20261006_064405_rate_limits'
  },
];
