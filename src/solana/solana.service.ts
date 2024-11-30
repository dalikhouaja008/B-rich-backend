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
  async createWallet(createWalletDto: createWalletDto): Promise<Wallet> {
    try {
      // Generate a new key pair
      const keypair = web3.Keypair.generate();
      const publicKey = keypair.publicKey.toBase58();
  
      // Try to request airdrop
      try {
        await this.requestAirdrop(keypair.publicKey);
      } catch (airdropError) {
        this.logger.warn('Airdrop failed', airdropError);
      }
  
      // Create wallet with all required fields
      const newWallet = new this.WalletModel({
        id: undefined, // Let MongoDB generate
        userId: createWalletDto.userId,
        publicKey: publicKey,
        network: 'devnet', // Explicitly set network
        balance: await this.getWalletBalance(keypair.publicKey)
      });
  
      // Save and return the wallet
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

  async findWalletsByUser(userId: string): Promise<Wallet[]> {
    return this.WalletModel.find({ 
      where: { userId },
      order: { createdAt: 'DESC' }
    });
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

    // Permet de lier un wallet Phantom existant
    async linkPhantomWallet(userId: string, phantomPublicKey: string) {
      try {
        const publicKey = new web3.PublicKey(phantomPublicKey);
    
        const existingWallet = await this.WalletModel.findOne({
          publicKey: phantomPublicKey
        });
    
        if (existingWallet) {
          throw new ConflictException('Wallet already exists');
        }
    
        const balance = await this.getWalletBalance(publicKey);
    
        const newLinkedWallet = new this.WalletModel({
          userId,
          publicKey: phantomPublicKey,
          type: 'PHANTOM',
          network: 'mainnet',
          balance: balance
        });
    
        return await newLinkedWallet.save();
      } catch (error) {
        // Gestion des erreurs de conversion de clé publique
        if (error instanceof Error && error.message.includes('Invalid public key')) {
          throw new BadRequestException('Invalid Phantom wallet public key');
        }
        throw error;
      }
    }

    async getUserWallets(userId: string) {
      return this.WalletModel.find({ userId });
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

