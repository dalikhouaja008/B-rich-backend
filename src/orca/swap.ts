import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Network, OrcaPool, OrcaPoolToken, OrcaU64, TransactionPayload } from '@orca-so/sdk';
import bs58 from 'bs58';
import Decimal from 'decimal.js';
interface TokenQuote {
    token: OrcaPoolToken;
    amount: Decimal | OrcaU64;
}

interface SwapQuote {
    from: TokenQuote;
    to: TokenQuote;
}

export async function swap(
    pool: OrcaPool,
    keypair: Keypair,
    swapQuote: SwapQuote,
): Promise<TransactionPayload> {
    return pool.swap(
        keypair,
        swapQuote.from.token,
        swapQuote.from.amount,
        swapQuote.to.amount,
    );
}

export async function getSwapQuote(
    pool: OrcaPool,
    tokenFrom: OrcaPoolToken,
    tokenFromAmount: Decimal | OrcaU64,
    slippage: Decimal,
): Promise<SwapQuote> {
    const tokenA = pool.getTokenA();
    const tokenB = pool.getTokenB();

    const tokenTo = tokenA === tokenFrom ? tokenB : tokenA;

    const quote = await pool.getQuote(tokenFrom, tokenFromAmount, slippage);

    const tokenToAmount = quote.getMinOutputAmount();

    const swapQuote = {
        from: {
            token: tokenFrom,
            amount: tokenFromAmount,
        },
        to: {
            token: tokenTo,
            amount: tokenToAmount,
        },
    };

    return swapQuote;
}

export function printSwapQuote(swapQuote: SwapQuote) {
    console.log(
        `${swapQuote.from.amount.toNumber()}`,
        `${swapQuote.from.token.tag}`,
        '->',
        `${swapQuote.to.amount.toNumber()}`,
        `${swapQuote.to.token.tag}`,
    );
}
