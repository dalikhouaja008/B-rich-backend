export interface TokenBalance {
    symbol: string;
    balance: number;
    mint: string;
    tokenAccount: string | null;
    swappedAmount: number;
    lastSwapDate: Date;
  }