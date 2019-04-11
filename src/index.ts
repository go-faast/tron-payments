import bitcore from 'bitcore-lib'
import Tronweb, { Transaction as TronTransaction } from 'tronweb'
import { pick, get } from 'lodash'
import { Balance } from 'payments-common'

import { derivationPath, deriveAddress, derivePrivateKey } from './tron-bip44'
import { TransactionInfo, SignedTransaction, Broadcast } from './types'

const TRX_FEE_FOR_TRANSFER = Number.parseInt(process.env.TRX_FEE_FOR_TRANSFER || '1000')
const TRX_FEE_FOR_TRANSFER_SUN = TRX_FEE_FOR_TRANSFER * 100
const BROADCAST_SUCCESS_CODES = ['SUCCESS', 'DUP_TRANSACTION_ERROR']

const DEFAULT_OPTIONS = {
  fullNode: process.env.TRX_FULL_NODE_URL || 'http://54.236.37.243:8090', // 'https://api.trongrid.io',
  solidityNode: process.env.TRX_SOLIDITY_NODE_URL || 'http://47.89.187.247:8091', // 'https://api.trongrid.io',
  eventServer: process.env.TRX_EVENT_SERVER_URL || 'https://api.trongrid.io',
}

interface TronPaymentsOptionsResolved {
  fullNode: string
  solidityNode: string
  eventServer: string
}
type TronPaymentsOptions = Partial<TronPaymentsOptionsResolved>

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

export default class TronPayments {
  options: TronPaymentsOptionsResolved
  tronweb: Tronweb

  constructor(options: TronPaymentsOptions = DEFAULT_OPTIONS) {
    // overwrite options explicitly provided.
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }

    this.tronweb = new Tronweb(
      this.options.fullNode,
      this.options.solidityNode,
      this.options.eventServer
    )
  }

  static toMainDenomination = toMainDenomination
  static toBaseDenomination = toBaseDenomination
  toMainDenomination = toMainDenomination
  toBaseDenomination = toBaseDenomination

  bip44(xpub: string, index: number): string {
    const pub = deriveAddress(xpub, index)
    if (this.tronweb.isAddress(pub)) {
      return pub
    } else {
      throw new Error('address validation failed')
    }
  }

  getPrivateKey(xprv: string, index: number): string {
    if (!xprv) {
      throw new Error('Xprv is falsey. Bad things will happen to you.')
    }
    return derivePrivateKey(xprv, index)
  }

  privateToPublic(privateKey: string): string {
    let pub = this.tronweb.address.fromPrivateKey(privateKey)
    if (this.tronweb.isAddress(pub)) {
      return pub
    } else {
      throw new Error('address validation failed')
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

  getXpubFromXprv(xprv: string): string {
    const key = new bitcore.HDPrivateKey(xprv)
    const derivedPubKey = key.derive(derivationPath).hdPublicKey
    return derivedPubKey.toString()
  }

  async getBalanceAddress(address: string): Promise<Balance> {
    try {
      if (!this.tronweb.isAddress(address)) {
        throw new Error('Invalid TRON address')
      }
      const balanceSun = await this.tronweb.trx.getBalance(address)
      return {
        balance: toMainDenomination(balanceSun).toString(),
        unconfirmedBalance: '0',
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async getBalanceFromPath(xpub: string, index: number): Promise<Balance> {
    const address = this.bip44(xpub, index)
    return this.getBalanceAddress(address)
  }

  async canSweep(address: string): Promise<boolean> {
    try {
      const balance = await this.tronweb.trx.getBalance(address)
      return canSweepBalance(balance)
    } catch(e) {
      throw toError(e)
    }
  }

  // TRX = Energy needed * 100 sun
  async getSweepTransaction(xprv: string, index: number, to: string): Promise<SignedTransaction> {
    try {
      const privateKey = this.getPrivateKey(xprv, index)

      const address = this.privateToPublic(privateKey)
      const balanceSun = await this.tronweb.trx.getBalance(address)
      const balanceTrx = toMainDenomination(balanceSun)
      const feeSun = TRX_FEE_FOR_TRANSFER_SUN
      const feeTrx = toMainDenomination(feeSun)
      if (!canSweepBalance(balanceSun)) {
        throw new Error(`Insufficient balance (${balanceTrx}) to sweep with fee of ${feeTrx}`)
      }
      const amountSun = balanceSun - feeSun
      const amountTrx = toMainDenomination(amountSun)
      const tx = await this.tronweb.transactionBuilder.sendTrx(to, amountSun, address)
      const signedTx = await this.tronweb.trx.sign(tx, privateKey)
      return {
        id: signedTx.txID,
        from: address,
        to,
        amount: amountTrx,
        fee: feeTrx,
        raw: signedTx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async getSendTransaction(privateKey: string, amountTrx: string, to: string): Promise<SignedTransaction> {
    try {
      const amountSun = toBaseDenominationNumber(amountTrx)
      const address = this.privateToPublic(privateKey)
      const balanceSun = await this.tronweb.trx.getBalance(address)
      const balanceTrx = toMainDenomination(balanceSun)
      const feeSun = TRX_FEE_FOR_TRANSFER_SUN
      const feeTrx = toMainDenomination(feeSun)
      if ((balanceSun - feeSun) < amountSun) {
        throw new Error(`Insufficient balance (${balanceTrx}) to send including fee of ${feeTrx}`)
      }
      const tx = await this.tronweb.transactionBuilder.sendTrx(to, amountSun, address)
      const signedTx = await this.tronweb.trx.sign(tx, privateKey)
      return {
        id: signedTx.txID,
        from: address,
        to,
        amount: amountTrx,
        fee: feeTrx,
        raw: signedTx,
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async broadcastTransaction(tx: SignedTransaction): Promise<Broadcast> {
    try {
      const status = await this.tronweb.trx.sendRawTransaction(tx.raw || tx)
      if (status.result || status.code && BROADCAST_SUCCESS_CODES.includes(status.code)) {
        return {
          id: tx.id,
          rebroadcast: status.code === 'DUP_TRANSACTION_ERROR'
        }
      }
      throw new Error(`Failed to broadcast transaction: ${status.code}`)
    } catch (e) {
      throw toError(e)
    }
  }

  async getTransaction(txid: string, blocksForConfirmation: number = 1): Promise<TransactionInfo> {
    try {
      const [tx, txInfo, currentBlock] = await Promise.all([
        this.tronweb.trx.getTransaction(txid),
        this.tronweb.trx.getTransactionInfo(txid),
        this.tronweb.trx.getCurrentBlock(),
      ])

      const { amountTrx, from, to } = this.extractTxFields(tx)

      const contractRet = get(tx, 'ret[0].contractRet')
      const contractExecuted = contractRet === 'SUCCESS'

      const block = txInfo.blockNumber
      const feeTrx = toMainDenomination(txInfo.fee || 0)

      const currentBlockNumber = get(currentBlock, 'block_header.raw_data.number', 0)
      const confirmed = currentBlockNumber && currentBlockNumber - block >= blocksForConfirmation

      return {
        id: tx.txID,
        amount: amountTrx,
        to,
        from,
        executed: contractExecuted,
        block,
        fee: feeTrx,
        confirmed,
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

function canSweepBalance(balance: number): boolean {
  return (balance - TRX_FEE_FOR_TRANSFER_SUN) > 0
}
