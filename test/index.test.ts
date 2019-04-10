/* tslint:disable: max-line-length no-console no-constant-condition */

import TronPayments from '../src'

let xprv = 'xprv9s21ZrQH143K3z2wCDRa3rHg9CHKedM1GvbJzGeZB14tsFdiDtpY6T96c1wWr9rwWhU5C8zcEWFbBVa4T3A8bhGSESDG8Kx1SSPfM2rrjxk'
let xpubOnPath = 'xpub6CHkPtveMF33AX8dX5o8z1R7qBNHF64K3w1xNrTY8v3AajCnCWSSCimZWroiKdB8UfqQdMRqoXyS4pxPCpdPCGKPPXSxej19u9tk12Ab1S7'

let privateKey = ''
let pubAddress = ''

describe('TronPayments', () => {
  const tp = new TronPayments()

  it('get an xpub from an xprv', async () => {
    let generateXpub = tp.getXpubFromXprv(xprv)
    expect(generateXpub).toEqual(xpubOnPath)
    xpubOnPath = generateXpub
  })
  it('getDepositAddress for 0/1', async () => {
    pubAddress = tp.bip44(xpubOnPath, 1)
    expect(pubAddress).toBe('TWsgBMe63e2vJMxsFpzhfmBmbpgx9u8BmS') // TEx9hRCRYLz9ZXsN61AdeqordiFx5sYiBc

  })

  it('getPrivateKey for 0/1', async () => {
    privateKey = tp.getPrivateKey(xprv, 1)
    expect(privateKey).toBe('01E9156CD53A7AFEB7CEB950598A381F52DEE02A45459F04F7CF734F8C085632') // 753FCB9D713D6F077BF6DA41DC015AAC4B575C3944F27FB9435EDFF5DAFE719D

  })
  it('privateToPublic for 0/1', async () => {
    let pubKey = tp.privateToPublic(privateKey)
    expect(pubKey).toBe(pubAddress)

  })
  it('generate a new set of pub and priv keys', async () => {
    let keys = tp.generateNewKeys()
    expect(keys.xpub).toBeDefined()
    expect(keys.xprv).toBeDefined()

  })

  // This test takes a long time. It really just makes sure we don't have padding
  // issues in a brute force way.
  if (false) {
    it('generate 1000 addresses and private keys, make sure they match', async () => {
      let tasks = []
      for (let i = 4000; i < 5000; i++) {
        let pub = tp.bip44(xpubOnPath, i)
        let prv = tp.getPrivateKey(xprv, i)
        let pubFromPrv = tp.privateToPublic(prv)
        if (pub !== pubFromPrv) {
          throw new Error(`key mismatch: ${pub}, ${prv}, ${pubFromPrv}`)
        }
      }
    })
  }

  it('Get a transaction hash without confirmations', async () => {
    const tx = await tp.getTransaction('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c')
    expect(tx).toBeDefined()
    expect(tx.confirmed).toBe(true)
    expect(tx.fee).toBe(100000)
  })
  it('Get a transaction hash with confirmations', async () => {
    const tx = await tp.getTransaction('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c', 200000000000000)
    expect(tx).toBeDefined()
    expect(tx.confirmed).toBe(false)
  })
  it('Get a transaction hash without a fee', async () => {
    const tx = await tp.getTransaction('a078736ab768b34dc06ca9048dddfa73383947aed0d93f1eff2adde4b7254f39')
    expect(tx).toBeDefined()
    expect(tx.confirmed).toBe(true)
    expect(tx.fee).toBe(0)
  })
  it('Fail to get an invalid transaction hash', async () => {
    await expect(tp.getTransaction('209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140d', 1))
      .rejects.toThrow('Transaction not found')
  })
  it('Get the Balance of an address', async () => {
    const balanceInfo = await tp.getBalanceFromPath(xpubOnPath, 1)
    expect(balanceInfo).toBeDefined()
    expect(balanceInfo.balance).toBeDefined()
  })
  it('Get the Balance of an address', async () => {
    const balanceInfo = await tp.getBalanceAddress('TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26')
    expect(balanceInfo).toBeDefined()
    expect(balanceInfo.balance).toBeDefined()
  })
  let sweepBalance = 0
  it('Get Balance for a single address', async () => {
    const balanceInfo = await tp.getBalanceFromPath(xpubOnPath, 1)
    expect(balanceInfo.balance).toBeDefined()
    sweepBalance = balanceInfo.rawBalance
  })
  let sweep = true
  if (sweep) {
    it('Generate a sweep transaction for a single address', async () => {
      let to = tp.bip44(xpubOnPath, 1)
      const signedTx = await tp.getSweepTransaction(xprv, 3, to)
      expect(signedTx).toBeDefined()
      expect(signedTx.signedTx.raw_data.contract[0].parameter.value.amount).toBe(sweepBalance - 1000 * 100)
    })
  }
  let signedSendTransaction: any
  let send = true
  if (send) {
    it('Generate a send transaction', async () => {
      let amountInSun = 12323
      let to = tp.bip44(xpubOnPath, 6)
      const signedTx = await tp.getSendTransaction(privateKey, amountInSun, to)
      expect(signedTx).toBeDefined()
      expect(signedTx.signedTx.raw_data.contract[0].parameter.value.amount).toBe(12323)
      signedSendTransaction = signedTx.signedTx
    })
  }
  let broadcast = false
  if (broadcast) {
    it('Broadcast a sweep transaction for a single address', async () => {
      const txHash = await tp.broadcastTransaction(signedSendTransaction)
      expect(txHash).toBeDefined()
    })
  }
})
