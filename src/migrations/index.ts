import * as migration_20261006_055302_baseline from './20261006_055302_baseline';
import * as migration_20261006_063505_sessions_and_cart_invariants from './20261006_063505_sessions_and_cart_invariants';
import * as migration_20261006_064405_rate_limits from './20261006_064405_rate_limits';
import * as migration_20261021_090246_checkout from './20261021_090246_checkout';
import * as migration_20261021_091444_sell_online from './20261021_091444_sell_online';
import * as migration_20261021_094910_coupon_rules from './20261021_094910_coupon_rules';

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
    name: '20261006_064405_rate_limits',
  },
  {
    up: migration_20261021_090246_checkout.up,
    down: migration_20261021_090246_checkout.down,
    name: '20261021_090246_checkout',
  },
  {
    up: migration_20261021_091444_sell_online.up,
    down: migration_20261021_091444_sell_online.down,
    name: '20261021_091444_sell_online',
  },
  {
    up: migration_20261021_094910_coupon_rules.up,
    down: migration_20261021_094910_coupon_rules.down,
    name: '20261021_094910_coupon_rules'
  },
];
