// Based on documentation from https://developers.tron.network/v3.0.0/reference

declare module 'tronweb' {

  export interface GetEventResultOptions {
    sinceTimestamp?: number
    eventName?: string
    blockNumber?: number
    size?: number
    page?: number
    onlyConfirmed?: boolean
    onlyUnconfirmed?: boolean
    previousLastEventFingerprint?: any
  }

  export interface CreateAccountResult {
    privateKey: string
    publicKey: string
    address: {
      base58: string
      hex: string
    }
  }

  export interface AccountAsset {
    key: string
    value: number
  }

  export interface Account {
    account_name: string
    type: string
    address: string
    balance: number
    asset: AccountAsset[]
    account_resource: object
    assetV2: AccountAsset[]
    free_asset_net_usageV2: AccountAsset[]
  }

  export interface AccountResources {
    freeNetLimit: number
    assetNetUsed: AccountAsset[]
    assetNetLimit: AccountAsset[]
    TotalNetLimit: number
    TotalNetWeight: number
    TotalEnergyLimit: number
    TotalEnergyWeight: number
  }

  export interface Transaction {
    ret: Array<{ contractRet: string }>
    signature: string[]
    txID: string
    raw_data: {
      contract: Array<{
        parameter: {
          value: {
            amount: number
            to_address: string
            owner_address: string
          }
        }
      }>
      ref_block_bytes: string
      ref_block_hash: string
      expiration: number
      fee_limit: number
      timestamp: number
    }
    raw_data_hex: string
  }

  export interface TransactionInfoLog {
    address: string
    topics: Array
    data: string
  }

  export interface TransactionInfoInternal {
    hash: string
    caller_address: string
    transferTo_address: string
    callValueInfo: Array
    note: string
  }

  export interface TransactionInfo {
    id: string
    fee: number
    blockNumber: number
    blockTimestamp: number
    contractResult: string[]
    contract_address: string
    receipt: {
      origin_energy_usage: number
      energy_usage_total: number
      net_fee: number
      result: string
    }
    log: TransactionInfoLog[]
    internal_transactions: TransactionInfoInternal[]
  }

  export interface SignedTx {
    txID: string
  }

  export interface Block {
    blockID: string
    block_header: {
      raw_data: {
        number: number
        txTrieRoot: string
        witness_address: string
        parentHash: string
        version: number
        timestamp: number
      }
      witness_signature: string
    }
    transactions: Transaction[]
  }

  export default class TronWeb {

    constructor(fullNode: string, solidityNode: string, eventServer: string, privateKey?: string)

    setDefaultBlock(blockID?: 'earliest' | 'latest'): 'earliest' | 'latest' | false
    setPrivateKey(key: string): void
    setAddress(address: string): void
    getEventResult(contractAddress: string, options: GetEventResultOptions, callback: (result: any) => void)
    getEventByTransactionID(txId: string): any
    contract(): any
    address: {
      toHex(address: string): string
      fromHex(address: string): string
      fromPrivateKey(privateKey: string): string
    }
    sha3(value: string, add0x: boolean): string
    toHex(value: string): string
    toUtf8(value: string): string
    fromUtf8(value: string): string
    toAscii(value: string): string
    fromAscii(value: string): string
    toDecimal(value: string): number
    fromDecimal(value: string): string
    fromSun(amount: number): number
    toSun(amount: number): number
    isAddress(address: string): boolean
    createAccount(): CreateAccountResult
    isConnected(): boolean

    trx: {
      // Addresses & Accounts
      getAccount(address: string): Promise<Account>
      getAccountResources(address: string): Promise<AccountResources>
      getBalance(address: string): Promise<number>

      // Transactions
      getTransaction(txId: string): Promise<Transaction>
      getTransactionsFromAddress(address: string, limit: number, offset: number): Promise<Transaction[]>
      getTransactionFromBlock(blockNumber: number): Promise<Transaction[]>
      getTransactionInfo(txId: string): Promise<TransactionInfo>
      getTransactionsToAddress(address: string, limit: number, offset: number): Promise<Transaction[]>
      getTransactionsRelated(
        address: string, direction: 'all' | 'from' | 'to', limit: number, offset: number
      ): Promise<Transaction[]>
      sendTransaction(to: string, amountInSun: number, privateKey: string): Promise<any>
      sendRawTransaction(signedTransaction: any): Promise<any>
      sign(tx: any, privateKey: string): Promise<SignedTx>

      // Query Network
      getBlock(block: number | string): Promise<Block>
      getBlockByHash(blockHash: string): Promise<Block>
      getBlockByNumber(blockNumber: number): Promise<Block>
      getBlockTransactionCount(blockNumber: number): Promise<Block>
      getChainParameters(): Array<{ key: string, value: string }>
      getCurrentBlock(): Promise<Block>
      getNodeInfo(): any
      listNodes(): Promise<string[]>
    }

    transactionBuilder: {
      sendTrx(to: string, amountInSun: number, from: string): Promise<any>
      sendToken(to: string, amount: number, tokenID: string, from: string): Promise<any>
    }
  }
}
