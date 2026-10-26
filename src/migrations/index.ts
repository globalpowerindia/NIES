import * as migration_20261006_055302_baseline from './20261006_055302_baseline';
import * as migration_20261006_063505_sessions_and_cart_invariants from './20261006_063505_sessions_and_cart_invariants';
import * as migration_20261006_064405_rate_limits from './20261006_064405_rate_limits';
import * as migration_20261021_090246_checkout from './20261021_090246_checkout';
import * as migration_20261021_091444_sell_online from './20261021_091444_sell_online';
import * as migration_20261021_094910_coupon_rules from './20261021_094910_coupon_rules';
import * as migration_20261021_100646_content_pages from './20261021_100646_content_pages';
import * as migration_20261021_101913_product_tabs from './20261021_101913_product_tabs';
import * as migration_20261021_112739_customer_reviews from './20261021_112739_customer_reviews';
import * as migration_20261023_042948_payload_3_91_upgrade from './20261023_042948_payload_3_91_upgrade';
import * as migration_20261023_043644_order_cancel_reason from './20261023_043644_order_cancel_reason';
import * as migration_20261023_051903_staff_audit_log from './20261023_051903_staff_audit_log';
import * as migration_20261023_060455_staff_roles from './20261023_060455_staff_roles';
import * as migration_20261023_065728_product_360_view from './20261023_065728_product_360_view';
import * as migration_20261023_084941_product_3d_model from './20261023_084941_product_3d_model';
import * as migration_20261026_084712_product_drafts from './20261026_084712_product_drafts';

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
    name: '20261021_094910_coupon_rules',
  },
  {
    up: migration_20261021_100646_content_pages.up,
    down: migration_20261021_100646_content_pages.down,
    name: '20261021_100646_content_pages',
  },
  {
    up: migration_20261021_101913_product_tabs.up,
    down: migration_20261021_101913_product_tabs.down,
    name: '20261021_101913_product_tabs',
  },
  {
    up: migration_20261021_112739_customer_reviews.up,
    down: migration_20261021_112739_customer_reviews.down,
    name: '20261021_112739_customer_reviews',
  },
  {
    up: migration_20261023_042948_payload_3_91_upgrade.up,
    down: migration_20261023_042948_payload_3_91_upgrade.down,
    name: '20261023_042948_payload_3_91_upgrade',
  },
  {
    up: migration_20261023_043644_order_cancel_reason.up,
    down: migration_20261023_043644_order_cancel_reason.down,
    name: '20261023_043644_order_cancel_reason',
  },
  {
    up: migration_20261023_051903_staff_audit_log.up,
    down: migration_20261023_051903_staff_audit_log.down,
    name: '20261023_051903_staff_audit_log',
  },
  {
    up: migration_20261023_060455_staff_roles.up,
    down: migration_20261023_060455_staff_roles.down,
    name: '20261023_060455_staff_roles',
  },
  {
    up: migration_20261023_065728_product_360_view.up,
    down: migration_20261023_065728_product_360_view.down,
    name: '20261023_065728_product_360_view',
  },
  {
    up: migration_20261023_084941_product_3d_model.up,
    down: migration_20261023_084941_product_3d_model.down,
    name: '20261023_084941_product_3d_model',
  },
  {
    up: migration_20261026_084712_product_drafts.up,
    down: migration_20261026_084712_product_drafts.down,
    name: '20261026_084712_product_drafts'
  },
];
