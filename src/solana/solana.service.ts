import { BadRequestException, ConflictException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import * as web3 from '@solana/web3.js';
import { Wallet } from './schemas/wallet.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';

@Injectable()
export class SolanaService {



  private readonly logger = new Logger(SolanaService.name);
  private connection: web3.Connection;

  private readonly ENCRYPTION_KEY: Buffer;
  private readonly IV_LENGTH = 16;


  constructor(
    @InjectModel(Wallet.name) private WalletModel: Model<Wallet>,
    @Optional() @Inject('ENCRYPTION_KEY') encryptionKey?: string
  ) {
    // Connect to devnet
    this.connection = new web3.Connection(
      web3.clusterApiUrl('devnet'),
      'confirmed'
    );
    this.ENCRYPTION_KEY = encryptionKey 
    ? Buffer.from(encryptionKey, 'hex') 
    : crypto.scryptSync('your-secret-salt', 'salt', 32);
  }
  // Robust Encryption Method
  private encryptPrivateKey(privateKey: Uint8Array): string {
    try {
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
      const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
      return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Private key encryption failed');
    }
  }

  // Robust Decryption Method
  private decryptPrivateKey(encryptedPrivateKey: string): Uint8Array {
    try {
      // Split IV and encrypted data
      const [ivHex, encryptedHex] = encryptedPrivateKey.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(encryptedHex, 'hex');
  
      // Check IV length
      if (iv.length !== this.IV_LENGTH) {
        throw new Error('Invalid IV length');
      }
  
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
  
      // Decrypt
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
  
      return new Uint8Array(decrypted);
    } catch (error) {
      this.logger.error('Decryption failed', error.message, error.stack);
      throw new Error(`Private key decryption failed: ${error.message}`);
    }
  }
  
  // Création d'un nouveau wallet
  async createCurrencyWallet(createWalletDto: createWalletDto, currency: string, amount: number): Promise<Wallet> {
  try {
    // Chercher un wallet existant pour l'utilisateur avec la même devise et type
    let existingWallet = await this.WalletModel.findOne({
      userId: createWalletDto.userId,
      currency: currency,
      type: 'GENERATED'
    });

    if (existingWallet) {
      // Si le wallet existe, mettre à jour le solde
      existingWallet.balance += amount;
      return await existingWallet.save();
    }

    // Si aucun wallet n'existe, créer un nouveau wallet
    const keypair = web3.Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKey = keypair.secretKey;

    // Créer le compte Solana
    await this.createSolanaAccount(keypair.publicKey, amount);

    const newWallet = new this.WalletModel({
      userId: createWalletDto.userId,
      publicKey: publicKey,
      type: 'GENERATED',
      network: 'devnet',
      currency: currency,
      balance: amount,
      privateKey: this.encryptPrivateKey(privateKey)
    });

    // Enregistrer le wallet dans la base de données
    const savedWallet = await newWallet.save();

    return savedWallet;
  } catch (error) {
    this.logger.error('Currency wallet creation/update error', error);
    throw new BadRequestException('Failed to create or update wallet');
  }
}

// Nouvelle méthode pour créer un compte Solana
async createSolanaAccount(publicKey: web3.PublicKey, amount: number): Promise<string> {
  try {
    // Demander un airdrop pour alimenter le nouveau compte
    const signature = await this.requestAirdrop(publicKey, amount);

    // Confirmer la transaction
    await this.connection.confirmTransaction(signature);

    this.logger.log(`Solana account created for public key ${publicKey.toBase58()}`);

    return signature;
  } catch (error) {
    this.logger.error('Solana account creation error', error);
    throw error;
  }
}

async convertCurrency(
  userId: string,
  amount: number,
  fromCurrency: string
): Promise<Wallet> {
  try {
    // Taux de change simulés vers SOL
    const exchangeRates = {
      'EUR': 150,  // 1 EUR = 150 SOL 
      'USD': 130,  // 1 USD = 130 SOL
      'GBP': 170   // 1 GBP = 170 SOL
    };

    // Vérification du taux de change
    if (!exchangeRates[fromCurrency]) {
      throw new BadRequestException('Devise non supportée');
    }

    // Calcul du montant converti en SOL
    const convertedAmount = amount * exchangeRates[fromCurrency];

    // Chercher ou créer un wallet SOL
    let wallet = await this.WalletModel.findOne({
      userId: userId,
      currency: 'SOL',
      type: 'GENERATED'
    });

    if (!wallet) {
      // Si aucun wallet SOL n'existe, créer un nouveau
      const keypair = web3.Keypair.generate();
      wallet = new this.WalletModel({
        userId: userId,
        publicKey: keypair.publicKey.toBase58(),
        type: 'GENERATED',
        network: 'devnet',
        currency: 'SOL',
        balance: convertedAmount,
        privateKey: this.encryptPrivateKey(keypair.secretKey)
      });
    } else {
      // Si un wallet SOL existe, mettre à jour le solde
      wallet.balance += convertedAmount;
    }

    // Mise à jour des détails de conversion
    wallet.currency = fromCurrency;
    wallet.originalAmount = (wallet.originalAmount || 0) + amount;
    wallet.convertedAmount = (wallet.convertedAmount || 0) + convertedAmount;

    // Enregistrer les modifications
    return await wallet.save();
  } catch (error) {
    this.logger.error('Erreur de conversion', error);
    throw error;
  }
}

/*async convertCurrency(
  userId: string, 
  amount: number, 
  fromCurrency: string,
  phantomPublicKey?: string
): Promise<Wallet> {
  try {
    // Taux de change simulés
    const exchangeRates = {
      'EUR': 150, // 1 EUR = 150 SOL 
      'USD': 130, // 1 USD = 130 SOL
      'GBP': 170  // 1 GBP = 170 SOL
    };

    // Vérification du taux de change
    if (!exchangeRates[fromCurrency]) {
      throw new BadRequestException('Devise non supportée');
    }

    // Calcul du montant converti
    const convertedAmount = amount * exchangeRates[fromCurrency];

    // Gestion du wallet
    let wallet;
    if (phantomPublicKey) {
      // Utiliser un wallet Phantom existant
      wallet = await this.linkPhantomWallet(userId, phantomPublicKey);
    } else {
      // Créer un nouveau wallet
      wallet = await this.createWallet({ userId });
    }

    // Mise à jour du wallet avec les détails de conversion
    wallet.currency = fromCurrency;
    wallet.originalAmount = amount;
    wallet.convertedAmount = convertedAmount;

    // Demande d'airdrop
    try {
      await this.requestAirdrop(
        new web3.PublicKey(wallet.publicKey), 
        convertedAmount
      );
    } catch (airdropError) {
      this.logger.warn('Airdrop partiel ou échoué', airdropError);
    }

    return await wallet.save();
  } catch (error) {
    this.logger.error('Erreur de conversion', error);
    throw error;
  }
}*/




  async requestAirdrop(publicKey: web3.PublicKey, amount: number): Promise<string> {
    try {
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * web3.LAMPORTS_PER_SOL
      );

      // Confirm the transaction
      await this.connection.confirmTransaction(signature);

      return signature;
    } catch (error) {
      this.logger.error('Airdrop request error', error);
      throw error;
    }
  }
  async getWalletBalance(publicKey: web3.PublicKey): Promise<number> {
    try {
      // Get balance directly from the Solana network
      const balanceInLamports = await this.connection.getBalance(publicKey);
      const balanceInSOL = balanceInLamports / web3.LAMPORTS_PER_SOL;
  
      this.logger.log(`Network Balance for ${publicKey.toBase58()}: ${balanceInSOL} SOL`);
  
      // Update the wallet's balance in the database
      const wallet = await this.WalletModel.findOne({ publicKey: publicKey.toBase58() });
      if (wallet) {
        wallet.balance = balanceInSOL;
        await wallet.save();
        this.logger.log(`Updated wallet balance in database to ${balanceInSOL} SOL`);
      }
  
      return balanceInSOL;
    } catch (error) {
      this.logger.error(`Failed to get balance for ${publicKey.toBase58()}`, error);
      throw error;
    }
  }

  // Récupérer tous les wallets d'un utilisateur
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.WalletModel.find({ userId });
  }
  async syncWalletBalances(fromPublicKey: string, toPublicKey: string) {
    try {
      const fromPublicKeyObj = new web3.PublicKey(fromPublicKey);
      const toPublicKeyObj = new web3.PublicKey(toPublicKey);
  
      const fromBalance = await this.getWalletBalance(fromPublicKeyObj);
      const toBalance = await this.getWalletBalance(toPublicKeyObj);
  
      this.logger.log(`Synced From Wallet Balance: ${fromBalance} SOL`);
      this.logger.log(`Synced To Wallet Balance: ${toBalance} SOL`);
    } catch (error) {
      this.logger.error('Failed to sync wallet balances', error);
    }
  }

  async sendTransaction(
    fromPublicKey: string,
    fromSecretKey: Uint8Array,
    toPublicKey: string,
    amount: number
  ): Promise<string> {
    try {
      const sender = new web3.PublicKey(fromPublicKey);
      const recipient = new web3.PublicKey(toPublicKey);
      
      const balance = await this.getWalletBalance(sender);
      this.logger.log(`Sender Wallet Balance: ${balance} SOL`);
      this.logger.log(`Transfer Amount: ${amount} SOL`);
  
      if (balance < amount) {
        throw new BadRequestException(`Insufficient funds. Current balance: ${balance} SOL, Requested transfer: ${amount} SOL`);
      }
  
      const senderKeypair = web3.Keypair.fromSecretKey(fromSecretKey);
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
  
      this.logger.log(`Current Blockhash: ${blockhash}`);
  
      const transaction = new web3.VersionedTransaction(
        new web3.TransactionMessage({
          payerKey: sender,
          recentBlockhash: blockhash,
          instructions: [
            web3.SystemProgram.transfer({
              fromPubkey: sender,
              toPubkey: recipient,
              lamports: Math.floor(amount * 1_000_000_000) // Corrected lamports calculation
            })
          ]
        }).compileToV0Message()
      );
  
      transaction.sign([senderKeypair]);
  
      const rawTransaction = transaction.serialize();
  
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
  
      this.logger.log(`Transaction Signature: ${signature}`);
  
      const confirmation = await this.connection.confirmTransaction({
        signature: signature,
        blockhash: blockhash,
        lastValidBlockHeight: (await this.connection.getBlockHeight()) + 150
      });
  
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
  
      return signature;
    } catch (error) {
      this.logger.error('Transaction Error:', {
        message: error.message,
        stack: error.stack,
        fromPublicKey: fromPublicKey,
        toPublicKey: toPublicKey,
        amount: amount
      });
  
      throw error;
    }
  }
  // Updated transfer method with more robust checks
  // Modify the transfer method to explicitly handle balance
  async transferBetweenWallets(
    userId: string,
    fromWalletPublicKey: string,
    toWalletPublicKey: string,
    amount: number
  ): Promise<string> {
    try {
      // Detailed logging at the start
      this.logger.log(`Starting transfer: User ${userId}, From ${fromWalletPublicKey}, To ${toWalletPublicKey}, Amount ${amount}`);
  
      const fromWallet = await this.WalletModel.findOne({
        userId: userId,
        publicKey: fromWalletPublicKey
      });
  
      if (!fromWallet) {
        throw new BadRequestException('Source wallet not found');
      }
  
      const fromPublicKeyObj = new web3.PublicKey(fromWalletPublicKey);
      
      // More robust network balance retrieval
      let networkBalance: number;
      try {
        networkBalance = await this.connection.getBalance(fromPublicKeyObj);
      } catch (networkError) {
        this.logger.error('Network balance retrieval failed', networkError);
        throw new BadRequestException('Unable to retrieve network balance');
      }
  
      const balanceInSOL = networkBalance / web3.LAMPORTS_PER_SOL;
      
      this.logger.log(`Network Balance: ${balanceInSOL} SOL`);
  
      // Stricter balance check
      if (balanceInSOL < amount) {
        throw new BadRequestException(
          `Insufficient funds. Current balance: ${balanceInSOL.toFixed(4)} SOL, Requested transfer: ${amount} SOL`
        );
      }
  
      const fromSecretKey = this.decryptPrivateKey(fromWallet.privateKey);
  
      // Additional validation for wallet keys
      try {
        new web3.PublicKey(fromWalletPublicKey);
        new web3.PublicKey(toWalletPublicKey);
      } catch (keyError) {
        this.logger.error('Invalid wallet public key', keyError);
        throw new BadRequestException('Invalid wallet public key format');
      }
  
      const signature = await this.sendTransaction(
        fromWalletPublicKey,
        fromSecretKey,
        toWalletPublicKey,
        amount
      );
  
      this.logger.log(`Transfer successful. Signature: ${signature}`);
  
      await this.syncWalletBalances(fromWalletPublicKey, toWalletPublicKey);
  
      return signature;
    } catch (error) {
      this.logger.error('Comprehensive wallet transfer error', {
        userId,
        fromWallet: fromWalletPublicKey,
        toWallet: toWalletPublicKey,
        amount,
        errorMessage: error.message,
        errorStack: error.stack
      });
  
      // More specific error handling
      if (error instanceof BadRequestException) {
        throw error;
      }
  
      throw new BadRequestException('Transaction failed due to an unexpected error');
    }
  }
  async syncWalletBalanceInDatabase(publicKey: string): Promise<number> {
    try {
      const publicKeyObj = new web3.PublicKey(publicKey);
      const networkBalance = await this.connection.getBalance(publicKeyObj);
      const balanceInSOL = networkBalance / web3.LAMPORTS_PER_SOL;
  
      const wallet = await this.WalletModel.findOne({ publicKey });
      if (wallet) {
        wallet.balance = balanceInSOL;
        await wallet.save();
        this.logger.log(`Synchronized wallet ${publicKey} balance to ${balanceInSOL} SOL`);
      }
  
      return balanceInSOL;
    } catch (error) {
      this.logger.error('Failed to sync wallet balance', error);
      throw error;
    }
  }
  create(createWalletDto: createWalletDto) {
    return 'This action adds a new solana';
  }

  findAll() {
    return `This action returns all solana`;
  }

  findOne(id: number) {
    return `This action returns a #${id} solana`;
  }

  update(id: number, updateSolanaDto: UpdateSolanaDto) {
    return `This action updates a #${id} solana`;
  }

  remove(id: number) {
    return `This action removes a #${id} solana`;
  }
}
function InjectRepository(Wallet: any): (target: typeof SolanaService, propertyKey: undefined, parameterIndex: 0) => void {
  throw new Error('Function not implemented.');
}

