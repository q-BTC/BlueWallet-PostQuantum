import { useTheme } from '../components/themes';
import { HDAezeedWallet } from './wallets/hd-aezeed-wallet';
import { HDLegacyBreadwalletWallet } from './wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDLegacyP2PKHWallet } from './wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { HDSegwitP2SHWallet } from './wallets/hd-segwit-p2sh-wallet';
import { LegacyWallet } from './wallets/legacy-wallet';
import { LightningCustodianWallet } from './wallets/lightning-custodian-wallet'; // Missing import
import { MultisigHDWallet } from './wallets/multisig-hd-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
import { SLIP39LegacyP2PKHWallet, SLIP39SegwitBech32Wallet, SLIP39SegwitP2SHWallet } from './wallets/slip39-wallets';
import { WatchOnlyWallet } from './wallets/watch-only-wallet';
import { TaprootWallet } from './wallets/taproot-wallet.ts';
import { QBTCWallet } from './wallets/qbtc-wallet';

export default class WalletGradient {
  static hdSegwitP2SHWallet: string[] = ['#007AFF', '#0040FF'];
  static hdSegwitBech32Wallet: string[] = ['#6CD9FC', '#44BEE5'];
  static segwitBech32Wallet: string[] = ['#6CD9FC', '#44BEE5'];
  static watchOnlyWallet: string[] = ['#474646', '#282828'];
  static legacyWallet: string[] = ['#37E8C0', '#15BE98'];
  static taprootWallet: string[] = ['#4DA337', '#326D28'];
  static hdLegacyP2PKHWallet: string[] = ['#FD7478', '#E73B40'];
  static hdLegacyBreadWallet: string[] = ['#fe6381', '#f99c42'];
  static multisigHdWallet: string[] = ['#1ce6eb', '#296fc5', '#3500A2'];
  static defaultGradients: string[] = ['#B770F6', '#9013FE'];
  static lightningCustodianWallet: string[] = ['#F1AA07', '#FD7E37']; // Corrected property with missing colors
  static aezeedWallet: string[] = ['#8584FF', '#5351FB'];
  static qbtcWallet: string[] = ['#000000', '#000000']; // qBTC uses the same purple gradient as default for now

  static createWallet = () => {
    const { colors } = useTheme();
    return colors.lightButton;
  };

  static gradientsFor(type: string): string[] {
    let gradient: string[];
    switch (type) {
      case WatchOnlyWallet.type:
        gradient = WalletGradient.watchOnlyWallet;
        break;
      case LegacyWallet.type:
        gradient = WalletGradient.legacyWallet;
        break;
      case TaprootWallet.type:
        gradient = WalletGradient.taprootWallet;
        break;
      case HDLegacyP2PKHWallet.type:
      case HDLegacyElectrumSeedP2PKHWallet.type:
      case SLIP39LegacyP2PKHWallet.type:
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
      case SLIP39SegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case HDSegwitBech32Wallet.type:
      case HDSegwitElectrumSeedP2WPKHWallet.type:
      case SLIP39SegwitBech32Wallet.type:
        gradient = WalletGradient.hdSegwitBech32Wallet;
        break;
      case SegwitBech32Wallet.type:
        gradient = WalletGradient.segwitBech32Wallet;
        break;
      case MultisigHDWallet.type:
        gradient = WalletGradient.multisigHdWallet;
        break;
      case HDAezeedWallet.type:
        gradient = WalletGradient.aezeedWallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      case QBTCWallet.type:
        gradient = WalletGradient.qbtcWallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient;
  }

  static linearGradientProps(type: string) {
    let props: any;
    switch (type) {
      case MultisigHDWallet.type:
        /* Example
        props = { start: { x: 0, y: 0 } };
        https://github.com/react-native-linear-gradient/react-native-linear-gradient
        */
        break;
      default:
        break;
    }
    return props;
  }

  static headerColorFor(type: string): string {
    let gradient: string[];
    switch (type) {
      case WatchOnlyWallet.type:
        gradient = WalletGradient.watchOnlyWallet;
        break;
      case LegacyWallet.type:
        gradient = WalletGradient.legacyWallet;
        break;
      case TaprootWallet.type:
        gradient = WalletGradient.taprootWallet;
        break;
      case HDLegacyP2PKHWallet.type:
      case HDLegacyElectrumSeedP2PKHWallet.type:
      case SLIP39LegacyP2PKHWallet.type:
        gradient = WalletGradient.hdLegacyP2PKHWallet;
        break;
      case HDLegacyBreadwalletWallet.type:
        gradient = WalletGradient.hdLegacyBreadWallet;
        break;
      case HDSegwitP2SHWallet.type:
      case SLIP39SegwitP2SHWallet.type:
        gradient = WalletGradient.hdSegwitP2SHWallet;
        break;
      case HDSegwitBech32Wallet.type:
      case HDSegwitElectrumSeedP2WPKHWallet.type:
      case SLIP39SegwitBech32Wallet.type:
        gradient = WalletGradient.hdSegwitBech32Wallet;
        break;
      case SegwitBech32Wallet.type:
        gradient = WalletGradient.segwitBech32Wallet;
        break;
      case MultisigHDWallet.type:
        gradient = WalletGradient.multisigHdWallet;
        break;
      case HDAezeedWallet.type:
        gradient = WalletGradient.aezeedWallet;
        break;
      case LightningCustodianWallet.type:
        gradient = WalletGradient.lightningCustodianWallet;
        break;
      case QBTCWallet.type:
        gradient = WalletGradient.qbtcWallet;
        break;
      default:
        gradient = WalletGradient.defaultGradients;
        break;
    }
    return gradient[0];
  }
}
