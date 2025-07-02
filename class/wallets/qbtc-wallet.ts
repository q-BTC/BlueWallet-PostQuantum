import createHash from 'create-hash';
import { sha3_256 } from 'js-sha3';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa';
import { AbstractWallet } from './abstract-wallet';
import { Transaction, Utxo } from './types';
import base58 from 'bs58';
import BigNumber from 'bignumber.js';
import axios from 'axios';
import { randomBytes } from '../rng';
import { BitcoinUnit } from '../../models/bitcoinUnits';

// qBTC constants
const QBTC_VERSION = 0x00;
const QBTC_ADDRESS_PREFIX = 'bqs';
const CHECKSUM_LEN = 4;
const PQ_ALG = 'ML-DSA-87';
const CHAIN_ID = 1; // Default qBTC chain ID

interface QBTCTransaction {
  type: 'transaction';
  chainID?: string;
  inputs: QBTCInput[];
  outputs: QBTCOutput[];
  body: {
    msg_str: string;
    pubkey: string;
    signature: string;
  };
  timestamp: number;
  txid?: string;
}

interface QBTCInput {
  txid: string;
  utxo_index: number;
  sender: string;
  receiver: string;
  amount: string;
  spent: boolean;
}

interface QBTCOutput {
  utxo_index: number;
  sender: string;
  receiver: string;
  amount: string;
  spent: boolean;
}

interface QBTCUtxo {
  txid: string;
  utxo_index: number;
  sender: string;
  receiver: string;
  amount: string;
  spent: boolean;
}

export class QBTCWallet extends AbstractWallet {
  static readonly type = 'qbtc';
  static readonly typeReadable = 'qBTC Quantum-Safe';
  // @ts-ignore: override
  public readonly type = QBTCWallet.type;
  // @ts-ignore: override
  public readonly typeReadable = QBTCWallet.typeReadable;

  // Store keys as Uint8Array
  private _privateKey: Uint8Array | null = null;
  private _publicKey: Uint8Array | null = null;
  private _qbtcNodeUrl: string = 'https://api.bitcoinqs.org:8080'; // Default qBTC node
  private _chainId: number = CHAIN_ID;
  private _txs: QBTCTransaction[] = [];
  private _nodeAvailable: boolean = false;
  
  // HD wallet compatibility properties (not used by qBTC but needed for TypeScript)
  _txs_by_external_index: Transaction[] = [];
  _txs_by_internal_index: Transaction[] = [];
  
  constructor() {
    super();
    this.chain = 'QBTC' as any; // qBTC chain identifier
    this.preferredBalanceUnit = BitcoinUnit.QBTC; // Set qBTC as the preferred unit
    // Ensure node URL is always HTTPS
    this._ensureHttps();
  }

  /**
   * Ensure the node URL uses HTTPS
   */
  private _ensureHttps(): void {
    if (this._qbtcNodeUrl.startsWith('http://')) {
      this._qbtcNodeUrl = this._qbtcNodeUrl.replace('http://', 'https://');
    }
  }

  /**
   * Override to identify this as a qBTC wallet
   */
  getChain(): string {
    return 'QBTC';
  }

  /**
   * Override to use qBTC as the preferred balance unit
   */
  getPreferredBalanceUnit(): BitcoinUnit {
    return BitcoinUnit.QBTC;
  }

  /**
   * Check if this wallet uses Bitcoin infrastructure
   */
  usesBitcoinInfrastructure(): boolean {
    return false;
  }

  /**
   * Override address validation for qBTC
   */
  isAddressValid(address: string): boolean {
    // qBTC addresses start with 'bqs' prefix
    return address.startsWith('bqs') && address.length > 10;
  }

