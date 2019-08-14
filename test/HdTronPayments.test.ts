import fs from 'fs'
import path from 'path'
import { omit } from 'lodash'

import { HdTronPayments } from '#/HdTronPayments'
import { TronTransactionInfo } from '#/types'

import { txInfo_209F8, signedTx_valid, txInfo_a0787, signedTx_invalid } from './fixtures/transactions'
import { hdAccount } from './fixtures/accounts'
import { HdTronPaymentsConfig, TronSignedTransaction, TronUnsignedTransaction } from '../src/types'
import { resolveSoa } from 'dns'
import { FeeRateType, BalanceResult, TransactionStatus, NetworkType } from '@faast/payments-common'
import { END_TRANSACTION_STATES, delay, expectEqualWhenTruthy, TestLogger } from './utils'
import BigNumber from 'bignumber.js'
import { Transaction } from 'tronweb'

const { XPRV, XPUB, PRIVATE_KEYS, ADDRESSES } = hdAccount

const EXTERNAL_ADDRESS = 'TW22XzVixyFZU5DxQJwxqXuKfNKFNMLqJ2'

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs
    .readFileSync(secretXprvFilePath)
    .toString('utf8')
    .trim()
  console.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  console.log(
    `File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`,
  )
}

const txInfoOmitEquality = ['data.currentBlock', 'confirmations']
function assertTxInfo(actual: TronTransactionInfo, expected: TronTransactionInfo): void {
  expect(omit(actual, txInfoOmitEquality)).toEqual(omit(expected, txInfoOmitEquality))
}

// Wait for the transaction to expire
async function waitForExpiration(tx: TronUnsignedTransaction) {
  await delay(Date.now() - (tx.data as Transaction).raw_data.expiration + 100)
}

function runHardcodedPublicKeyTests(tp: HdTronPayments, config: HdTronPaymentsConfig) {
  it('getFullConfig', () => {
    expect(tp.getFullConfig()).toEqual(config)
  })
  it('getPublicConfig', () => {
    expect(tp.getPublicConfig()).toEqual({
      ...config,
      hdKey: XPUB,
    })
  })
  it('getAccountIds', () => {
    expect(tp.getAccountIds()).toEqual([XPUB])
  })
  it('getAccountId for index 0', () => {
    expect(tp.getAccountId(0)).toEqual(XPUB)
  })
  it('getAccountId for index 10', () => {
    expect(tp.getAccountId(10)).toEqual(XPUB)
  })
  it('getXpub', async () => {
    expect(tp.getXpub()).toEqual(XPUB)
  })
  it('getPayport for index 1', async () => {
    expect(await tp.getPayport(1)).toEqual({ address: ADDRESSES[1] })
  })
  it('getPayport for high index', async () => {
    expect(await tp.getPayport(10000)).toEqual({ address: ADDRESSES[10000] })
  })
  it('resolvePayport resolves for index 1', async () => {
    expect(await tp.resolvePayport(1)).toEqual({ address: ADDRESSES[1] })
  })
  it('resolvePayport resolves for address', async () => {
    expect(await tp.resolvePayport(ADDRESSES[1])).toEqual({ address: ADDRESSES[1] })
  })
  it('resolvePayport resolves for external address', async () => {
    expect(await tp.resolvePayport(EXTERNAL_ADDRESS)).toEqual({ address: EXTERNAL_ADDRESS })
  })
  it('resolvePayport resolves for payport', async () => {
    const payport = { address: ADDRESSES[1] }
    expect(await tp.resolvePayport(payport)).toEqual(payport)
  })
  it('resolvePayport throws for invalid address', async () => {
    await expect(tp.resolvePayport('invalid')).rejects.toThrow()
  })
  it('resolveFromTo is correct for (index, index)', async () => {
    expect(await tp.resolveFromTo(0, 2)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: ADDRESSES[0] },
      toAddress: ADDRESSES[2],
      toIndex: 2,
      toExtraId: undefined,
      toPayport: { address: ADDRESSES[2] },
    })
  })
  it('resolveFromTo is correct for external address', async () => {
    expect(await tp.resolveFromTo(0, EXTERNAL_ADDRESS)).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: ADDRESSES[0] },
      toAddress: EXTERNAL_ADDRESS,
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: EXTERNAL_ADDRESS },
    })
  })
  it('resolveFromTo is correct for internal address', async () => {
    expect(await tp.resolveFromTo(0, ADDRESSES[2])).toEqual({
      fromAddress: ADDRESSES[0],
      fromIndex: 0,
      fromExtraId: undefined,
      fromPayport: { address: ADDRESSES[0] },
      toAddress: ADDRESSES[2],
      toIndex: null,
      toExtraId: undefined,
      toPayport: { address: ADDRESSES[2] },
    })
  })
  it('resolveFromTo throws for address as from', async () => {
    await expect(tp.resolveFromTo(EXTERNAL_ADDRESS as any, 0)).rejects.toThrow()
  })

  it('get transaction by hash with a fee', async () => {
    const tx = await tp.getTransactionInfo('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c')
    assertTxInfo(tx, txInfo_209F8)
  })
  it('get transaction by hash without a fee', async () => {
    const tx = await tp.getTransactionInfo('a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39')
    assertTxInfo(tx, txInfo_a0787)
  })
  it('fail to get an invalid transaction hash', async () => {
    await expect(tp.getTransactionInfo('123456abcdef')).rejects.toThrow('Transaction not found')
  })

  it('get a balance using xpub and index', async () => {
    expect(await tp.getBalance(1)).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      sweepable: false,
    })
  })
  it('get a balance using an address', async () => {
    expect(await tp.getBalance({ address: 'TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26' })).toEqual({
      confirmedBalance: '0',
      unconfirmedBalance: '0',
      sweepable: false,
    })
  })
  it('broadcast an existing sweep transaction', async () => {
    const result = await tp.broadcastTransaction(signedTx_valid)
    expect(result).toEqual({
      id: signedTx_valid.id,
      rebroadcast: true,
    })
  })
  it('broadcast should fail on invalid tx', async () => {
    await expect(tp.broadcastTransaction(signedTx_invalid)).rejects.toThrow('Failed to broadcast transaction: ')
  })
}

