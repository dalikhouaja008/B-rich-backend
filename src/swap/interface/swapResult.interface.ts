export interface SwapResult {
    signature?: string;
    inputAmount: number;
    outputAmount: number;
    inputMint: string;
    outputMint: string;
    timestamp: Date;
  }