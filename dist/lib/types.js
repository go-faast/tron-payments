import * as t from 'io-ts';
import { extendCodec } from '@faast/ts-common';
import { BaseTransactionInfo, BaseUnsignedTransaction, BaseSignedTransaction, BaseBroadcastResult, CreateTransactionOptions, } from '@faast/payments-common';
export { CreateTransactionOptions };
export const BaseTronPaymentsConfig = t.partial({
    fullNode: t.string,
    solidityNode: t.string,
    eventServer: t.string,
}, 'BaseTronPaymentsConfig');
export const HdTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    hdKey: t.string,
}, {
    maxAddressScan: t.number,
}, 'HdTronPaymentsConfig');
export const KeyPairTronPaymentsConfig = extendCodec(BaseTronPaymentsConfig, {
    keyPairs: t.union([t.array(t.union([t.string, t.null, t.undefined])), t.record(t.number, t.string)]),
}, {}, 'KeyPairTronPaymentsConfig');
export const TronPaymentsConfig = t.union([HdTronPaymentsConfig, KeyPairTronPaymentsConfig]);
export const TronUnsignedTransaction = extendCodec(BaseUnsignedTransaction, {
    id: t.string,
    amount: t.string,
    fee: t.string,
}, {}, 'TronUnsignedTransaction');
export const TronSignedTransaction = extendCodec(BaseSignedTransaction, {}, {}, 'TronSignedTransaction');
export const TronTransactionInfo = extendCodec(BaseTransactionInfo, {}, {}, 'TronTransactionInfo');
export const TronBroadcastResult = extendCodec(BaseBroadcastResult, {
    rebroadcast: t.boolean,
}, {}, 'TronBroadcastResult');
export const GetAddressOptions = t.partial({
    cacheIndex: t.boolean,
});
//# sourceMappingURL=types.js.map