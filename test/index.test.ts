/* tslint:disable: max-line-length no-console no-constant-condition */

import TronPayments from '../src'
import fs from 'fs'
import path from 'path'
import { txInfo_209F8, signedTx_78f92, txInfo_a0787 } from './fixtures/transactions';
import { omit } from 'lodash'
import { SignedTransaction, TransactionInfo } from '#/types';

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

const txInfoOmitEquality = ['raw.currentBlock', 'confirmations']
function assertTxInfo(actual: TransactionInfo, expected: TransactionInfo): void {
  expect(omit(actual, txInfoOmitEquality)).toEqual(omit(expected, txInfoOmitEquality))
}

describe('TronPayments', async () => {

  describe('hardcoded xprv', async () => {
    const tp = new TronPayments({
      account: XPRV,
    })

    it('xprvToXpub', async () => {
      expect(tp.xprvToXpub(XPRV)).toBe(XPUB)
    })
    it('privateKeyToAddress', async () => {
      expect(tp.privateKeyToAddress(PRIVATE_KEY)).toBe(ADDRESS)

    })
    it('generate a new set of pub and priv keys', async () => {
      let keys = tp.generateNewKeys()
      expect(keys.xpub).toMatch(/^xpub\w{107}/)
      expect(keys.xprv).toMatch(/^xprv\w{107}/)
    })

    it('getPrivateKey for index 1', async () => {
      expect(await tp.getPrivateKey(1)).toBe(PRIVATE_KEY) // 753FCB9D713D6F077BF6DA41DC015AAC4B575C3944F27FB9435EDFF5DAFE719D
    })
    it('getAddress for index 1', async () => {
      expect(await tp.getAddress(1)).toBe(ADDRESS) // TEx9hRCRYLz9ZXsN61AdeqordiFx5sYiBc
    })

    // This test takes a long time. It really just makes sure we don't have padding
    // issues in a brute force way.
    it.skip('generate 1000 addresses and private keys, make sure they match', async () => {
      let tasks = []
      for (let i = 4000; i < 5000; i++) {
        let address = await tp.getAddress(i)
        let privateKey = await tp.getPrivateKey(i)
        let addressFromPkey = tp.privateKeyToAddress(privateKey)
        if (address !== addressFromPkey) {
          throw new Error(`key mismatch: ${address}, ${privateKey}, ${addressFromPkey}`)
        }
      }
    })

    it('get transaction by hash with a fee', async () => {
      const tx = await tp.getTransactionInfo('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c')
      assertTxInfo(tx, txInfo_209F8)
    })
    it('get transaction by hash without a fee', async () => {
      const tx = await tp.getTransactionInfo('a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39')
      assertTxInfo(tx, txInfo_a0787)
    })
    it('should fail to get an invalid transaction hash', async () => {
      await expect(tp.getTransactionInfo('123456abcdef'))
        .rejects.toThrow('Transaction not found')
    })

    it('should get a balance using xpub and index', async () => {
      expect(await tp.getBalance(1)).toEqual({
        balance: '0',
        unconfirmedBalance: '0',
      })
    })
    it('should get a balance using an address', async () => {
      expect(await tp.getBalance('TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26')).toEqual({
        balance: '0',
        unconfirmedBalance: '0',
      })
    })
    it('should broadcast an existing sweep transaction', async () => {
      const result = await tp.broadcastTransaction(signedTx_78f92)
      expect(result).toBe(signedTx_78f92.id)
    })
  })

  if (secretXprv) {
    describe('secret xprv', async () => {
      const tp = new TronPayments({
        account: secretXprv,
      })
      const secretXpub = tp.xprvToXpub(secretXprv)
      const address0 = 'TWc9zTvsBwZB2nLBNjuUiNSTyaNtDo53vi'
      const address3 = 'TVjvkL65TGV7Lp3Dit2kPCigHVd1aSVyVw'
      it('should get correct address for index 0', async () => {
        expect(await tp.getAddress(0)).toBe(address0)
      })
      it('should get correct address for index 3', async () => {
        expect(await tp.getAddress(3)).toBe(address3)
      })
      it('should get correct balance for index 0', async () => {
        expect(await tp.getBalance(0)).toEqual({
          balance: '0.6',
          unconfirmedBalance: '0',
        })
      })
      it('should get correct balance for address 0', async () => {
        expect(await tp.getBalance(address0)).toEqual({
          balance: '0.6',
          unconfirmedBalance: '0',
        })
      })
      it('should generate a sweep transaction using indices', async () => {
        const signedTx = await tp.createSweepTransaction(0, 3)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe('0.5')
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('should generate a send transaction using indices', async () => {
        const amount = '0.3'
        const signedTx = await tp.createTransaction(0, 3, amount)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe(amount)
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('should generate a sweep transaction using indices', async () => {
        const signedTx = await tp.createSweepTransaction(address0, address3)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe('0.5')
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })
      it('should generate a send transaction using indices', async () => {
        const amount = '0.3'
        const signedTx = await tp.createTransaction(address0, address3, amount)
        expect(signedTx).toBeDefined()
        expect(signedTx.amount).toBe(amount)
        expect(signedTx.from).toBe(address0)
        expect(signedTx.to).toBe(address3)
        expect(signedTx.fromIndex).toBe(0)
        expect(signedTx.toIndex).toBe(3)
      })

      it('should end to end sweep', async () => {
        const indicesToTry = [5, 6]
        let indexToSweep: number = -1
        for (const index of indicesToTry) {
          if (await tp.canSweep(index)) {
            indexToSweep = index
            break
          }
        }
        if (indexToSweep < 0) {
          console.log('Cannot end to end test sweeping due to lack of funds. Send TRX to any of the following addresses and try again.',
            indicesToTry.map((i) => tp.getAddress(i)))
          return
        }
        const recipientIndex = indexToSweep === indicesToTry[0] ? indicesToTry[1] : indicesToTry[0]
        const signedTx = await tp.createSweepTransaction(indexToSweep, recipientIndex)
        console.log(`Sweeping ${signedTx.amount} TRX from ${indexToSweep} to ${recipientIndex} in tx ${signedTx.id}`)
        expect(await tp.broadcastTransaction(signedTx)).toEqual({
          id: signedTx.id,
          rebroadcast: false,
        })
      })
    })
  }
})