describe('HdTronPayments', () => {
  let testsComplete = false

  afterAll(() => {
    testsComplete = true
  })

  describe('static', () => {
    it('generateNewKeys should return xprv and xpub', async () => {
      let keys = HdTronPayments.generateNewKeys()
      expect(keys.xpub).toMatch(/^xpub\w{107}/)
      expect(keys.xprv).toMatch(/^xprv\w{107}/)
    })
    it('should throw on invalid hdKey', () => {
      expect(() => new HdTronPayments({ hdKey: 'invalid' })).toThrow()
    })
  })

  describe('hardcoded xpub', () => {
    const config = {
      hdKey: XPUB,
      network: NetworkType.Mainnet,
      logger: new TestLogger(),
    }
    const tp = new HdTronPayments(config)

    runHardcodedPublicKeyTests(tp, config)

    it('getPrivateKey throws', async () => {
      await expect(tp.getPrivateKey(1)).rejects.toThrow()
    })
  })

  describe('hardcoded xprv', () => {
    const config = {
      hdKey: XPRV,
      network: NetworkType.Mainnet,
      logger: new TestLogger(),
    }
    const tp = new HdTronPayments(config)

    runHardcodedPublicKeyTests(tp, config)

    it('getPrivateKey returns private key 1', async () => {
      expect(await tp.getPrivateKey(1)).toEqual(PRIVATE_KEYS[1])
    })
  })

  if (secretXprv) {
    describe('secret xprv', () => {
      const tp = new HdTronPayments({
        hdKey: secretXprv,
        network: NetworkType.Mainnet,
        logger: new TestLogger(),
      })
      const address0 = 'TGykLnoEQWYh6Mj6XWk9dWU5L6SXez2AWj'
      const address3 = 'TJGHeNADuV24au6bscVSfiynZmcpTMN8UK'
      const xpub =
        'xpub6CGU5e4rYticTKsvfMuqwDwTWfHefspTdgvkf9gcuVcvCxsCfBZnbRkhJw4CM5Vtcxefov4wteUT2Tr4LJZnJitqVVN9BekupBFupySNs5J'

      it('get correct xpub', async () => {
        expect(tp.getXpub()).toEqual(xpub)
      })
      it('get correct address for index 0', async () => {
        expect(await tp.getPayport(0)).toEqual({ address: address0 })
      })
      it('get correct address for index 3', async () => {
        expect(await tp.getPayport(3)).toEqual({ address: address3 })
      })
      it('get correct balance for index 0', async () => {
        expect(await tp.getBalance(0)).toEqual({
          confirmedBalance: '2.4',
          unconfirmedBalance: '0',
          sweepable: true,
        })
      })
      it('get correct balance for address 0', async () => {
        expect(await tp.getBalance({ address: address0 })).toEqual({
          confirmedBalance: '2.4',
          unconfirmedBalance: '0',
          sweepable: true,
        })
      })

      it('create transaction fails with custom fee', async () => {
        await expect(
          tp.createSweepTransaction(0, 3, { feeRate: '0.1', feeRateType: FeeRateType.Main }),
        ).rejects.toThrow('tron-payments custom fees are unsupported')
      })
      it('create sweep transaction to an index', async () => {
        const tx = await tp.createSweepTransaction(0, 3)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual('2.3')
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(3)
        await waitForExpiration(tx)
      })
      it('create sweep transaction to an internal address', async () => {
        const tx = await tp.createSweepTransaction(0, { address: address3 })
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual('2.3')
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
        await waitForExpiration(tx)
      })
      it('create sweep transaction to an external address', async () => {
        const tx = await tp.createSweepTransaction(0, { address: EXTERNAL_ADDRESS })
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual('2.3')
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(EXTERNAL_ADDRESS)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
        await waitForExpiration(tx)
      })

      it('create send transaction to an index', async () => {
        const amount = '0.5'
        const tx = await tp.createTransaction(0, 3, amount)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual(amount)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(3)
        await waitForExpiration(tx)
      })
      it('create send transaction to an internal address', async () => {
        const amount = '0.5'
        const tx = await tp.createTransaction(0, { address: address3 }, amount)
        expect(tx).toBeDefined()
        expect(tx.amount).toEqual(amount)
        expect(tx.fromAddress).toEqual(address0)
        expect(tx.toAddress).toEqual(address3)
        expect(tx.fromIndex).toEqual(0)
        expect(tx.toIndex).toEqual(null)
        await waitForExpiration(tx)
      })

      async function pollUntilEnded(signedTx: TronSignedTransaction) {
        const txId = signedTx.id
        console.log('polling until ended', txId)
        let tx: TronTransactionInfo | undefined
        while (!testsComplete && (!tx || !END_TRANSACTION_STATES.includes(tx.status) || tx.confirmations === 0)) {
          try {
            tx = await tp.getTransactionInfo(txId)
          } catch (e) {
            if (e.message.includes('Transaction not found')) {
              console.log('tx not found yet', txId, e.message)
            } else {
              throw e
            }
          }
          await delay(5000)
        }
        if (!tx) {
          throw new Error(`failed to poll until ended ${txId}`)
        }
        console.log(tx.status, tx)
        expect(tx.id).toBe(signedTx.id)
        expect(tx.fromAddress).toBe(signedTx.fromAddress)
        expectEqualWhenTruthy(tx.fromExtraId, signedTx.fromExtraId)
        expect(tx.toAddress).toBe(signedTx.toAddress)
        expectEqualWhenTruthy(tx.toExtraId, signedTx.toExtraId)
        expect(tx.data).toBeDefined()
        expect(tx.status).toBe(TransactionStatus.Confirmed)
        expect(tx.isConfirmed).toBe(true)
        expect(tx.isExecuted).toBe(true)
        expect(tx.confirmationId).toMatch(/^\w+$/)
        expect(tx.confirmationTimestamp).toBeDefined()
        expect(tx.confirmations).toBeGreaterThan(0)
        return tx
      }

      jest.setTimeout(300 * 1000)

      it('end to end sweep', async () => {
        const indicesToTry = [5, 6]
        const balances: { [i: number]: BalanceResult } = {}
        let indexToSweep: number = -1
        for (const index of indicesToTry) {
          const balanceResult = await tp.getBalance(index)
          balances[index] = balanceResult
          if (balanceResult.sweepable) {
            indexToSweep = index
            break
          }
        }
        if (indexToSweep < 0) {
          const allAddresses = await Promise.all(indicesToTry.map(i => tp.getPayport(i)))
          console.log(
            'Cannot end to end test sweeping due to lack of funds. Send TRX to any of the following addresses and try again.',
            allAddresses,
          )
          return
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        try {
          const unsignedTx = await tp.createSweepTransaction(indexToSweep, recipientIndex)
          const signedTx = await tp.signTransaction(unsignedTx)
          console.log(`Sweeping ${signedTx.amount} TRX from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
          expect(await tp.broadcastTransaction(signedTx)).toEqual({
            id: signedTx.id,
            rebroadcast: false,
          })
          const tx = await pollUntilEnded(signedTx)
          expect(tx.amount).toEqual(signedTx.amount)
          expect(tx.fee).toEqual(signedTx.fee)
        } catch (e) {
          if ((e.message || (e as string)).includes('Validate TransferContract error, balance is not sufficient')) {
            console.log('Ran consecutive tests too soon, previous sweep not complete. Wait a minute and retry')
          }
          throw e
        }
      })
    })
  }
})
