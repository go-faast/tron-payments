import bitcore from 'bitcore-lib'
import Tronweb from 'tronweb'
import { derivationPath, deriveAddress, derivePrivateKey } from './tron-bip44'

const TRX_FEE_FOR_TRANSFER = Number.parseInt(process.env.TRX_FEE_FOR_TRANSFER || '1000')

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

  async getBalanceAddress(address: string): Promise<any> {
    try {
      if (!this.tronweb.isAddress(address)) {
        throw new Error('Invalid TRON address')
      }
      const balance = await this.tronweb.trx.getBalance(address)
      return {
        address,
        balance: this.tronweb.fromSun(balance),
        unconfirmedBalance: 0,
        rawBalance: balance
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async getBalanceFromPath(xpub: string, index: number): Promise<any> {
    const address = this.bip44(xpub, index)
    return this.getBalanceAddress(address)
  }

  // TRX = Energy needed * 100 sun
  async getSweepTransaction(xprv: string, index: number, to: string): Promise<any> {
    try {
      const privateKey = this.getPrivateKey(xprv, index)

      const address = this.privateToPublic(privateKey)
      const balance = await this.tronweb.trx.getBalance(address)
      const fee = TRX_FEE_FOR_TRANSFER * 100
      const sendAmount = balance - fee
      if (sendAmount <= 0) {
        throw new Error(`Insufficient balance (${balance}) to sweep with fee of (${fee})`)
      }
      const tx = await this.tronweb.transactionBuilder.sendTrx(to, sendAmount, address)
      const signedTx = await this.tronweb.trx.sign(tx, privateKey)
      return {
        signedTx,
        txid: signedTx.txID
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async getSendTransaction(privateKey: string, amountInSun: number, to: string): Promise<any> {
    try {
      const address = this.privateToPublic(privateKey)
      const balance = await this.tronweb.trx.getBalance(address)
      const fee = TRX_FEE_FOR_TRANSFER * 100
      if ((balance - fee) < amountInSun) {
        throw new Error(`Insufficient balance (${balance}) to send including fee of ${fee}`)
      }
      const tx = await this.tronweb.transactionBuilder.sendTrx(to, amountInSun, address)
      const signedTx = await this.tronweb.trx.sign(tx, privateKey)
      return {
        signedTx,
        txid: signedTx.txID
      }
    } catch (e) {
      throw toError(e)
    }
  }

  async broadcastTransaction(txObject: any): Promise<any> {
    try {
      let signedTx = txObject
      if (txObject.signedTx) {
        signedTx = txObject.signedTx
      }
      const broadcasted = await this.tronweb.trx.sendRawTransaction(signedTx)
      return broadcasted
    } catch (e) {
      throw toError(e)
    }
  }

  // {amount, from, to, executed, block, fee, confirmed}
  // block number: curl -X POST  https://api.trongrid.io/wallet/getnowblock
  async getTransaction(txid: string, blocksForConfirmation: number = 1): Promise<any> {
    try {
      const [tx, txInfo, currentBlock] = await Promise.all([
        this.tronweb.trx.getTransaction(txid),
        this.tronweb.trx.getTransactionInfo(txid),
        this.tronweb.trx.getCurrentBlock(),
      ])
      if (!(tx &&
        tx.raw_data &&
        tx.raw_data.contract[0] &&
        tx.raw_data.contract[0].parameter &&
        tx.raw_data.contract[0].parameter.value &&
        tx.raw_data.contract[0].parameter.value.amount)) {
        throw new Error('Unable to get transaction')
      }
      // populate object

      const contractValue = tx.raw_data.contract[0].parameter.value
      const amount = contractValue.amount
      const to = this.tronweb.address.fromHex(contractValue.to_address)
      const from = this.tronweb.address.fromHex(contractValue.owner_address)
      let contractExecuted = false
      if (tx.ret && tx.ret[0] && tx.ret[0].contractRet &&
        tx.ret[0].contractRet === 'SUCCESS') {
        contractExecuted = true
      }

      const block = txInfo.blockNumber
      let fee = txInfo.fee || 0

      let confirmed = false
      let currentBlockNumber = undefined
      if (currentBlock && currentBlock.block_header &&
        currentBlock.block_header.raw_data && currentBlock.block_header.raw_data.number) {
        currentBlockNumber = currentBlock.block_header.raw_data.number
        if (currentBlockNumber - block >= blocksForConfirmation) confirmed = true
      }

      return {
        amount,
        to,
        from,
        executed: contractExecuted,
        txid: tx.txID,
        block,
        fee,
        currentBlock: currentBlockNumber,
        confirmed,
        raw: tx,
      }
    } catch (e) {
      throw toError(e)
    }
  }
}
