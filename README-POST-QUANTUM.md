# BlueWallet Post-Quantum (qBTC) Integration

This document describes the post-quantum cryptocurrency support added to BlueWallet, specifically for qBTC (Quantum Bitcoin).

## Overview

BlueWallet has been extended to support qBTC, a post-quantum secure cryptocurrency that uses ML-DSA-87 (CRYSTALS-Dilithium) signatures instead of traditional ECDSA. This integration allows users to create and manage quantum-resistant wallets alongside traditional Bitcoin wallets.

## Key Features

### 🔐 Quantum-Safe Cryptography
- **ML-DSA-87 (CRYSTALS-Dilithium)**: NIST-approved post-quantum digital signature algorithm
- **Key Sizes**: ~4.6KB private keys, ~2.6KB public keys
- **Security Level**: NIST Level 5 (equivalent to AES-256)

### 📍 qBTC Address Format
- **Prefix**: `bqs` (Quantum Safe)
- **Derivation**: SHA3-256 hash of public key
- **Format**: `bqs` + Base58(version byte + hash[0:20] + checksum)
- **Example**: `bqs1GPSETB9KzBnaF5msTEP16dBQ2Xz9k4ut`

### 🔄 Transaction Support
- Create and sign transactions using ML-DSA-87
- Broadcast to qBTC network nodes
- Fetch balance and transaction history
- UTXO management

## Technical Implementation

### Dependencies

```json
{
  "@noble/post-quantum": "^0.2.2",  // ML-DSA cryptography
  "axios": "^1.7.0"                  // HTTP client for qBTC nodes
}
```

### Architecture

```
BlueWallet
├── class/wallets/
│   └── qbtc-wallet.ts          # qBTC wallet implementation
├── screen/wallets/
│   └── Add.tsx                 # Modified to include qBTC option
└── class/index.ts              # Exports qBTC wallet class
```

### Key Components

#### 1. qBTC Wallet Class (`qbtc-wallet.ts`)

The `QBTCWallet` class extends BlueWallet's `AbstractWallet` and implements:

- **Key Generation**: Uses `ml_dsa87.keygen()` for quantum-safe keypairs
- **Address Derivation**: SHA3-256 based with qBTC format
- **Transaction Signing**: ML-DSA-87 signatures
- **Network Communication**: HTTP/JSON-RPC to qBTC nodes

#### 2. Transaction Format

qBTC transactions use a JSON structure:

```typescript
{
  type: 'transaction',
  inputs: [{
    txid: string,
    utxo_index: number,
    sender: string,
    receiver: string,
    amount: string,
    spent: boolean
  }],
  outputs: [{
    utxo_index: number,
    sender: string,
    receiver: string,
    amount: string,
    spent: boolean
  }],
  body: {
    msg_str: "sender:receiver:amount:timestamp:chain_id",
    pubkey: string,    // hex-encoded public key
    signature: string  // hex-encoded ML-DSA-87 signature
  },
  timestamp: number
}
```

#### 3. Network Protocol

Communication with qBTC nodes:

- **Balance**: `GET /balance/{address}`
- **UTXOs**: `GET /utxos/{address}`
- **Transactions**: `GET /transactions/{address}`
- **Broadcast**: `POST /worker` with `broadcast_tx` request

## Usage Guide

### Creating a qBTC Wallet

1. Open BlueWallet
2. Tap "Add Wallet"
3. Select "qBTC" from wallet types
4. (Optional) Configure qBTC node URL
5. Create wallet
6. **Important**: Backup your keys immediately!

### Configuring qBTC Node

Default node URL: `http://localhost:8000`

To use a custom node:
1. When creating wallet, enter your node URL
2. For existing wallets, go to wallet settings

### Sending qBTC

1. Select your qBTC wallet
2. Tap "Send"
3. Enter recipient's qBTC address (bqs...)
4. Enter amount
5. Review and confirm transaction

### Receiving qBTC

1. Select your qBTC wallet
2. Tap "Receive"
3. Share your qBTC address

## Security Considerations

### Quantum Resistance

- **Current Bitcoin**: Vulnerable to quantum computers via Shor's algorithm
- **qBTC**: Resistant to known quantum attacks
- **Migration**: Users should consider moving funds before quantum computers become powerful enough

### Key Management

⚠️ **Warning**: qBTC private keys are much larger than Bitcoin keys:
- Bitcoin: 32 bytes
- qBTC: ~4,600 bytes

**Backup Recommendations**:
- Use encrypted storage
- Multiple secure backups
- Test recovery process

### Network Security

- Always verify node certificates when using HTTPS
- Consider running your own qBTC node
- Use trusted network connections

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/BlueWallet/BlueWallet.git
cd BlueWallet

# Install dependencies
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

### Testing qBTC Integration

```bash
# Run qBTC node locally
cd qBTC-core
docker-compose up

# Configure BlueWallet to use local node
# URL: http://localhost:8000
```

### Contributing

When contributing to qBTC integration:

1. Ensure all cryptographic operations use `@noble/post-quantum`
2. Maintain compatibility with existing Bitcoin wallets
3. Follow BlueWallet's coding standards
4. Add tests for new functionality

## Technical Specifications

### ML-DSA-87 Parameters

- **Security Level**: NIST Level 5
- **Private Key Size**: 4,864 bytes
- **Public Key Size**: 2,592 bytes  
- **Signature Size**: 4,595 bytes
- **Hash Function**: SHAKE-256

### Address Encoding

```
1. public_key_bytes = ML-DSA-87 public key
2. hash = SHA3-256(public_key_bytes)
3. versioned = 0x00 || hash[0:20]
4. checksum = SHA3-256(versioned)[0:4]
5. address_bytes = versioned || checksum
6. address = "bqs" || Base58(address_bytes)
```

### Transaction Signing

```
1. message = "sender:receiver:amount:timestamp:chain_id"
2. signature = ML-DSA-87.sign(private_key, UTF-8(message))
3. broadcast via /worker endpoint with base64 encoding
```

## FAQ

### Q: Why qBTC instead of regular Bitcoin?

A: qBTC is designed to be quantum-resistant. Once sufficiently powerful quantum computers exist, they could break Bitcoin's ECDSA signatures. qBTC uses ML-DSA-87, which is believed to be secure against quantum attacks.

### Q: Can I convert Bitcoin to qBTC?

A: Bitcoin can be converted to qBTC using the bridge service available at https://qb.tc/dashboard

### Q: Are qBTC transactions compatible with Bitcoin?

A: qBTC has been built to be a post quantum version of Bitcoin however, it does not inherit its transaction history and has its own.

### Q: How do I backup my qBTC wallet?

A: The backup process is the same as regular BlueWallet backups, but be aware that qBTC private keys are much larger. Ensure your backup medium has sufficient space.

### Q: What happens if I lose my private key?

A: Like Bitcoin, qBTC is non-custodial. If you lose your private key, your funds are permanently lost. Always maintain secure backups.

## Resources

- [qBTC Core Repository](https://github.com/q-btc/qBTC-core)
- [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
- [ML-DSA (CRYSTALS-Dilithium) Specification](https://pq-crystals.org/dilithium/)
- [@noble/post-quantum Library](https://github.com/paulmillr/noble-post-quantum)

## License

This integration maintains BlueWallet's MIT license. The post-quantum cryptographic implementations are provided by @noble/post-quantum under MIT license.
