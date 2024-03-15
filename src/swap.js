import { swapExactInput } from '@flowx-pkg/ts-sdk'
import { coinIn, coinOut, HOT_WALLET_PRIVATE_KEY } from './config.js'
import { JsonRpcProvider, mainnetConnection, RawSigner, Ed25519Keypair } from '@mysten/sui.js'

// FlowX sdk uses a deprecated version of Sui.js so we have to use it too
const provider = new JsonRpcProvider(mainnetConnection)
const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(HOT_WALLET_PRIVATE_KEY, 'base64'))
const signer = new RawSigner(keypair, provider)

export async function swap(swap_data) {
  console.log('> Swapping...')
  const transactionBlock = await swapExactInput(
    false, //it should be false for now
    swap_data.amountIn, //amount want to swap
    swap_data.amountOut, //amount want to receive
    swap_data.trades, //trades from calculate amount
    coinIn, //coin In data
    coinOut, //coin Out data
    keypair.getPublicKey().toSuiAddress(), // recipient address
    0.005 //slippage (0.05%)
  )

  const result = await signer.signAndExecuteTransactionBlock({
    transactionBlock,
  })

  console.log('> tx hash:', result.digest)
}
