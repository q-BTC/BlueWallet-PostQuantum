import createHash from 'create-hash';
import { sha3_256 } from 'js-sha3';
import { ml_dsa87 } from '@noble/post-quantum/ml-dsa';
import { AbstractWallet } from './abstract-wallet';
import { Transaction, Utxo } from './types';
import base58 from 'bs58';
import BigNumber from 'bignumber.js';
import axios from 'axios';
import { randomBytes } from '../rng';

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
  public readonly type = QBTCWallet.type;
  public readonly typeReadable = QBTCWallet.typeReadable;

  // Store keys as Uint8Array
  private _privateKey: Uint8Array | null = null;
  private _publicKey: Uint8Array | null = null;
  private _qbtcNodeUrl: string = 'http://localhost:8000'; // Default qBTC node
  private _chainId: number = CHAIN_ID;
  private _txs: QBTCTransaction[] = [];
  private _nodeAvailable: boolean = false;
  
  constructor() {
    super();
    this.chain = 'QBTC' as any; // qBTC chain identifier
  }

  /**
   * Override to identify this as a qBTC wallet
   */
  getChain(): string {
    return 'QBTC';
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
   * Set the qBTC node URL
   */
  setNodeUrl(url: string): void {
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
      
      // Store private key as hex in secret field
      this.secret = this.toHex(secretKey);
      console.log('qBTC generate: Secret hex stored');
      
      // Derive address
      console.log('qBTC generate: Deriving address...');
      this._address = this.deriveAddress(publicKey);
      console.log('qBTC generate: Address derived:', this._address);
      
      console.log('qBTC generate: Complete!');
    } catch (error) {
      console.error('Error generating qBTC wallet:', error);
      console.error('Error stack:', error.stack);
      throw new Error(`Failed to generate qBTC wallet: ${error.message}`);
    }
  }

  /**
   * Import wallet from both private and public keys
   */
  importKeys(privateKeyHex: string, publicKeyHex: string): void {
    this._privateKey = this.fromHex(privateKeyHex);
    this._publicKey = this.fromHex(publicKeyHex);
    this.secret = privateKeyHex;
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
   * Fetch UTXOs from qBTC node
   */
  private async fetchUtxos(): Promise<QBTCUtxo[]> {
    if (!this._address) return [];

    try {
      const response = await axios.get(`${this._qbtcNodeUrl}/utxos/${this._address}`);
      return response.data.utxos || [];
    } catch (error) {
      console.error('Error fetching UTXOs:', error);
      return [];
    }
  }

  /**
   * Create a qBTC transaction
   */
  async createTransaction(
    targets: Array<{ address: string; value: number }>, 
    feeRate: number, 
    changeAddress?: string
  ): Promise<QBTCTransaction> {
    if (!this._publicKey || !this._address) {
      throw new Error('Wallet not initialized');
    }

    // Fetch UTXOs
    const utxos = await this.fetchUtxos();
    if (utxos.length === 0) {
      throw new Error('No UTXOs available');
    }

    // Calculate total amount needed
    const totalNeeded = targets.reduce((sum, target) => sum.plus(target.value), new BigNumber(0));
    const minerFee = totalNeeded.multipliedBy(0.001).decimalPlaces(8); // 0.1% fee
    const totalRequired = totalNeeded.plus(minerFee);

    // Select inputs
    const inputs: QBTCInput[] = [];
    let totalAvailable = new BigNumber(0);

    for (const utxo of utxos) {
      if (!utxo.spent) {
        inputs.push({
          txid: utxo.txid,
          utxo_index: utxo.utxo_index,
          sender: utxo.sender,
          receiver: utxo.receiver,
          amount: utxo.amount,
          spent: false
        });
        totalAvailable = totalAvailable.plus(utxo.amount);
        
        if (totalAvailable.isGreaterThanOrEqualTo(totalRequired)) {
          break;
        }
      }
    }

    if (totalAvailable.isLessThan(totalRequired)) {
      throw new Error(`Insufficient funds: have ${totalAvailable}, need ${totalRequired}`);
    }

    // Create outputs
    const outputs: QBTCOutput[] = [];
    let outputIndex = 0;

    // Add target outputs
    for (const target of targets) {
      outputs.push({
        utxo_index: outputIndex++,
        sender: this._address,
        receiver: target.address,
        amount: new BigNumber(target.value).toFixed(8),
        spent: false
      });
    }

    // Add change output if needed
    const change = totalAvailable.minus(totalRequired);
    if (change.isGreaterThan(0)) {
      outputs.push({
        utxo_index: outputIndex++,
        sender: this._address,
        receiver: changeAddress || this._address,
        amount: change.toFixed(8),
        spent: false
      });
    }

    // Create message for signing
    const timestamp = Date.now();
    const msgParts = [
      this._address,
      targets[0].address, // Primary recipient
      targets[0].value.toString(),
      timestamp.toString(),
      this._chainId.toString()
    ];
    const messageStr = msgParts.join(':');

    // Create transaction
    const tx: QBTCTransaction = {
      type: 'transaction',
      inputs: inputs,
      outputs: outputs,
      body: {
        msg_str: messageStr,
        pubkey: this.toHex(this._publicKey),
        signature: ''
      },
      timestamp: timestamp
    };

    // Sign the message (not the full transaction)
    tx.body.signature = this.signMessage(messageStr);

    // Calculate txid
    tx.txid = this.calculateTxid(tx);

    return tx;
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

      // Send to qBTC node /worker endpoint
      const response = await axios.post(`${this._qbtcNodeUrl}/worker`, payload);

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
      const response = await axios.get(`${this._qbtcNodeUrl}/transactions/${this._address}`);
      const txs = response.data.transactions || [];
      
      // Convert qBTC transactions to BlueWallet format
      this._txs = txs.map((tx: any) => ({
        txid: tx.txid,
        confirmations: tx.confirmations || 0,
        value: parseInt(tx.amount),
        fee: parseInt(tx.fee || '0'),
        time: Math.floor(tx.timestamp / 1000), // Convert ms to seconds
        inputs: tx.inputs || [],
        outputs: tx.outputs || []
      }));
      
      this._lastTxFetch = Date.now();
    } catch (error) {
      console.warn('qBTC node not available, no transactions to fetch');
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
    return this._txs || [];
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
      const response = await axios.get(`${this._qbtcNodeUrl}/balance/${this._address}`);
      const balanceStr = response.data.balance || '0';
      
      // Convert to satoshis (qBTC uses 8 decimal places like Bitcoin)
      this.balance = new BigNumber(balanceStr).multipliedBy(1e8).toNumber();
      this.unconfirmed_balance = 0; // qBTC doesn't have unconfirmed balance concept
      this._nodeAvailable = true;
      
      this._lastBalanceFetch = Date.now();
    } catch (error) {
      console.warn('qBTC node not available, setting balance to 0');
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
      }));
    } catch (error) {
      console.error('Error fetching qBTC UTXOs:', error);
      this._utxo = [];
    }
  }

  getID(): string {
    // Use SHA256 of public key as wallet ID
    if (!this._publicKey) return '';
    const hash = createHash('sha256').update(this._publicKey).digest();
    return hash.toString('hex');
  }

  getSecret(): string {
    return this.secret;
  }

  setSecret(secret: string): void {
    this.secret = secret;
    this._privateKey = this.fromHex(secret);
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
}