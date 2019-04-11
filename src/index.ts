import bitcore from 'bitcore-lib'
import TronWeb, { Transaction as TronTransaction } from 'tronweb'
import { pick, get } from 'lodash'
import { Balance, PaymentsInterface, TransactionStatus } from 'payments-common';

import { derivationPath, deriveAddress, derivePrivateKey } from './tron-bip44'
import { TransactionInfo, SignedTransaction, CreateTransactionOptions } from './types'

const TRX_FEE_FOR_TRANSFER = Number.parseInt(process.env.TRX_FEE_FOR_TRANSFER || '1000')
const TRX_FEE_FOR_TRANSFER_SUN = TRX_FEE_FOR_TRANSFER * 100
const BROADCAST_SUCCESS_CODES = ['SUCCESS', 'DUP_TRANSACTION_ERROR']
const XPRV_PREFIX = 'xprv'
const XPUB_PREFIX = 'xpub'

const DEFAULT_OPTIONS = {
  fullNode: process.env.TRX_FULL_NODE_URL || 'http://54.236.37.243:8090', // 'https://api.trongrid.io',
  solidityNode: process.env.TRX_SOLIDITY_NODE_URL || 'http://47.89.187.247:8091', // 'https://api.trongrid.io',
  eventServer: process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io',
}

interface TronPaymentsOptions {
  account: string | string[] // A single xprv, xpub, or array of private keys/addresses
  fullNode?: string
  solidityNode?: string
  eventServer?: string
}
type TronPaymentsOptionsResolved = Required<TronPaymentsOptions>

type AccountType = 'xprv' | 'xpub' | 'address' | 'private'

function toError(e: any) {
  if (typeof e === 'string') {
    return new Error(e)
  }
  return e
}

function toMainDenominationNumber(amountSun: number | string): number {
  return (typeof amountSun === 'number' ? amountSun : Number.parseInt(amountSun)) / 1e6
}

function toMainDenomination(amountSun: number | string): string {
  return toMainDenominationNumber(amountSun).toString()
}

function toBaseDenominationNumber(amountTrx: number | string): number {
  return (typeof amountTrx === 'number' ? amountTrx : Number.parseFloat(amountTrx)) * 1e6
}

function toBaseDenomination(amountTrx: number | string): string {
  return toBaseDenominationNumber(amountTrx).toString()
}

// You may notice that many function blocks are enclosed in a try/catch.
// I had to do this because tronweb thinks it's a good idea to throw
// strings instead of Errors and now we need to convert them all ourselves
// to be consistent.

export default class TronPayments implements PaymentsInterface<TransactionInfo, SignedTransaction> {
  options: TronPaymentsOptionsResolved
  tronweb: TronWeb
  account: string | string[]

  constructor(options: TronPaymentsOptions) {
    // overwrite options explicitly provided.
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }
    this.account = this.options.account
    this.validateAccount()

