/* tslint:disable: max-line-length no-console no-constant-condition */

import TronPayments from '../src'
import fs from 'fs'
import path from 'path'
import { txInfo_209F8, signedTx_78f92 } from './fixtures/transactions'
import { omit } from 'lodash'
import { SignedTransaction } from '#/types';

const XPRV = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
const XPUB = 'xpub6CHkPtveMF33AX8dX5o8z1R7qBNHF64K3w1xNrTY8v3AajCnCWSSCimZWroiKdB8UfqQdMRqoXyS4pxPCpdPCGKPPXSxej19u9tk12Ab1S7'

const PRIVATE_KEY = '01E9156CD53A7AFEB7CEB950598A381F52DEE02A45459F04F7CF734F8C085632'
const ADDRESS = 'TWsgBMe63e2vJMxsFpzhfmBmbpgx9u8BmS'

const SECRET_XPRV_FILE = 'test/keys/mainnet.key'

const rootDir = path.resolve(__dirname, '..')
const secretXprvFilePath = path.resolve(rootDir, SECRET_XPRV_FILE)
let secretXprv = ''
if (fs.existsSync(secretXprvFilePath)) {
  secretXprv = fs.readFileSync(secretXprvFilePath).toString('utf8').trim()
  console.log(`Loaded ${SECRET_XPRV_FILE}. Send and sweep tests enabled.`)
} else {
  console.log(`File ${SECRET_XPRV_FILE} missing. Send and sweep tests will be skipped. To enable all tests ask Dylan to share the file with you on Lastpass.`)
}

describe('TronPayments', async () => {
  const tp = new TronPayments()

  it('get xpub for hardcoded xprv', async () => {
    expect(tp.getXpubFromXprv(XPRV)).toBe(XPUB)
  })
  it('get address for index 1', async () => {
    expect(tp.bip44(XPUB, 1)).toBe(ADDRESS) // TEx9hRCRYLz9ZXsN61AdeqordiFx5sYiBc
  })

  it('getPrivateKey for 0/1', async () => {
    expect(tp.getPrivateKey(XPRV, 1)).toBe(PRIVATE_KEY) // 753FCB9D713D6F077BF6DA41DC015AAC4B575C3944F27FB9435EDFF5DAFE719D

  })
  it('privateToPublic for 0/1', async () => {
    expect(tp.privateToPublic(PRIVATE_KEY)).toBe(ADDRESS)

  })
  it('generate a new set of pub and priv keys', async () => {
    let keys = tp.generateNewKeys()
    expect(keys.xpub).toMatch(/^xpub\w{107}/)
    expect(keys.xprv).toMatch(/^xprv\w{107}/)
  })

  // This test takes a long time. It really just makes sure we don't have padding
  // issues in a brute force way.
  it.skip('generate 1000 addresses and private keys, make sure they match', async () => {
    let tasks = []
    for (let i = 4000; i < 5000; i++) {
      let pub = tp.bip44(XPUB, i)
      let prv = tp.getPrivateKey(XPRV, i)
      let pubFromPrv = tp.privateToPublic(prv)
      if (pub !== pubFromPrv) {
        throw new Error(`key mismatch: ${pub}, ${prv}, ${pubFromPrv}`)
      }
    }
  })

  it('get transaction by hash without confirmations', async () => {
    const tx = await tp.getTransaction('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c')
    expect(omit(tx, 'raw.currentBlock')).toEqual(omit(txInfo_209F8, 'raw.currentBlock'))
  })
  it('get transaction by hash with confirmations', async () => {
    const tx = await tp.getTransaction('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c', 200000000000000)
    expect(omit(tx, 'raw')).toEqual({
      ...omit(txInfo_209F8, 'raw'),
      confirmed: false,
    })
  })
  it('get transaction by hash without a fee', async () => {
    const tx = await tp.getTransaction('a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39')
    expect(tx).toBeDefined()
    expect(tx.confirmed).toBe(true)
    expect(tx.fee).toBe('0')
  })
  it('should fail to get an invalid transaction hash', async () => {
    await expect(tp.getTransaction('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140d', 1))
      .rejects.toThrow('Transaction not found')
  })

  it('should get a balance using xpub and index', async () => {
    const balanceInfo = await tp.getBalanceFromPath(XPUB, 1)
    expect(balanceInfo).toBeDefined()
    expect(balanceInfo.balance).toBeDefined()
  })
  it('should get a balance using an address', async () => {
    const balanceInfo = await tp.getBalanceAddress('TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26')
    expect(balanceInfo).toBeDefined()
    expect(balanceInfo.balance).toBeDefined()
  })
  it('should broadcast an existing sweep transaction', async () => {
    const result = await tp.broadcastTransaction(signedTx_78f92)
    expect(result).toEqual({
      id: signedTx_78f92.id,
      rebroadcast: true
    })
  })

  if (secretXprv) {
    const secretXpub = tp.getXpubFromXprv(secretXprv)
    const secretPrivateKey = tp.getPrivateKey(secretXprv, 0)
    const secretAddress = tp.bip44(secretXpub, 0)
    it('should get correct address for index 0 using secret xprv', async () => {
      expect(tp.bip44(secretXpub, 0)).toBe(secretAddress)
    })
    it('should get correct balance for index 0 using secret xprv', async () => {
      expect(await tp.getBalanceFromPath(secretXpub, 0)).toEqual({
        balance: '0.6',
        unconfirmedBalance: '0',
      })
    })
    it('should get correct balance for secret xprv address', async () => {
      expect(await tp.getBalanceAddress(secretAddress)).toEqual({
        balance: '0.6',
        unconfirmedBalance: '0',
      })
    })
    it('should generate a sweep transaction using secret xprv', async () => {
      const to = tp.bip44(secretXpub, 3)
      const signedTx = await tp.getSweepTransaction(secretXprv, 0, to)
      expect(signedTx).toBeDefined()
      expect(signedTx.amount).toBe('0.5')
    })

    it('should generate a send transaction using secret xprv', async () => {
      const amount = '0.3'
      const to = tp.bip44(secretXpub, 3)
      const signedTx = await tp.getSendTransaction(secretPrivateKey, amount, to)
      expect(signedTx).toBeDefined()
      expect(signedTx.amount).toBe(amount)
    })

    it('should end to end sweep using secret xprv', async () => {
      const indicesToTry = [5, 6]
      let indexToSweep: number = -1
      for (const index of indicesToTry) {
        const address = tp.bip44(secretXpub, index)
        if (await tp.canSweep(address)) {
          indexToSweep = index
          break
        }
      }
      if (indexToSweep < 0) {
        console.log('Cannot end to end test sweeping due to lack of funds. Send TRX to any of the following addresses and try again.',
          indicesToTry.map((i) => tp.bip44(secretXpub, i)))
        return
      }
      const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
      const recipient = tp.bip44(secretXpub, recipientIndex)
      const signedTx = await tp.getSweepTransaction(secretXprv, indexToSweep, recipient)
      console.log(`Sweeping ${signedTx.amount} TRX from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
      expect(await tp.broadcastTransaction(signedTx)).toEqual({
        id: signedTx.id,
        rebroadcast: false,
      })
    })
  }
})
