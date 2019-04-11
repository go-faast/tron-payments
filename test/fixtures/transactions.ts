/* tslint:disable: max-line-length variable-name */
import { TransactionInfo, SignedTransaction } from '#/types'

export const txInfo_209F8: TransactionInfo = {
  'id': '209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c',
  'to': 'TYehHt29ynSogYoxp9653hMFmxCV3gCZqg',
  'from': 'TBR4KDPrN9BrnyjienckS2xixcTpJ9aP26',
  'amount': '0.002323',
  'fee': '0.1',
  'executed': true,
  'confirmed': true,
  'block': 3748106,
  'raw': {
    'blockNumber': 3748106,
    'blockTimeStamp': 1541196198000,
    'contractResult': [
      ''
    ],
    'currentBlock': {
      'blockID': '00000000007e75b870f791dc72308ddf71b58237575bc2f13f5b68cba0f0c573',
      'block_header': {
        'raw_data': {
          'number': 8287672,
          'parentHash': '00000000007e75b7d5d3c97ca154ad94d629d66040847c8d9e6b0be241b4d0ce',
          'timestamp': 1555006905000,
          'txTrieRoot': 'b83ef9b7ac102ceb7b2dddae0b6622dbf7bebb397e9798f971de4c7b371b7347',
          'version': 7,
          'witness_address': '41c189fa6fc9ed7a3580c3fe291915d5c6a6259be7'
        },
        'witness_signature': '5cfc0d6839e5bf4246bb08f97e0294efc46130dc27052f1276235933a216af5a6b4950135765ac9f407364c7d860031ee9561103488b6fb0aa3cd83dd67da58d00'
      }
    },
    'fee': 100000,
    'id': '209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c',
    'raw_data': {
      'contract': [
        {
          'parameter': {
            'type_url': 'type.googleapis.com/protocol.TransferContract',
            'value': {
              'amount': 2323,
              'owner_address': '410fdbb073f86cea5c16eb05f1b2e174236c003b57',
              'to_address': '41f8ca9ae6502d787eab3a322f662ae52cae787f2f'
            }
          },
          'type': 'TransferContract'
        }
      ],
      'expiration': 1541196252000,
      'ref_block_bytes': '3108',
      'ref_block_hash': 'ae9604e3f4636913',
      'timestamp': 1541196195242
    },
    'raw_data_hex': '0a0231082208ae9604e3f463691340e086d2b3ed2c5a66080112620a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412310a15410fdbb073f86cea5c16eb05f1b2e174236c003b57121541f8ca9ae6502d787eab3a322f662ae52cae787f2f18931270aacbceb3ed2c',
    'receipt': {
      'net_fee': 100000
    },
    'ret': [
      {
        'contractRet': 'SUCCESS'
      }
    ],
    'signature': [
      'd6dbee070107073f756f7f44bb082a477c438d5aa54f685dc4a813c04bf26deed611ebb316fe6a8384cf02bcebd4e84b0333637add4bcaf7cc2a5071e999fb6000'
    ],
    'txID': '209f8dbefe6bbb9395f1be76dfb581b7bb53197d27cb28fbfe6c819b914c140c'
  }
}

export const signedTx_78f92: SignedTransaction = {
  'id': '78f92a762df4c71d6c05873789c81a347604c810a7eda2a29757f70511ba1608',
  'to': '41e3f138a75016a33a64ba2ec14afa2f5c44f30797',
  'from': '41e25f64b88120d29fc9e4da668a2b818cf0a64809',
  'amount': '0.3',
  'fee': '0.1',
  'raw': {
    'txID': '78f92a762df4c71d6c05873789c81a347604c810a7eda2a29757f70511ba1608',
    'raw_data': {
      'contract': [
        {
          'parameter': {
            'value': {
              'amount': 300000,
              'owner_address': '41e25f64b88120d29fc9e4da668a2b818cf0a64809',
              'to_address': '41e3f138a75016a33a64ba2ec14afa2f5c44f30797'
            },
            'type_url': 'type.googleapis.com/protocol.TransferContract'
          },
          'type': 'TransferContract'
        }
      ],
      'ref_block_bytes': '75fe',
      'ref_block_hash': '79d2a9f98ad1ad8a',
      'expiration': 1555007175000,
      'timestamp': 1555007116547
    },
    'raw_data_hex': '0a0275fe220879d2a9f98ad1ad8a40d8f299eda02d5a67080112630a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412320a1541e25f64b88120d29fc9e4da668a2b818cf0a64809121541e3f138a75016a33a64ba2ec14afa2f5c44f3079718e0a7127083aa96eda02d',
    'signature': [
      '04e28605fa5abe0c5a43d9768b7ceaff524ec3a9f719bdade2f3290f35da6ed95c729a6f4126619b388264c03736ba1918b454e71634f6cdc04438d299cb866301'
    ]
  }
}
