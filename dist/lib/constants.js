import { FeeLevel } from '@faast/payments-common';
export const PACKAGE_NAME = 'tron-payments';
export const MIN_BALANCE_SUN = 100000;
export const MIN_BALANCE_TRX = MIN_BALANCE_SUN / 1e6;
export const DECIMAL_PLACES = 6;
export const DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'https://api.trongrid.io';
export const DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'https://api.trongrid.io';
export const DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io';
export const DEFAULT_MAX_ADDRESS_SCAN = 10;
export const DEFAULT_FEE_LEVEL = FeeLevel.Medium;
//# sourceMappingURL=constants.js.map