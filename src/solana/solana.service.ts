import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import * as web3 from '@solana/web3.js';
import { Wallet } from './schemas/wallet.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { getOrca } from '@orca-so/sdk';
import { ExchangeRateService } from 'src/exchange-rate/exchange-rate.service';
import { TransactionRecord  } from './schemas/transaction.schema';
import { User } from 'src/auth/schemas/user.schema';
import { Account } from 'src/accounts/entities/account.entity';

@Injectable()
export class SolanaService {

  private readonly logger = new Logger(SolanaService.name);
  private connection: web3.Connection;
  private readonly ENCRYPTION_KEY: Buffer = crypto.scryptSync('your-secret-salt', 'salt', 32); // Initialisation directe
  private readonly IV_LENGTH = 16;
  private orca: ReturnType<typeof getOrca>;

  constructor(
    @InjectModel(Wallet.name) private WalletModel: Model<Wallet>,
    @InjectModel(Account.name) private accountModel: Model<Account>,
    private readonly exchangeRateService: ExchangeRateService,
    @InjectModel(TransactionRecord .name) private TransactionModel: Model<TransactionRecord >,
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

  }

// Robust Encryption Method
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
  async createTNDWallet(createWalletDto: createWalletDto, amount: number, rib: string): Promise<Wallet> {
    this.logger.log(`Creating TND wallet for user ${createWalletDto.userId} with amount ${amount} from RIB ${rib}`);
    
    try {
      // Vérifier si le compte bancaire existe et a suffisamment de fonds
      const bankAccount = await this.accountModel.findOne({ 
        rib, 
        userId: new Types.ObjectId(createWalletDto.userId) 
      });
      
      if (!bankAccount) {
        this.logger.error(`Bank account not found - RIB: ${rib}`);
        throw new NotFoundException(`Bank account with RIB ${rib} not found or not linked to user`);
      }
  
      if (bankAccount.balance < amount) {
        throw new BadRequestException(`Insufficient funds in bank account. Available: ${bankAccount.balance} TND`);
      }
  
      this.logger.log(`Found bank account with balance: ${bankAccount.balance} TND`);
  
      try {
        // Mettre à jour le compte bancaire d'abord
        const updatedBankAccount = await this.accountModel.findOneAndUpdate(
          { _id: bankAccount._id },
          { $inc: { balance: -amount } },
          { new: true }
        );
  
        if (!updatedBankAccount) {
          throw new Error('Failed to update bank account balance');
        }
  
        // Vérifier si l'utilisateur a déjà un wallet TND
        const existingWallet = await this.WalletModel.findOne({
          userId: createWalletDto.userId,
          currency: 'TND'
        });
  
        if (existingWallet) {
          // Mettre à jour le wallet existant
          existingWallet.originalAmount = (existingWallet.originalAmount || 0) + amount;
          return await existingWallet.save();
        }
        const keypair = web3.Keypair.generate();
        const publicKey = keypair.publicKey.toBase58();
  
        // Créer un nouveau wallet TND
        const newWallet = new this.WalletModel({
          userId: createWalletDto.userId,
          publicKey:publicKey,
          currency: 'TND',
          balance: 0,
          originalAmount: amount,
        });
        // Créer une transaction pour tracer le transfert
        await this.TransactionModel.create({
          signature: `TND_TRANSFER_${Date.now()}`,
          walletPublicKey: newWallet.publicKey,
          userId: createWalletDto.userId,
          fromAddress: bankAccount.rib,
          toAddress: newWallet.publicKey,
          amount: amount,
          type: 'bank_to_wallet',
          status: 'success',
          blockTime: Date.now() / 1000,
          fee: 0,
          timestamp: new Date()
        });
  
        this.logger.log(`Successfully created/updated TND wallet and deducted amount from bank account`);
        
        return await newWallet.save();
  
      } catch (error) {
        // En cas d'erreur, tenter de restaurer le solde du compte bancaire
        await this.accountModel.findOneAndUpdate(
          { _id: bankAccount._id },
          { $inc: { balance: amount } }
        );
        
        this.logger.error('Error during wallet creation/update:', error);
        throw new Error('Failed to process TND wallet operation');
      }
  
    } catch (error) {
      this.logger.error('Error in createTNDWallet:', error);
      throw error;
    }
  }
  // Création d'un nouveau wallet
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
        'EUR': 0.001, // 1 EUR = 0.001 SOL 
        'USD': 0.0005, // 1 USD = 0.0005 SOL
        'GBP': 0.0008  // 1 GBP = 0.0008 SOL
      };
  
      // Validate currency support
      if (!exchangeRates[fromCurrency]) {
        throw new BadRequestException('Devise non supportée');
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
          privateKey: this.encryptPrivateKey(keypair.secretKey),
          originalAmount:amount
        });
      }
  
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
              lamports: Math.floor(amount * 1_000_000_000)
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

      // Synchroniser les balances immédiatement après la transaction
      await this.syncWalletBalances(fromPublicKey, toPublicKey);

      // Mettre à jour les balances dans la base de données
      await this.updateWalletsAfterTransaction(fromPublicKey, toPublicKey, amount);
  
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

  private async updateWalletsAfterTransaction(fromPublicKey: string, toPublicKey: string, amount: number) {
    try {
      // Récupérer les balances actuelles depuis la blockchain
      const fromPublicKeyObj = new web3.PublicKey(fromPublicKey);
      const toPublicKeyObj = new web3.PublicKey(toPublicKey);

      const [fromBalance, toBalance] = await Promise.all([
        this.connection.getBalance(fromPublicKeyObj),
        this.connection.getBalance(toPublicKeyObj)
      ]);

      // Convertir les balances en SOL
      const fromBalanceSOL = fromBalance / web3.LAMPORTS_PER_SOL;
      const toBalanceSOL = toBalance / web3.LAMPORTS_PER_SOL;

      // Mettre à jour les wallets dans la base de données
      await Promise.all([
        this.WalletModel.findOneAndUpdate(
          { publicKey: fromPublicKey },
          { balance: fromBalanceSOL },
          { new: true }
        ),
        this.WalletModel.findOneAndUpdate(
          { publicKey: toPublicKey },
          { balance: toBalanceSOL },
          { new: true }
        )
      ]);

      this.logger.log(`Wallets updated successfully after transaction`);
    } catch (error) {
      this.logger.error('Error updating wallets after transaction:', error);
      throw new Error('Failed to update wallets after transaction');
    }
  }
  private async updateWalletBalances(fromPublicKey: string, toPublicKey: string, amount: number) {
    try {
      const [fromWallet, toWallet] = await Promise.all([
        this.WalletModel.findOne({ publicKey: fromPublicKey }),
        this.WalletModel.findOne({ publicKey: toPublicKey })
      ]);

      if (fromWallet) {
        fromWallet.balance -= amount;
        await fromWallet.save();
      }

      if (toWallet) {
        toWallet.balance += amount;
        await toWallet.save();
      }

      this.logger.log(`Wallet balances updated successfully`);
    } catch (error) {
      this.logger.error('Error updating wallet balances:', error);
      throw new Error('Failed to update wallet balances');
    }
  }
  private async saveTransactionDetails(transactionData: TransactionRecord ) {
    try {
      this.logger.log('Saving transaction details:', transactionData);
      
      // Ici, vous pouvez implémenter la logique pour sauvegarder 
      // les détails de la transaction dans votre base de données
      
      this.logger.log(`Transaction details saved successfully`);
    } catch (error) {
      this.logger.error('Error saving transaction details:', error);
      throw new Error('Failed to save transaction details');
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
      this.logger.log(`Starting transfer: User ${userId}, From ${fromWalletPublicKey}, To ${toWalletPublicKey}, Amount ${amount}`);
  
      const fromWallet = await this.WalletModel.findOne({
        userId: userId,
        publicKey: fromWalletPublicKey
      });
  
      if (!fromWallet) {
        throw new BadRequestException('Source wallet not found');
      }
  
      const fromPublicKeyObj = new web3.PublicKey(fromWalletPublicKey);
      
      let networkBalance: number;
      try {
        networkBalance = await this.connection.getBalance(fromPublicKeyObj);
      } catch (networkError) {
        this.logger.error('Network balance retrieval failed', networkError);
        throw new BadRequestException('Unable to retrieve network balance');
      }
  
      const balanceInSOL = networkBalance / web3.LAMPORTS_PER_SOL;
      
      this.logger.log(`Network Balance: ${balanceInSOL} SOL`);
  
      if (balanceInSOL < amount) {
        throw new BadRequestException(
          `Insufficient funds. Current balance: ${balanceInSOL.toFixed(4)} SOL, Requested transfer: ${amount} SOL`
        );
      }
  
      const fromSecretKey = this.decryptPrivateKey(fromWallet.privateKey);
  
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
  
      // La synchronisation est maintenant gérée dans sendTransaction
  
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
  
      if (error instanceof BadRequestException) {
        throw error;
      }
  
      throw new BadRequestException('Transaction failed due to an unexpected error');
    }
  }
  // Updated transfer method with more robust checks
  // Modify the transfer method to explicitly handle balance
  

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

   // Mise à jour de la méthode getTransactionsByWallet
   async getTransactionsByWallet(walletAddress: string) {
    try {
      const publicKey = new web3.PublicKey(walletAddress);
      
      const signatures = await this.connection.getSignaturesForAddress(publicKey, {
        limit: 50,
      });

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          const transaction = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });

          if (!transaction) return null;

          // Créer une nouvelle transaction dans la base de données
          const transactionData = {
            signature: sig.signature,
            walletPublicKey: walletAddress,
            blockTime: transaction.blockTime,
            amount: transaction.meta.postBalances[0] / web3.LAMPORTS_PER_SOL,
            type: this.determineTransactionType(transaction),
            status: transaction.meta.err ? 'failed' : 'success',
            fromAddress: transaction.transaction.message.getAccountKeys[0].toString(),
            toAddress: transaction.transaction.message.getAccountKeys[1].toString(),
            fee: transaction.meta.fee / web3.LAMPORTS_PER_SOL,
            timestamp: new Date(transaction.blockTime * 1000)
          };

          // Sauvegarder la transaction dans la base de données si elle n'existe pas déjà
          await this.TransactionModel.findOneAndUpdate(
            { signature: sig.signature },
            transactionData,
            { upsert: true, new: true }
          );

          return transactionData;
        })
      );

      return transactions.filter(t => t !== null);
    } catch (error) {
      this.logger.error('Error fetching transactions', error);
      throw new BadRequestException('Failed to fetch transactions');
    }
  }

  //récupérer les wallets avec leurs transactions pour un user 
  async getWalletsWithTransactions(userId: string): Promise<Wallet[]> {
    try {
      // 1. Récupérer les wallets de l'utilisateur
      const wallets = await this.WalletModel
        .find({ userId })
        .lean();

      if (!wallets || wallets.length === 0) {
        return [];
      }

      // 2. Pour chaque wallet, récupérer son solde et ses transactions
      const walletsWithTransactions = await Promise.all(
        wallets.map(async (wallet) => {
          try {
            // 2.1 Mettre à jour le solde en utilisant votre méthode existante
            if (wallet.publicKey) {
              try {
                const pubKey = new web3.PublicKey(wallet.publicKey);
                await this.getWalletBalance(pubKey);
              } catch (balanceError) {
                this.logger.error(`Error updating balance for wallet ${wallet.publicKey}:`, balanceError);
              }
            }

            // 2.2 Récupérer les transactions de la base de données
            const transactions = await this.TransactionModel
              .find({
                $or: [
                  { fromAddress: wallet.publicKey },
                  { toAddress: wallet.publicKey }
                ]
              })
              .sort({ blockTime: -1 })
              .lean();

            // 2.3 Récupérer le wallet mis à jour depuis la base de données
            const updatedWallet = await this.WalletModel
              .findOne({ publicKey: wallet.publicKey })
              .lean();

            return {
              ...updatedWallet,
              transactions: transactions || []
            };
          } catch (error) {
            this.logger.error(`Error processing wallet ${wallet.publicKey}:`, error);
            return {
              ...wallet,
              transactions: []
            };
          }
        })
      );

      return walletsWithTransactions;

    } catch (error) {
      this.logger.error('Error in getWalletsWithTransactions:', error);
      throw new BadRequestException('Failed to fetch wallets and transactions');
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

