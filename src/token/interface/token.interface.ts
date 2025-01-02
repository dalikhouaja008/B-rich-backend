

export interface TokenInterface {
    network: string;
  }
  
  export interface Token {
    symbol: string;
    name: string;
    mint: string;
    decimals: number;
    logoURI?: string;
    tags?: string[];
  }
