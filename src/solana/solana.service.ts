import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { createWalletDto } from './dto/create-wallet.dto';
import { UpdateSolanaDto } from './dto/update-solana.dto';
import * as web3 from '@solana/web3.js';
import { Wallet } from './schemas/wallet.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class SolanaService {
  
  private readonly logger = new Logger(SolanaService.name);
  private connection: web3.Connection;

  constructor(
    @InjectModel(Wallet.name) private WalletModel: Model<Wallet>,
  ) {
    // Connect to devnet
    this.connection = new web3.Connection(
      web3.clusterApiUrl('devnet'),
      'confirmed'
    );
  }
 
  // Création d'un nouveau wallet
  async createWallet(createWalletDto: createWalletDto): Promise<Wallet> {
    try {
      // Générer un nouveau keypair
      const keypair = web3.Keypair.generate();
      const publicKey = keypair.publicKey.toBase58();

      // Demander un airdrop
      try {
        await this.requestAirdrop(keypair.publicKey);
      } catch (airdropError) {
        this.logger.warn('Airdrop failed', airdropError);
      }

      // Créer le wallet
      const newWallet = new this.WalletModel({
        userId: createWalletDto.userId,
        publicKey: publicKey,
        type: 'GENERATED',
        network: 'devnet',
        balance: await this.getWalletBalance(keypair.publicKey)
      });

      return await newWallet.save();
    } catch (error) {
      this.logger.error('Wallet creation error', error);
      throw error;
    }
  }
  async requestAirdrop(publicKey: web3.PublicKey, amount = 1): Promise<string> {
    try {
      const signature = await this.connection.requestAirdrop(
        publicKey,
        amount * web3.LAMPORTS_PER_SOL
      );

      // Confirmer la transaction
      await this.connection.confirmTransaction(signature);

      return signature;
    } catch (error) {
      this.logger.error('Erreur lors de la demande de airdrop', error);
      throw error;
    }
  }
  async getWalletBalance(publicKey: web3.PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(publicKey);
    return balance / web3.LAMPORTS_PER_SOL;
  }

  // Récupérer tous les wallets d'un utilisateur
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.WalletModel.find({ userId });
  }
  async syncWalletBalance(publicKey: string): Promise<Wallet> {
    const walletEntity = await this.WalletModel.findOne({
      where: { publicKey }
    });

    if (!walletEntity) {
      throw new Error('Wallet non trouvé');
    }

    const balance = await this.getWalletBalance(new web3.PublicKey(publicKey));
    
    walletEntity.balance = balance;
    return this.WalletModel.create(walletEntity);
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
      const senderKeypair = web3.Keypair.fromSecretKey(fromSecretKey);
      const { blockhash } = await this.connection.getLatestBlockhash();

      const transaction = new web3.VersionedTransaction(
        new web3.TransactionMessage({
          payerKey: sender,
          recentBlockhash: blockhash,
          instructions: [
            web3.SystemProgram.transfer({
              fromPubkey: sender,
              toPubkey: recipient,
              lamports: amount * web3.LAMPORTS_PER_SOL
            })
          ]
        }).compileToV0Message()
      );

      transaction.sign([senderKeypair]);

      const signature = await this.connection.sendTransaction(transaction);
      await this.connection.confirmTransaction(signature);

      return signature;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la transaction:', error);
      throw error;
    }
  }

  // Conversion de devise
  async convertCurrency(
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
  }

    // Lier un wallet Phantom existant
  async linkPhantomWallet(userId: string, phantomPublicKey: string): Promise<Wallet> {
    try {
      // Vérifier si le wallet existe déjà
      const existingWallet = await this.WalletModel.findOne({
        userId: userId,
        publicKey: phantomPublicKey
      });

      if (existingWallet) {
        throw new ConflictException('Ce wallet est déjà lié à votre compte');
      }

      // Vérifier la validité de la clé publique
      const publicKey = new web3.PublicKey(phantomPublicKey);

      // Récupérer le solde
      const balance = await this.getWalletBalance(publicKey);

      // Créer un nouveau wallet
      const newWallet = new this.WalletModel({
        userId: userId,
        publicKey: phantomPublicKey,
        type: 'PHANTOM',
        network: 'devnet',
        balance: balance
      });

      return await newWallet.save();
    } catch (error) {
      this.logger.error('Erreur de liaison de wallet', error);
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

