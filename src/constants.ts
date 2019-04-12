export const TRX_FEE_FOR_TRANSFER = Number.parseInt(process.env.TRX_FEE_FOR_TRANSFER || '1000')
export const TRX_FEE_FOR_TRANSFER_SUN = TRX_FEE_FOR_TRANSFER * 100
export const BROADCAST_SUCCESS_CODES = ['SUCCESS', 'DUP_TRANSACTION_ERROR']

export const DEFAULT_FULL_NODE = process.env.TRX_FULL_NODE_URL || 'http://54.236.37.243:8090'
export const DEFAULT_SOLIDITY_NODE = process.env.TRX_SOLIDITY_NODE_URL || 'http://47.89.187.247:8091'
export const DEFAULT_EVENT_SERVER = process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io'
export const DEFAULT_MAX_ADDRESS_SCAN = 10
