import { BadRequestException, ConflictException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import * as web3 from '@solana/web3.js';
import { Wallet } from './schemas/wallet.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import { getOrca } from '@orca-so/sdk';
import { ExchangeRateService } from 'src/exchange-rate/exchange-rate.service';
import { Transaction } from './schemas/transaction.schema';
import { User } from 'src/auth/schemas/user.schema';

@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private connection: web3.Connection;
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly IV_LENGTH = 16;
  private orca: ReturnType<typeof getOrca>;

  constructor(
    @InjectModel(Wallet.name) private WalletModel: Model<Wallet>,
    private readonly exchangeRateService: ExchangeRateService,
    @InjectModel(Transaction.name) private TransactionModel: Model<Transaction>,
    @InjectModel(User.name) private UserModel: Model<User>,
    @Optional() @Inject('ENCRYPTION_KEY') encryptionKey?: string
  ) {
    // Connect to devnet
    this.connection = new web3.Connection(
      web3.clusterApiUrl('devnet'),
      'confirmed'
    );
    // Verify getOrca is imported and used correctly
    this.orca = getOrca(this.connection);

    this.ENCRYPTION_KEY = encryptionKey
      ? Buffer.from(encryptionKey, 'hex')
      : crypto.scryptSync('your-secret-salt', 'salt', 32);
  }

  // Robust Encryption Method
  public encryptPrivateKey(privateKey: Uint8Array): string {
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
  public decryptPrivateKey(encryptedPrivateKey: string): Uint8Array {
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
  async getUsersWithWalletsAndTransactions(
    page: number = 1,
    limit: number = 10,
    userId?: string
  ): Promise<any> {
    try {
      const skip = (page - 1) * limit;
      let query = {};

      if (userId) {
        query = { _id: userId };
      }

      // Récupérer les utilisateurs
      const users = await this.UserModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .select('-password')
        .lean();

      // Récupérer les détails pour chaque utilisateur
      const usersWithDetails = await Promise.all(
        users.map(async (user) => {
          // Récupérer tous les wallets de l'utilisateur
          const wallets = await this.WalletModel
            .find({ userId: user._id })
            .lean();

          // Récupérer les transactions pour chaque wallet
          const walletsWithTransactions = await Promise.all(
            wallets.map(async (wallet) => {
              const transactions = await this.TransactionModel
                .find({
                  $or: [
                    { fromAddress: wallet.publicKey },
                    { toAddress: wallet.publicKey }
                  ]
                })
                .sort({ blockTime: -1 })
                .lean();

              return {
                ...wallet,
                transactions
              };
            })
          );

          return {
            user: {
              id: user._id,
              email: user.email,
              username: user.name,
            },
            wallets: walletsWithTransactions
          };
        })
      );

      // Compter le total des utilisateurs pour la pagination
      const total = await this.UserModel.countDocuments(query);

      return {
        success: true,
        data: {
          users: usersWithDetails,
          pagination: {
            current: page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };

    } catch (error) {
      this.logger.error('Error fetching users with wallets and transactions:', error);
      throw new BadRequestException(error.message);
    }
  }

  //créer wallet en TND
  async createTNDWallet(createWalletDto: createWalletDto, amount: number): Promise<Wallet> {
    try {
      const DEFAULT_CURRENCY = 'TND';

      // Vérifier si un wallet TND existe déjà pour cet utilisateur
      let existingWallet = await this.WalletModel.findOne({
        userId: createWalletDto.userId,
        currency: DEFAULT_CURRENCY,
        type: 'GENERATED'
      });

      if (existingWallet) {
        // Si le wallet existe, mettre à jour uniquement l'originalAmount
        existingWallet.originalAmount = (existingWallet.originalAmount || 0) + amount;
        return await existingWallet.save();
      }

      // Si aucun wallet n'existe, créer un nouveau wallet TND
      const newWallet = new this.WalletModel({
        userId: createWalletDto.userId,
        type: 'GENERATED',
        network: 'devnet',
        currency: DEFAULT_CURRENCY,
        originalAmount: amount,
        balance: 0,
        createdAt: new Date()
      });

      return await newWallet.save();

    } catch (error) {
      this.logger.error('TND wallet creation/update error', error);
      throw new BadRequestException('Failed to create or update TND wallet');
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
      // Fixed exchange rates
      const exchangeRates = {
        'EUR': 0.1, // 1 EUR = 0.001 SOL 
        'USD': 0.5, // 1 USD = 0.0005 SOL
        'GBP': 0.8  // 1 GBP = 0.0008 SOL
      };

      // Validate currency support
      if (!exchangeRates[fromCurrency]) {
        throw new BadRequestException('Devise non supportée');
      }
      // First, convert the amount to TND
      const amountInTND = await this.exchangeRateService.getConvertedAmountFromOtherCurrencyToTND(
        amount,
        fromCurrency
      );
      // Find TND wallet
      const tndWallet = await this.WalletModel.findOne({
        userId: userId,
        currency: 'TND',
        type: 'GENERATED'
      });

      // Check if TND wallet exists and has sufficient balance
      if (!tndWallet) {
        throw new BadRequestException('Wallet en Dinars non trouvé');
      }

      // Après la modification (correction)
      const currentBalance = Number(tndWallet.originalAmount || 0);
      const requiredAmount = Number(amountInTND);

      if (currentBalance < requiredAmount) {
        throw new BadRequestException(
          `Solde insuffisant en Dinars. Solde actuel: ${currentBalance} TND, Montant nécessaire: ${requiredAmount} TND`
        );
      }
      // Calculate converted amount
      const convertedAmount = amount * exchangeRates[fromCurrency];

      // Find existing wallet for the user and currency
      let wallet = await this.WalletModel.findOne({
        userId: userId,
        currency: fromCurrency,
        type: 'GENERATED'
      });

      if (wallet) {
        // Update existing wallet balance
        wallet.balance += convertedAmount;
        //update existing origianl amount 
        wallet.originalAmount += amount;
      } else {
        // Create new wallet if none exists
        const keypair = web3.Keypair.generate();
        wallet = new this.WalletModel({
          userId: userId,
          publicKey: keypair.publicKey.toBase58(),
          type: 'GENERATED',
          network: 'devnet',
          currency: fromCurrency,
          balance: convertedAmount,
          originalAmount: amount,
          privateKey: this.encryptPrivateKey(keypair.secretKey)
        });
      }

      // Update TND wallet balance
      tndWallet.originalAmount -= Number(amountInTND);
      await tndWallet.save();

      // Create Solana account and request airdrop
      try {
        await this.createSolanaAccount(
          new web3.PublicKey(wallet.publicKey),
          convertedAmount
        );
      } catch (airdropError) {
        this.logger.warn('Airdrop partiel ou échoué', airdropError);
      }

      // Save wallet and sync balance
      const savedWallet = await wallet.save();
      await this.syncWalletBalanceInDatabase(savedWallet.publicKey);

      return savedWallet;
    } catch (error) {
      this.logger.error('Erreur de conversion', error);
      throw error;
    }
  }

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
  async syncWalletTransactions(walletPublicKey: string, userId: string): Promise<any> {
    try {
      const publicKey = new web3.PublicKey(walletPublicKey);
      
      const wallet = await this.WalletModel.findOne({ 
        userId: userId,
        publicKey: walletPublicKey 
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const signatures = await this.connection.getSignaturesForAddress(
        publicKey,
        { limit: 100 }
      );

      const transactions = [];

      for (const signatureInfo of signatures) {
        try {
          const transaction = await this.connection.getTransaction(
            signatureInfo.signature,
            {
              maxSupportedTransactionVersion: 0
            }
          );

          if (transaction) {
            // Extraction sécurisée des adresses
            let fromAddress = '';
            let toAddress = '';

            try {
              // Obtenir les comptes de manière sûre
              const accounts = transaction.transaction.message.staticAccountKeys ||
                             transaction.transaction.message.getAccountKeys ||
                             [];

              fromAddress = accounts[0]?.toBase58() || '';
              toAddress = accounts[1]?.toBase58() || '';
            } catch (accountError) {
              this.logger.warn('Error extracting accounts from transaction', accountError);
            }

            const transactionData = {
              signature: signatureInfo.signature,
              walletPublicKey,
              userId,
              fromAddress,
              toAddress,
              amount: (transaction.meta.postBalances[0] - transaction.meta.preBalances[0]) / web3.LAMPORTS_PER_SOL,
              blockTime: transaction.blockTime,
              status: transaction.meta.err ? 'failed' : 'success',
              type: this.determineTransactionType(transaction),
              timestamp: new Date(transaction.blockTime * 1000), // Convertir en timestamp
              fee: transaction.meta.fee / web3.LAMPORTS_PER_SOL
            };

            transactions.push(transactionData);

            // Sauvegarder dans la base de données
            await this.TransactionModel.findOneAndUpdate(
              { signature: transactionData.signature },
              transactionData,
              { upsert: true, new: true }
            );
          }
        } catch (error) {
          this.logger.error(`Error processing transaction ${signatureInfo.signature}:`, error);
          continue;
        }
      }

      // Mettre à jour le solde du wallet
      const currentBalance = await this.connection.getBalance(publicKey);
      await this.WalletModel.findOneAndUpdate(
        { publicKey: walletPublicKey },
        { balance: currentBalance / web3.LAMPORTS_PER_SOL },
        { new: true }
      );

      return {
        success: true,
        message: `Synchronized ${transactions.length} transactions`,
        transactions,
        currentBalance: currentBalance / web3.LAMPORTS_PER_SOL
      };

    } catch (error) {
      this.logger.error('Error syncing wallet transactions:', error);
      throw new BadRequestException(error.message);
    }
  }
  private getTransactionAccounts(transaction: any): web3.PublicKey[] {
    try {
      if (transaction.transaction.message.getAccountKeys) {
        return transaction.transaction.message.getAccountKeys().keySegments().flat();
      } else if (transaction.transaction.compileMessage) {
        return transaction.transaction.compileMessage().getAccountKeys().keySegments().flat();
      } else {
        return [];
      }
    } catch (error) {
      this.logger.error('Error getting transaction accounts', error);
      return [];
    }
  }

   // Méthode pour récupérer l'historique des transactions
   async getWalletTransactions(
    userId: string,
    walletPublicKey: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<any> {
    try {
      // Vérifier si le wallet existe
      const wallet = await this.WalletModel.findOne({
        userId,
        publicKey: walletPublicKey
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const transactions = await this.TransactionModel.find({
        walletPublicKey,
        userId
      })
      .sort({ blockTime: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

      return {
        success: true,
        count: transactions.length,
        transactions
      };
    } catch (error) {
      this.logger.error('Error getting wallet transactions', error);
      throw new BadRequestException(error.message);
    }
  }

  private determineTransactionType(transaction: any): string {
    try {
      if (transaction.meta.err) {
        return 'failed';
      }
      
      const preBalance = transaction.meta.preBalances[0];
      const postBalance = transaction.meta.postBalances[0];
      
      if (postBalance > preBalance) {
        return 'receive';
      } else if (postBalance < preBalance) {
        return 'send';
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
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

      // Récupérer le solde directement de la blockchain
      const networkBalance = await this.connection.getBalance(publicKeyObj);
      const balanceInSOL = networkBalance / web3.LAMPORTS_PER_SOL;

      // Taux de conversion SOL vers original amount
      const exchangeRates = {
        'EUR': 10,   // 1 SOL = 10 EUR
        'USD': 12,   // 1 SOL = 12 USD
        'GBP': 8     // 1 SOL = 8 GBP
      };

      // Trouver et mettre à jour le wallet
      const wallet = await this.WalletModel.findOne({ publicKey });
      if (wallet) {
        // Mettre à jour avec le solde exact de la blockchain
        wallet.balance = balanceInSOL;

        // Convertir le solde SOL en original amount si un taux est disponible
        if (exchangeRates[wallet.currency]) {
          const convertedOriginalAmount = balanceInSOL * exchangeRates[wallet.currency];
          wallet.originalAmount = convertedOriginalAmount;
        }

        await wallet.save();

        this.logger.log(`Synchronisation blockchain réussie. Nouveau solde: ${balanceInSOL} SOL`);
      }

      return balanceInSOL;
    } catch (error) {
      this.logger.error('Échec de synchronisation blockchain', {
        publicKey,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  async getTransactionsByWallet(walletAddress: string) {
    const publicKey = new web3.PublicKey(walletAddress);

    const signatures = await this.connection.getSignaturesForAddress(publicKey, {
      limit: 50, // Récupérer les 50 dernières transactions
    });

    const transactions = await Promise.all(
      signatures.map(async (signature) => {
        const transaction = await this.connection.getTransaction(signature.signature, {
          maxSupportedTransactionVersion: 0
        });

        return {
          signature: signature.signature,
          blockTime: transaction.blockTime,
          amount: transaction.meta.postBalances[0], //LAMPORTS_PER_SOL,
          type: this.determineTransactionType(transaction)
        };
      })
    );

    return transactions;
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

