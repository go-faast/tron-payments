// Many parts of this code are snippets from tronWeb:
// https://github.com/tronprotocol/tron-web/blob/master/src/index.js

const bitcore = require('bitcore-lib')
const keccak256 = require('js-sha3').keccak256
const JsSHA = require('jssha')
const encode58 = require('./base58').encode58
const HDPrivateKey = bitcore.HDPrivateKey
const HDPublicKey = bitcore.HDPublicKey
const ec = require('elliptic').ec('secp256k1')

function TronBip44 () {
  if (!(this instanceof TronBip44)) return new TronBip44()
  let self = this
  this.parts = [
    `44'`, // bip 44
    `195'`, // coin - from https://github.com/satoshilabs/slips/blob/master/slip-0044.md
    `0` // , // wallet
  // `0` // 0 - public, 1 = private
  // index
  ]
  return self
}

TronBip44.prototype.bip32PublicToTronPublic = function (pubKey) {
  const pubkey = ec.keyFromPublic(pubKey).getPublic()
  const x = pubkey.x
  const y = pubkey.y

  let xHex = x.toString('hex')

  while (xHex.length < 64) {
    xHex = `0${xHex}`
  }

  let yHex = y.toString('hex')

  while (yHex.length < 64) {
    yHex = `0${yHex}`
  }

  const pubkeyHex = `04${xHex}${yHex}`
  const pubkeyBytes = hexStr2byteArray(pubkeyHex)

  return (pubkeyBytes)
}

TronBip44.prototype.getAddress = function (xpub, index) {
  let self = this
  let key = new HDPublicKey(xpub)
  let path = this.parts.slice(key.depth)
  let derived = key.derive('m/' + (path.length > 0 ? path.join('/') + '/' : '') + index)
  let address = computeAddress(
    self.bip32PublicToTronPublic(
      derived.publicKey.toBuffer()
    )
  )
  address = getBase58CheckAddress(address)
  return address
}

TronBip44.prototype.bip32PrivateToTronPrivate = function (priKeyBytes) {
  const key = ec.keyFromPrivate(priKeyBytes, 'bytes')
  const privkey = key.getPrivate()
  let priKeyHex = privkey.toString('hex')
  while (priKeyHex.length < 64) {
    priKeyHex = `0${priKeyHex}`
  }
  let privArray = hexStr2byteArray(priKeyHex)
  return byteArray2hexStr(privArray)
}

TronBip44.prototype.getPrivateKey = function (xprv, index) {
  let self = this
  let key = new HDPrivateKey(xprv)
  let path = this.parts.slice(key.depth)
  let derived = key.derive('m/' + (path.length > 0 ? path.join('/') + '/' : '') + index)

  return self.bip32PrivateToTronPrivate(derived.privateKey.toBuffer())
}

// HELPER FUNCTIONS
// Borrowed from tronweb:  https://github.com/tronprotocol/tron-web/blob/master/src/utils/code.js
const ADDRESS_PREFIX = '41'
function byte2hexStr (byte) {
  const hexByteMap = '0123456789ABCDEF'

  let str = ''
  str += hexByteMap.charAt(byte >> 4)
  str += hexByteMap.charAt(byte & 0x0f)

  return str
}

function hexStr2byteArray (str) {
  const byteArray = Array()
  let d = 0
  let j = 0
  let k = 0

  for (let i = 0; i < str.length; i++) {
    const c = str.charAt(i)

    if (isHexChar(c)) {
      d <<= 4
      d += hexChar2byte(c)
      j++

      if (0 === (j % 2)) {
        byteArray[k++] = d
        d = 0
      }
    }
  }

  return byteArray
}

function isHexChar (c) {
  if ((c >= 'A' && c <= 'F') ||
    (c >= 'a' && c <= 'f') ||
    (c >= '0' && c <= '9')) {
    return 1
  }

  return 0
}

function hexChar2byte (c) {
  let d = 0

  if (c >= 'A' && c <= 'F')
    d = c.charCodeAt(0) - 'A'.charCodeAt(0) + 10
  else if (c >= 'a' && c <= 'f')
    d = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10
  else if (c >= '0' && c <= '9')
    d = c.charCodeAt(0) - '0'.charCodeAt(0)

  return d
}

function byteArray2hexStr (byteArray) {
  let str = ''

  for (let i = 0; i < (byteArray.length); i++) {
    str += byte2hexStr(byteArray[i])
  }
  return str
}

function computeAddress (pubBytes) {
  if (pubBytes.length === 65)
    pubBytes = pubBytes.slice(1)

  const hash = keccak256(pubBytes).toString()
  const addressHex = ADDRESS_PREFIX + hash.substring(24)

  return hexStr2byteArray(addressHex)
}

function getBase58CheckAddress (addressBytes) {
  const hash0 = SHA256(addressBytes)
  const hash1 = SHA256(hash0)
  let checkSum = hash1.slice(0, 4)
  checkSum = addressBytes.concat(checkSum)
  return encode58(checkSum)
}

function SHA256 (msgBytes) {
  const shaObj = new JsSHA('SHA-256', 'HEX')
  const msgHex = byteArray2hexStr(msgBytes)
  shaObj.update(msgHex)
  const hashHex = shaObj.getHash('HEX')
  return hexStr2byteArray(hashHex)
}

module.exports = TronBip44
