import { getPoolInfos, calculateAmountOut } from '@flowx-pkg/ts-sdk'
import BigNumber from 'bignumber.js'
import { setTimeout } from 'timers/promises'
import {
  SUI_TOKEN_TYPE,
  SUI_AMOUNT_WARNING_THRESHOLD,
  POOL_ID,
  QUOTE_SYMBOL,
  QUOTE_TOKEN_TYPE,
  coinIn,
  coinOut,
  REFRESH_INTERVAL,
  USD_PEG_PRICE,
  QUOTE_DECIMALS,
} from './config.js'
import { swap } from './swap.js'
import { MIST_PER_SUI } from '@mysten/sui.js'

console.log('> starting auto pegg')
console.log('> Pool ID', POOL_ID)
console.log('> Symbol', QUOTE_SYMBOL)
console.log('> Token type', QUOTE_TOKEN_TYPE)
console.log('> USD Peg Price', USD_PEG_PRICE)
console.log('> Refresh Interval', REFRESH_INTERVAL)
console.log('> SUI Amount Warning Threshold', SUI_AMOUNT_WARNING_THRESHOLD)

function compute_price_impact({
  sui_balance,
  swap_data,
  quote_token_balance,
  quote_token_price_in_sui,
}) {
  // Calculate the simulated new balances after swap (for illustration purposes only)
  const new_sui_balance = sui_balance.plus(swap_data.amountIn.decimalAmount)
  const new_quote_token_balance = quote_token_balance.minus(swap_data.amountOut.decimalAmount)
  const new_quote_token_price_in_sui = new_sui_balance.dividedBy(new_quote_token_balance)
  return new_quote_token_price_in_sui
    .minus(quote_token_price_in_sui)
    .dividedBy(quote_token_price_in_sui)
    .multipliedBy(100)
}

// =====================================================
// USE THE FUNCTION BELOW IF YOU WISH TO PEG AGAINST USD
// YOU WILL HAVE TO PROVIDE YOUR OWN ORACLE FOR THIS
// MAKE SURE TO USE A POOL OF ORACLE TO AVOID MANIPULATION
// =====================================================
async function get_usd_amount(sui_amount) {
  return new BigNumber(sui_amount).multipliedBy(1.556)
}

async function enforce_price_to_peg() {
  console.log('> Checking price...', `(${new Date().toISOString()})`)

  const [{ reserveX, reserveY }] = await getPoolInfos([POOL_ID])
  const sui_price_in_usd = await get_usd_amount(1)
  const sui_balance = new BigNumber(reserveX.fields.balance)
  const quote_token_balance = new BigNumber(reserveY.fields.balance)
  const quote_token_price_in_sui = sui_balance.dividedBy(quote_token_balance)
  const quote_token_price_in_usd = await get_usd_amount(quote_token_price_in_sui)

  const sui_balance_in_usd = sui_balance
    .dividedBy(MIST_PER_SUI.toString())
    .multipliedBy(sui_price_in_usd)

  // Quote token balance remains in its raw value for comparison
  const quote_token_balance_raw = quote_token_balance.dividedBy(10 ** QUOTE_DECIMALS)

  // Calculate the current ratio of USD value of Sui to raw value of quote tokens in the pool
  const current_ratio = sui_balance_in_usd.dividedBy(quote_token_balance_raw)

  // Target ratio based on USD_PEG_PRICE
  const target_ratio = new BigNumber(USD_PEG_PRICE)

  // since we query the FlowX api and not the chain, it doesn't hurt to check that
  if (reserveX?.type !== `0x2::coin::Coin<${SUI_TOKEN_TYPE}>`)
    throw new Error('Base token is incorrect')

  if (reserveY?.type !== `0x2::coin::Coin<${QUOTE_TOKEN_TYPE}>`)
    throw new Error('Quote token is incorrect')

  // Check if the quote token price in USD is less than the USD peg price
  if (current_ratio.isLessThan(target_ratio)) {
    // Calculate the additional Sui balance in USD needed to match the target ratio
    const additional_sui_balance_in_usd_needed = quote_token_balance_raw
      .multipliedBy(target_ratio)
      .minus(sui_balance_in_usd)

    // Convert the additional USD needed to Sui
    const amount_required_in_sui = additional_sui_balance_in_usd_needed.dividedBy(sui_price_in_usd)

    console.dir({
      sui_price_in_usd: sui_price_in_usd.toFixed(2),
      quote_token_price_in_sui: quote_token_price_in_sui.toFixed(2),
      quote_token_price_in_usd: quote_token_price_in_usd.toFixed(2),
      sui_balance_in_usd: sui_balance_in_usd.toFixed(2),
      quote_token_balance_raw: quote_token_balance_raw.toFixed(2),
      current_ratio: current_ratio.toFixed(2),
      target_ratio: target_ratio.toFixed(2),
      additional_sui_balance_in_usd_needed: additional_sui_balance_in_usd_needed.toFixed(2),
      amount_required_in_sui: amount_required_in_sui.toFixed(2),
    })

    console.log(
      `> Amount needed for swap to adjust price back to ${USD_PEG_PRICE} USD:`,
      amount_required_in_sui.toFixed(2),
      'SUI'
    )

    if (amount_required_in_sui.isGreaterThan(SUI_AMOUNT_WARNING_THRESHOLD))
      console.warn(
        `> ========== Amount needed for swap is greater than ${SUI_AMOUNT_WARNING_THRESHOLD} SUI ==========`
      )

    const swap_data = await calculateAmountOut(amount_required_in_sui.toString(), coinIn, coinOut)

    // this is purely used as a log to show the price impact of the swap
    const price_impact = compute_price_impact({
      sui_balance,
      swap_data,
      quote_token_balance,
      quote_token_price_in_sui,
    })

    console.log(`> Price Impact: ${price_impact.toFixed(2)}%`)

    await swap(swap_data)
  } else {
    console.log(`> No adjustment needed, price is at or above ${USD_PEG_PRICE} USD.`)
  }

  console.log('')
}

for (;;) {
  await enforce_price_to_peg().catch(console.error)
  await setTimeout(REFRESH_INTERVAL)
}
