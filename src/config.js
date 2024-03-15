const {
  POOL_ID,
  SUI_TOKEN_TYPE = '0x2::sui::SUI',
  SUI_SYMBOL = 'SUI',
  SUI_DECIMALS: sui_decimals = 9,
  QUOTE_TOKEN_TYPE,
  QUOTE_SYMBOL,
  QUOTE_DECIMALS: quote_decimals = 9,
  SUI_AMOUNT_WARNING_THRESHOLD: warning_threshold = 2000,
  USD_PEG_PRICE: usd_peg_price = 2,
  HOT_WALLET_PRIVATE_KEY,
  REFRESH_INTERVAL: refresh_interval = 10000,
} = process.env

export const SUI_AMOUNT_WARNING_THRESHOLD = +warning_threshold
export const REFRESH_INTERVAL = +refresh_interval
export const USD_PEG_PRICE = +usd_peg_price
export const QUOTE_DECIMALS = +quote_decimals
export const SUI_DECIMALS = +sui_decimals

export const coinIn = {
  type: SUI_TOKEN_TYPE,
  symbol: SUI_SYMBOL,
  decimals: +sui_decimals,
}

export const coinOut = {
  type: QUOTE_TOKEN_TYPE,
  symbol: QUOTE_SYMBOL,
  decimals: +quote_decimals,
}

export {
  POOL_ID,
  SUI_TOKEN_TYPE,
  SUI_SYMBOL,
  QUOTE_TOKEN_TYPE,
  QUOTE_SYMBOL,
  HOT_WALLET_PRIVATE_KEY,
}
