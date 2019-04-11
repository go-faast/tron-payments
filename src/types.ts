import {
  Transaction as TronTransaction,
  TransactionInfo as TronTransactionInfo,
  Block as TronBlock
} from 'tronweb'

export type TransactionInfoRaw = TronTransaction & TronTransactionInfo & {
  currentBlock: Pick<TronBlock, 'blockID' | 'block_header'>
}

export interface TransactionInfo {
  id: string
  to: string
  from: string
  amount: string
  fee: string
  executed: boolean
  confirmed: boolean
  block: number
  raw: TransactionInfoRaw
}

export interface SignedTransaction {
  id: string
  to: string
  from: string
  amount: string
  fee: string
  raw: TronTransaction
}

export interface Broadcast {
  id: string
  rebroadcast: boolean // true if this is a duplicate broadcast
}