    this.tronweb = new TronWeb(
      this.options.fullNode,
      this.options.solidityNode,
      this.options.eventServer
    )
  }

  static toMainDenomination = toMainDenomination
  static toBaseDenomination = toBaseDenomination
  toMainDenomination = toMainDenomination
  toBaseDenomination = toBaseDenomination

  isValidAddress(address: string): boolean {
    return this.tronweb.isAddress(address)
  }

  isValidPrivateKey(privateKey: string): boolean {
    try {
      this.privateKeyToAddress(privateKey)
      return true
    } catch(e) {
      return false
    }
  }

  isValidXprv(xprv: string): boolean {
    return xprv.startsWith(XPRV_PREFIX)
  }

  isValidXpub(xpub: string): boolean {
    return xpub.startsWith(XPUB_PREFIX)
  }

  isHdAccount(): boolean {
    return this.account === 'string'
  }

  validateAccount(): void {
    if (typeof this.account === 'string') {
      if (!(this.isValidXprv(this.account) || this.isValidXpub(this.account))) {
        throw new Error(`Account must be a valid ${XPRV_PREFIX} or ${XPUB_PREFIX}`)
      }
    } else {
      this.account.forEach((addressOrKey, i) => {
        if (!(this.isValidAddress(addressOrKey) || this.isValidPrivateKey(addressOrKey))) {
          throw new Error(`Account[${i}] is not a valid private key or address`)
        }
      })
    }
  }

  async getAddress(index: number): Promise<string> {
    if (typeof this.account === 'string') {
      // this.account is an xprv or xpub
      const xpub = this.account.startsWith(XPRV_PREFIX)
        ? this.xprvToXpub(this.account)
        : this.account
      const address = deriveAddress(xpub, index)
      if (!this.isValidAddress(address)) {
        throw new Error(`Cannot get address ${index} - validation failed`)
      }
      return address
    } else {
      // this.account is an array of addresses or private keys
      const addressOrKey = this.account[index]
      if (this.isValidAddress(addressOrKey)) {
        return addressOrKey
      }
      return this.privateKeyToAddress(addressOrKey)
    }
  }

  async getAddressOrNull(index: number): Promise<string | null> {
    try {
      return this.getAddress(index)
    } catch(e) {
      return null
    }
  }

  async getAddressIndex(address: string): Promise<number> {
    throw new Error('not implemented')
  }

  async getAddressIndexOrNull(address: string): Promise<number | null> {
    return null
  }

  async getPrivateKey(index: number): Promise<string> {
    if (typeof this.account === 'string') {
      // account is an xprv or xpub
      if (!this.account.startsWith(XPRV_PREFIX)) {
        throw new Error(`Cannot get private key ${index} - account is not an ${XPRV_PREFIX})`)
      }
      return derivePrivateKey(this.account, index)
    } else {
      // account is an array of addresses or private keys
      const addressOrKey = this.account[index]
      if (this.isValidAddress(addressOrKey)) {
        throw new Error(`Cannot get private key ${index} - account[${index}] is a public address`)
      }
      return addressOrKey
    }
  }

  privateKeyToAddress(privateKey: string): string {
    const address = this.tronweb.address.fromPrivateKey(privateKey)
    if (this.isValidAddress(address)) {
      return address
    } else {
      throw new Error('Validation failed for address derived from private key')
    }
  }

  generateNewKeys() {
    // to gererate a key:
    const key = new bitcore.HDPrivateKey()
    const derivedPubKey = key.derive(derivationPath).hdPublicKey
    return {
      xpub: derivedPubKey.toString(),
      xprv: key.toString()
    }
  }

  xprvToXpub(xprv: string): string {
    const key = new bitcore.HDPrivateKey(xprv)
    const derivedPubKey = key.derive(derivationPath).hdPublicKey
    return derivedPubKey.toString()
  }

  private async resolveAddress(addressOrIndex: string | number): Promise<string> {
    if (typeof addressOrIndex === 'number') {
      return this.getAddress(addressOrIndex)
    } else {
      if (!this.isValidAddress(addressOrIndex)) {
        throw new Error(`Invalid TRON address: ${addressOrIndex}`)
      }
      return addressOrIndex
    }
  }

  async getBalance(addressOrIndex: string | number): Promise<Balance> {
    try {
      const address = await this.resolveAddress(addressOrIndex)
      const balanceSun = await this.tronweb.trx.getBalance(address)
      return {
        balance: toMainDenomination(balanceSun).toString(),
        unconfirmedBalance: '0',
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async canSweep(addressOrIndex: string | number): Promise<boolean> {
    const { balance } = await this.getBalance(addressOrIndex)
    return canSweepBalance(toBaseDenominationNumber(balance))
  }

  private async resolveFromTo(from: string | number, to: string | number): Promise<{
    fromIndex: number, fromAddress: string, fromPrivateKey: string,
    toIndex: number | null, toAddress: string,
  }> {
    const fromIndex = typeof from === 'string'
      ? await this.getAddressIndex(from)
      : from
    return {
      fromAddress: typeof from === 'string'
        ? from
        : await this.getAddress(from),
      fromIndex,
      fromPrivateKey: await this.getPrivateKey(fromIndex),
      toAddress: typeof to === 'string'
        ? to
        : await this.getAddress(to),
      toIndex: typeof to === 'string'
        ? await this.getAddressIndexOrNull(to)
        : to,
    }
  }

  async createSweepTransaction(
    from: string | number, to: string | number, options: CreateTransactionOptions = {}
  ): Promise<SignedTransaction> {
    try {
      const {
        fromAddress, fromIndex, fromPrivateKey, toAddress, toIndex
      } = await this.resolveFromTo(from, to)
      const feeSun = options.fee || TRX_FEE_FOR_TRANSFER_SUN
      const feeTrx = toMainDenomination(feeSun)
      const balanceSun = await this.tronweb.trx.getBalance(fromAddress)
      const balanceTrx = toMainDenomination(balanceSun)
      if (!canSweepBalance(balanceSun)) {
        throw new Error(`Insufficient balance (${balanceTrx}) to sweep with fee of ${feeTrx}`)
      }
      const amountSun = balanceSun - feeSun
      const amountTrx = toMainDenomination(amountSun)
      const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)
      const signedTx = await this.tronweb.trx.sign(tx, fromPrivateKey)
      return {
        id: signedTx.txID,
        from: fromAddress,
        to: toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeTrx,
        status: 'pending',
        raw: signedTx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async createTransaction(
    from: string | number, to: string | number, amountTrx: string, options: CreateTransactionOptions = {}
  ): Promise<SignedTransaction> {
    try {
      const {
        fromAddress, fromIndex, fromPrivateKey, toAddress, toIndex
      } = await this.resolveFromTo(from, to)
      const feeSun = options.fee || TRX_FEE_FOR_TRANSFER_SUN
      const feeTrx = toMainDenomination(feeSun)
      const balanceSun = await this.tronweb.trx.getBalance(fromAddress)
      const balanceTrx = toMainDenomination(balanceSun)
      const amountSun = toBaseDenominationNumber(amountTrx)
      if ((balanceSun - feeSun) < amountSun) {
        throw new Error(`Insufficient balance (${balanceTrx}) to send including fee of ${feeTrx}`)
      }
      const tx = await this.tronweb.transactionBuilder.sendTrx(toAddress, amountSun, fromAddress)
      const signedTx = await this.tronweb.trx.sign(tx, fromPrivateKey)
      return {
        id: signedTx.txID,
        from: fromAddress,
        to: toAddress,
        toExtraId: null,
        fromIndex,
        toIndex,
        amount: amountTrx,
        fee: feeTrx,
        status: 'pending',
        raw: signedTx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async broadcastTransaction(tx: SignedTransaction): Promise<string> {
    try {
      const status = await this.tronweb.trx.sendRawTransaction(tx.raw || tx)
      if (status.result || status.code && BROADCAST_SUCCESS_CODES.includes(status.code)) {
        return tx.id
      }
      throw new Error(`Failed to broadcast transaction: ${status.code}`)
    } catch (e) {
      throw toError(e)
    }
  }

  async getTransactionInfo(txid: string): Promise<TransactionInfo> {
    try {
      const [tx, txInfo, currentBlock] = await Promise.all([
        this.tronweb.trx.getTransaction(txid),
        this.tronweb.trx.getTransactionInfo(txid),
        this.tronweb.trx.getCurrentBlock(),
      ])

      const { amountTrx, from, to } = this.extractTxFields(tx)

      const [fromIndex, toIndex] = await Promise.all([
        this.getAddressIndexOrNull(from),
        this.getAddressIndexOrNull(to),
      ])

      const contractRet = get(tx, 'ret[0].contractRet')
      const executed = contractRet === 'SUCCESS'

      const block = txInfo.blockNumber
      const feeTrx = toMainDenomination(txInfo.fee || 0)

      const currentBlockNumber = get(currentBlock, 'block_header.raw_data.number', 0)
      const confirmations = currentBlockNumber && block ? currentBlockNumber - block : 0
      const confirmed = confirmations > 0

      const date = new Date(tx.raw_data.timestamp)

      let status: TransactionStatus = 'pending'
      if (confirmed) {
        if (!executed) {
          status = 'failed'
        }
        status = 'confirmed'
      }

      return {
        id: tx.txID,
        amount: amountTrx,
        to,
        from,
        toExtraId: null,
        fromIndex,
        toIndex,
        block,
        fee: feeTrx,
        executed,
        confirmed,
        confirmations,
        date,
        status,
        raw: {
          ...tx,
          ...txInfo,
          currentBlock: pick(currentBlock, 'block_header', 'blockID'),
        }
      }
    } catch (e) {
      throw toError(e)
    }
  }

  private extractTxFields(tx: TronTransaction) {
    const contractParam = get(tx, 'raw_data.contract[0].parameter.value')
    if (!(contractParam && typeof contractParam.amount === 'number')) {
      throw new Error('Unable to get transaction')
    }

    const amountSun = contractParam.amount || 0
    const amountTrx = toMainDenomination(amountSun)
    const to = this.tronweb.address.fromHex(contractParam.to_address)
    const from = this.tronweb.address.fromHex(contractParam.owner_address)
    return {
      amountTrx,
      amountSun,
      to,
      from,
    }
  }
}

function canSweepBalance(balanceSun: number): boolean {
  return (balanceSun - TRX_FEE_FOR_TRANSFER_SUN) > 0
}
