import ExtPay from 'extpay';
import { EXTPAY_ID } from './lib/license';

// ExtensionPay needs a background presence to sync payment state.
const extpay = ExtPay(EXTPAY_ID);
extpay.startBackground();