  /**
   * Set the qBTC node URL - always force HTTPS
   */
  setNodeUrl(url: string): void {
    // Force HTTPS regardless of input
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }
    // If no protocol, add https://
    if (!url.startsWith('https://')) {
      url = 'https://' + url;
    }
    this._qbtcNodeUrl = url;
  }

  /**
   * Set the chain ID
   */
  setChainId(chainId: number): void {
    this._chainId = chainId;
  }

  /**
   * Derives qBTC address from public key using SHA3-256
   * Matches qBTC-core's derive_qsafe_address function
   */
  private deriveAddress(publicKey: Uint8Array): string {
    // SHA3-256 hash of the public key
    const sha3HashHex = sha3_256(publicKey);
    const sha3Hash = Buffer.from(sha3HashHex, 'hex');
    
    // Version prefix (0x00) + first 20 bytes of hash
    const versionedHash = Buffer.concat([Buffer.from([QBTC_VERSION]), sha3Hash.slice(0, 20)]);
    
    // Checksum: first 4 bytes of SHA3-256(versionedHash)
    const checksumHex = sha3_256(versionedHash);
    const checksum = Buffer.from(checksumHex, 'hex').slice(0, CHECKSUM_LEN);
    
    // Concatenate versionedHash + checksum
    const addressBytes = Buffer.concat([versionedHash, checksum]);
    
    // Base58 encode and prefix with "bqs"
    return QBTC_ADDRESS_PREFIX + base58.encode(addressBytes);
  }

  /**
   * Convert Uint8Array to hex string
   */
  private toHex(bytes: Uint8Array): string {
    if (!bytes || !(bytes instanceof Uint8Array)) {
      throw new Error('toHex: Invalid input - expected Uint8Array');
    }
    return Buffer.from(bytes).toString('hex');
  }

  /**
   * Convert hex string to Uint8Array
   */
  private fromHex(hex: string): Uint8Array {
    return new Uint8Array(Buffer.from(hex, 'hex'));
  }

  /**
   * Calculate SHA256d hash (double SHA256)
   */
  private sha256d(data: Buffer): Buffer {
    const hash1 = createHash('sha256').update(data).digest();
    return createHash('sha256').update(hash1).digest();
  }

  /**
   * Serialize transaction to qBTC format
   * Matches qBTC-core's serialize_transaction function
   */
  private serializeTransaction(tx: QBTCTransaction): string {
    // Create a clean copy without txid field for consistent serialization
    const txClean = { ...tx };
    if ('txid' in txClean) {
      delete txClean.txid;
    }
    
    // Remove txid from outputs if present
    if (txClean.outputs) {
      txClean.outputs = txClean.outputs.map((output) => {
        const { ...cleanOutput } = output;
        return cleanOutput;
      });
    }
    
    const txData = JSON.stringify(txClean, Object.keys(txClean).sort());
    return Buffer.from(txData).toString('hex');
  }

  /**
   * Calculate transaction ID
   * Matches qBTC-core's txid calculation
   */
  private calculateTxid(tx: QBTCTransaction): string {
    const serialized = this.serializeTransaction(tx);
    const hash = this.sha256d(Buffer.from(serialized, 'hex'));
    // Reverse bytes for txid (little-endian)
    return hash.reverse().toString('hex');
  }

  /**
   * Generate a new qBTC wallet using ML-DSA-87
   */
  async generate(): Promise<void> {
    try {
      console.log('qBTC generate: Starting...');
      
      // Generate ML-DSA-87 keypair with random seed
      console.log('qBTC generate: Generating random seed...');
      const seedBuffer = await randomBytes(32);
      const seed = new Uint8Array(seedBuffer.buffer, seedBuffer.byteOffset, seedBuffer.length);
      console.log('qBTC generate: Seed generated, length:', seed.length);
      
      console.log('qBTC generate: Generating ML-DSA-87 keypair...');
      const { publicKey, secretKey } = ml_dsa87.keygen(seed);
      console.log('qBTC generate: Keypair generated, publicKey length:', publicKey.length, 'secretKey length:', secretKey.length);
      
      this._privateKey = secretKey;
      this._publicKey = publicKey;
      console.log('qBTC generate: Keys stored in instance');
      
      // Store both private and public keys as hex in secret field (separated by colon)
      // This is necessary because ML-DSA doesn't allow deriving public key from private key
      this.secret = this.toHex(secretKey) + ':' + this.toHex(publicKey);
      console.log('qBTC generate: Secret hex stored');
      
      // Derive address
      console.log('qBTC generate: Deriving address...');
      this._address = this.deriveAddress(publicKey);
      console.log('qBTC generate: Address derived:', this._address);
      
      console.log('qBTC generate: Complete!');
    } catch (error) {
      console.error('Error generating qBTC wallet:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
        throw new Error(`Failed to generate qBTC wallet: ${error.message}`);
      } else {
        throw new Error('Failed to generate qBTC wallet: Unknown error');
      }
    }
  }

  /**
   * Import wallet from both private and public keys
   */
  importKeys(privateKeyHex: string, publicKeyHex: string): void {
    this._privateKey = this.fromHex(privateKeyHex);
    this._publicKey = this.fromHex(publicKeyHex);
    // Store both keys in secret field
    this.secret = privateKeyHex + ':' + publicKeyHex;
    this._address = this.deriveAddress(this._publicKey);
  }

  getAddress(): string | false {
    return this._address || false;
  }

  getAllExternalAddresses(): string[] {
    return this._address ? [this._address] : [];
  }

  getPublicKey(): string {
    return this._publicKey ? this.toHex(this._publicKey) : '';
  }

  getPrivateKey(): string {
    return this._privateKey ? this.toHex(this._privateKey) : '';
  }

  /**
   * Sign a message using ML-DSA-87
   * Matches qBTC-core's sign_transaction function
   */
  signMessage(message: string): string {
    if (!this._privateKey) {
      throw new Error('No private key available');
    }

    try {
      // Convert message to bytes
      const messageBytes = new TextEncoder().encode(message);
      
      // Sign using ML-DSA-87
      const signature = ml_dsa87.sign(this._privateKey, messageBytes);
      
      // Return hex-encoded signature
      return this.toHex(signature);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw new Error('Failed to sign transaction');
    }
  }

  /**
   * Verify a signature using ML-DSA-87
   * Matches qBTC-core's verify_transaction function
   */
  verifySignature(message: string, signatureHex: string, publicKeyHex: string): boolean {
    try {
      const messageBytes = new TextEncoder().encode(message);
      const signature = this.fromHex(signatureHex);
      const publicKey = this.fromHex(publicKeyHex);
      
      return ml_dsa87.verify(publicKey, messageBytes, signature);
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }

  /**
   * Verify a message signature for the sign/verify screen
   * For qBTC, we need to derive the public key from the address
   */
  verifyMessage(message: string, address: string, signature: string): boolean {
    try {
      // For qBTC, we can only verify if this is our own address
      if (address !== this._address) {
        throw new Error('Can only verify signatures for this wallet\'s address');
      }
      
      if (!this._publicKey || !(this._publicKey instanceof Uint8Array) || this._publicKey.length === 0) {
        console.error('QBTCWallet: Public key not properly initialized', {
          publicKey: this._publicKey,
          type: typeof this._publicKey,
          isUint8Array: this._publicKey instanceof Uint8Array
        });
        throw new Error('No public key available - wallet may not be properly initialized');
      }
      
      // Use our internal verifySignature method
      return this.verifySignature(message, signature, this.toHex(this._publicKey));
    } catch (error) {
      console.error('Failed to verify message:', error);
      return false;
    }
  }

  /**
   * Fetch UTXOs from qBTC node
   */
  private async fetchUtxos(): Promise<QBTCUtxo[]> {
    if (!this._address) return [];

    try {
      // Force HTTPS
      const nodeUrl = this._qbtcNodeUrl.replace('http://', 'https://');
      const url = `${nodeUrl}/utxos/${this._address}`;
      console.log('qBTC: Fetching UTXOs from:', url);
      const response = await axios.get(url);
      console.log('qBTC: UTXOs response:', response.data);
      return response.data.utxos || [];
    } catch (error: any) {
      console.error('qBTC: Error fetching UTXOs:', error.message);
      if (error.response?.status === 404) {
        console.log('qBTC: UTXOs endpoint not found, returning empty array');
      }
      return [];
    }
  }

  /**
   * Create a qBTC transaction
   * Based on qBTC's simpler account-based model without UTXOs
   */
  createTransaction(
    utxos: any[], // Not used for qBTC
    targets: Array<{ address: string; value?: number }>,
    feeRate: number,
    changeAddress: string,
    sequence: number, // Not used for qBTC
    skipSigning = false,
    masterFingerprint: number // Not used for qBTC
  ): any {
    if (!this._publicKey || !this._address) {
      throw new Error('Wallet not initialized');
    }

    // For qBTC, we only support single recipient transactions
    if (targets.length !== 1) {
      throw new Error('qBTC only supports single recipient transactions');
    }

    const target = targets[0];
    if (target.value === undefined) {
      throw new Error('Target value is required for qBTC transactions');
    }
    const amount = new BigNumber(target.value).dividedBy(1e8).toFixed(8); // Convert from satoshis to qBTC
    
    // Create message for signing based on qBTC format
    // Format: sender:receiver:amount:timestamp:chainId
    const timestamp = Date.now();
    const msgParts = [
      this._address,
      target.address,
      amount,
      timestamp.toString(),
      this._chainId.toString()
    ];
    const messageStr = msgParts.join(':');

    // Create simplified transaction for qBTC
    const tx: QBTCTransaction = {
      type: 'transaction',
      chainID: this._chainId.toString(),
      inputs: [], // qBTC doesn't use inputs
      outputs: [], // qBTC doesn't use outputs
      body: {
        msg_str: messageStr,
        pubkey: this.toHex(this._publicKey),
        signature: ''
      },
      timestamp: timestamp
    };

    // Sign the message
    if (!skipSigning) {
      tx.body.signature = this.signMessage(messageStr);
    }

    // Calculate txid
    tx.txid = this.calculateTxid(tx);

    // Return in the format expected by BlueWallet
    // For qBTC, we need to create a transaction-like object with getId() and toHex() methods
    const txHex = JSON.stringify(tx);
    
    // Create a wrapper object that mimics Bitcoin transaction interface
    const txWrapper = {
      getId: () => tx.txid || '',
      toHex: () => txHex,
      _qbtcTransaction: tx // Store the actual qBTC transaction for later use
    };
    
    return {
      tx: txWrapper,
      outputs: [{
        address: target.address,
        value: target.value
      }],
      fee: 0, // qBTC doesn't have explicit fees
      psbt: null, // qBTC doesn't use PSBT
      inputs: []
    };
  }

  /**
   * Broadcast transaction to qBTC network
   */
  async broadcastTx(transaction: QBTCTransaction | string): Promise<string | false> {
    try {
      // If transaction is already serialized, parse it
      const tx = typeof transaction === 'string' ? JSON.parse(transaction) : transaction;
      
      // Prepare the broadcast_tx request
      const messageBytes = Buffer.from(tx.body.msg_str);
      const signatureBytes = Buffer.from(tx.body.signature, 'hex');
      const pubkeyBytes = Buffer.from(tx.body.pubkey, 'hex');

      const payload = {
        request_type: 'broadcast_tx',
        message: messageBytes.toString('base64'),
        signature: signatureBytes.toString('base64'),
        pubkey: pubkeyBytes.toString('base64')
      };

      // Send to qBTC node /worker endpoint - Force HTTPS
      const nodeUrl = this._qbtcNodeUrl.replace('http://', 'https://');
      const response = await axios.post(`${nodeUrl}/worker`, payload);

      if (response.data.status === 'success' && response.data.txid) {
        return response.data.txid;
      } else {
        console.error('Broadcast failed:', response.data);
        return false;
      }
    } catch (error) {
      console.error('Error broadcasting transaction:', error);
      return false;
    }
  }

  /**
   * Fetch transactions from qBTC node
   * IMPORTANT: This method should NEVER call BlueElectrum for qBTC wallets
   */
  async fetchTransactions(): Promise<void> {
    if (!this._address) return;

    // Double-check wallet type to prevent Bitcoin calls
    if (this.type !== 'qbtc') {
      console.error('fetchTransactions called on qBTC wallet with wrong type:', this.type);
      return;
    }

    try {
      // Force HTTPS
      const nodeUrl = this._qbtcNodeUrl.replace('http://', 'https://');
      const url = `${nodeUrl}/transactions/${this._address}`;
      console.log('qBTC: Fetching transactions from:', url);
      const response = await axios.get(url);
      console.log('qBTC: Transactions response:', response.data);
      const txs = response.data.transactions || [];
      
      // Convert qBTC transactions to BlueWallet format
      this._txs = txs.map((tx: any) => {
        // Determine if this is incoming or outgoing based on direction
        const isIncoming = tx.direction === 'received';
        // The API already returns negative amounts for sent transactions
        const amount = new BigNumber(tx.amount).multipliedBy(1e8).toNumber(); // Convert to satoshis
        const absAmount = Math.abs(amount); // Get absolute value for inputs/outputs
        
        console.log('qBTC: Processing transaction:', {
          txid: tx.txid,
          direction: tx.direction,
          originalAmount: tx.amount,
          satoshiAmount: amount,
          isIncoming
        });
        
        return {
          txid: tx.txid,
          confirmations: tx.confirmations || 1, // Default to 1 if not provided
          value: amount, // Use the amount as-is (already negative for sent)
          fee: 0, // qBTC response doesn't include fee
          time: Math.floor(tx.timestamp / 1000), // Convert ms to seconds
          received: new Date(tx.timestamp).toISOString(), // Set for both incoming and outgoing
          hash: tx.txid, // Add hash field which is used by TransactionListItem
          inputs: isIncoming ? [{
            addresses: [tx.counterpart],
            value: absAmount
          }] : [{
            addresses: [this._address],
            value: absAmount
          }],
          outputs: isIncoming ? [{
            addresses: [this._address],
            value: absAmount,
            n: 0,
            scriptPubKey: {
              addresses: [this._address]
            }
          }] : [{
            addresses: [tx.counterpart],
            value: absAmount,
            n: 0,
            scriptPubKey: {
              addresses: [tx.counterpart]
            }
          }]
        };
      });
      
      this._lastTxFetch = Date.now();
    } catch (error: any) {
      console.error('qBTC: Error fetching transactions:', error.message);
      console.error('qBTC: Error details:', error.response?.data || error);
      this._txs = [];
      this._lastTxFetch = Date.now();
      // Don't throw error - just set empty transactions list
    }
  }



  getUtxo(): Utxo[] {
    return this._utxo;
  }

  /**
   * Simple function which says that we haven't tried to fetch balance
   * for a long time
   * @return {boolean}
   */
  timeToRefreshBalance(): boolean {
    if (+new Date() - this._lastBalanceFetch >= 5 * 60 * 1000) {
      return true;
    }
    return false;
  }

  /**
   * Simple function which says that we haven't tried to fetch transactions
   * for a long time
   * @return {boolean}
   */
  timeToRefreshTransaction(): boolean {
    if (+new Date() - this._lastTxFetch >= 5 * 60 * 1000) {
      return true;
    }
    return false;
  }

  // Required abstract methods
  getTransactions(): Transaction[] {
    return (this._txs || []) as any as Transaction[];
  }

  async allowOnchainAddress(): Promise<boolean> {
    return true;
  }

  allowSend(): boolean {
    return true;
  }

  allowReceive(): boolean {
    return true;
  }

  weOwnAddress(address: string): boolean {
    return address === this._address;
  }

  weOwnTransaction(txid: string): boolean {
    const txs = this.getTransactions();
    return txs.some(tx => tx.txid === txid);
  }

  isInvoiceGeneratedByWallet(invoice: string): boolean {
    return false; // qBTC doesn't use invoices
  }

  allowSignVerifyMessage(): boolean {
    return true;
  }

  /**
   * Override to prevent Bitcoin Electrum calls
   * IMPORTANT: This method should NEVER call BlueElectrum for qBTC wallets
   */
  async fetchBalance(): Promise<void> {
    if (!this._address) return;

    // Double-check wallet type to prevent Bitcoin calls
    if (this.type !== 'qbtc') {
      console.error('fetchBalance called on qBTC wallet with wrong type:', this.type);
      return;
    }

    try {
      // Force HTTPS
      const nodeUrl = this._qbtcNodeUrl.replace('http://', 'https://');
      const url = `${nodeUrl}/balance/${this._address}`;
      console.log('qBTC: Fetching balance from:', url);
      const response = await axios.get(url);
      console.log('qBTC: Balance response:', response.data);
      const balanceStr = response.data.balance || '0';
      
      // Convert to satoshis (qBTC uses 8 decimal places like Bitcoin)
      this.balance = new BigNumber(balanceStr).multipliedBy(1e8).toNumber();
      this.unconfirmed_balance = 0; // qBTC doesn't have unconfirmed balance concept
      this._nodeAvailable = true;
      
      this._lastBalanceFetch = Date.now();
    } catch (error: any) {
      console.error('qBTC: Error fetching balance:', error.message);
      console.error('qBTC: Error details:', error.response?.data || error);
      this.balance = 0;
      this.unconfirmed_balance = 0;
      this._nodeAvailable = false;
      this._lastBalanceFetch = Date.now();
    }
  }

  /**
   * Override to prevent Bitcoin Electrum calls
   */
  async wasEverUsed(): Promise<boolean> {
    // For qBTC, we consider a wallet "used" if it has any transactions
    try {
      await this.fetchTransactions();
      return this._txs.length > 0;
    } catch (error) {
      console.error('Error checking if qBTC wallet was used:', error);
      return false;
    }
  }

  /**
   * Override to skip Bitcoin UTXO fetching
   */
  async fetchUtxo(): Promise<void> {
    if (!this._address) return;
    
    try {
      const utxos = await this.fetchUtxos();
      
      // Convert to BlueWallet UTXO format
      this._utxo = utxos.filter(u => !u.spent).map(u => ({
        txid: u.txid,
        vout: u.utxo_index,
        value: new BigNumber(u.amount).multipliedBy(1e8).toNumber(), // Convert to satoshis
        address: u.receiver,
        confirmations: 1, // qBTC doesn't track confirmations in the same way
        height: 0, // qBTC doesn't provide height information
      }));
    } catch (error) {
      console.error('Error fetching qBTC UTXOs:', error);
      this._utxo = [];
    }
  }

  getID(): string {
    // Use SHA256 of address as wallet ID (more reliable than public key)
    const addr = this.getAddress();
    if (!addr) return '';
    const hash = createHash('sha256').update(addr).digest();
    return hash.toString('hex');
  }

  /**
   * HD wallet compatibility method - qBTC doesn't use HD derivation
   */
  _getWIFbyAddress(address: string): string | false {
    if (address !== this._address || !this._privateKey) {
      return false;
    }
    // qBTC doesn't use WIF format, return private key hex instead
    return this.getPrivateKey();
  }

  /**
   * HD wallet compatibility method - qBTC doesn't have change addresses
   */
  addressIsChange(address: string): boolean {
    return false;
  }

  /**
   * Compatibility method for coin selection
   */
  coinselect(
    utxos: any[],
    targets: any[],
    feeRate: number,
    changeAddress: string,
  ): { inputs: any[]; outputs: any[]; fee: number } | false {
    // qBTC doesn't use UTXO model, so this is not applicable
    return false;
  }

  getSecret(): string {
    return this.secret;
  }

  setSecret(secret: string): this {
    this.secret = secret;
    if (secret && secret.length > 0) {
      try {
        // ML-DSA-87 doesn't allow deriving public key from private key alone
        // We need to store both keys in the secret separated by ':'
        const parts = secret.split(':');
        if (parts.length === 2) {
          this._privateKey = this.fromHex(parts[0]);
          this._publicKey = this.fromHex(parts[1]);
          this._address = this.deriveAddress(this._publicKey);
        } else {
          // Legacy format with just private key - this shouldn't happen for qBTC
          console.warn('QBTCWallet: Invalid secret format, expected privateKey:publicKey');
        }
      } catch (e) {
        console.warn('Failed to set secret for QBTCWallet:', e);
      }
    }
    return this;
  }

  /**
   * Export wallet data for backup
   */
  exportWallet(): object {
    return {
      type: this.type,
      publicKey: this.getPublicKey(),
      privateKey: this.getPrivateKey(), // Should be encrypted in production
      address: this.getAddress(),
      nodeUrl: this._qbtcNodeUrl,
      chainId: this._chainId
    };
  }

  /**
   * Import wallet from export data
   */
  static fromExport(data: any): QBTCWallet {
    const wallet = new QBTCWallet();
    
    if (data.privateKey && data.publicKey) {
      wallet.importKeys(data.privateKey, data.publicKey);
    }
    
    if (data.nodeUrl) {
      wallet.setNodeUrl(data.nodeUrl);
    }
    
    if (data.chainId) {
      wallet.setChainId(data.chainId);
    }
    
    return wallet;
  }

  /**
   * Override fromJson to properly restore QBTCWallet
   */
  static fromJson(obj: string): QBTCWallet {
    const wallet = AbstractWallet.fromJson.call(this, obj) as unknown as QBTCWallet;
    // Ensure keys are properly restored from secret
    if (wallet.secret) {
      wallet.setSecret(wallet.secret);
    }
    // Force HTTPS for node URL
    wallet._ensureHttps();
    return wallet;
  }
}