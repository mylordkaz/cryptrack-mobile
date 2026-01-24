/**
 * Compare CoinGecko top 250 coins with Binance available pairs
 *
 * This script fetches the top 250 cryptocurrencies by market cap from CoinGecko
 * and checks which ones are available for trading on Binance.
 */

interface CoinGeckoMarket {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number;
}

interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
}

interface BinanceExchangeInfo {
  symbols: BinanceSymbolInfo[];
}

async function fetchCoinGeckoTop250(): Promise<Set<string>> {
  console.log('Fetching top 250 coins from CoinGecko...');

  const response = await fetch(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1'
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
  }

  const data: CoinGeckoMarket[] = await response.json();

  // Extract symbols and convert to uppercase (Binance uses uppercase)
  const symbols = new Set(data.map(coin => coin.symbol.toUpperCase()));

  console.log(`✓ Fetched ${symbols.size} coins from CoinGecko\n`);

  return symbols;
}

async function fetchBinancePairs(): Promise<Set<string>> {
  console.log('Fetching trading pairs from Binance...');

  const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
  }

  const data: BinanceExchangeInfo = await response.json();

  // Extract unique base assets (coins) from all trading pairs
  // Filter only TRADING status pairs
  const baseAssets = new Set(
    data.symbols
      .filter(s => s.status === 'TRADING')
      .map(s => s.baseAsset)
  );

  console.log(`✓ Found ${baseAssets.size} unique coins on Binance\n`);

  return baseAssets;
}

async function compareExchanges() {
  try {
    console.log('='.repeat(60));
    console.log('CoinGecko vs Binance Coverage Analysis');
    console.log('='.repeat(60) + '\n');

    // Fetch data from both sources
    const [coinGeckoCoins, binanceCoins] = await Promise.all([
      fetchCoinGeckoTop250(),
      fetchBinancePairs(),
    ]);

    // Find coins that are in CoinGecko top 250 but NOT on Binance
    const missingOnBinance = Array.from(coinGeckoCoins).filter(
      coin => !binanceCoins.has(coin)
    );

    // Find coins that ARE on Binance from the top 250
    const availableOnBinance = Array.from(coinGeckoCoins).filter(
      coin => binanceCoins.has(coin)
    );

    // Calculate coverage
    const coverage = (availableOnBinance.length / coinGeckoCoins.size) * 100;

    // Display results
    console.log('='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60) + '\n');

    console.log(`CoinGecko Top 250 coins: ${coinGeckoCoins.size}`);
    console.log(`Available on Binance: ${availableOnBinance.length}`);
    console.log(`Missing on Binance: ${missingOnBinance.length}`);
    console.log(`Coverage: ${coverage.toFixed(2)}%\n`);

    if (missingOnBinance.length > 0) {
      console.log('='.repeat(60));
      console.log(`COINS NOT AVAILABLE ON BINANCE (${missingOnBinance.length})`);
      console.log('='.repeat(60) + '\n');

      // Sort alphabetically for easier reading
      missingOnBinance.sort();

      // Display in columns
      const cols = 5;
      for (let i = 0; i < missingOnBinance.length; i += cols) {
        const row = missingOnBinance.slice(i, i + cols);
        console.log(row.map(coin => coin.padEnd(10)).join(' '));
      }
      console.log();
    }

    console.log('='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60) + '\n');

    if (coverage === 100) {
      console.log('✓ Binance has ALL top 250 CoinGecko coins!');
    } else if (coverage >= 90) {
      console.log(`✓ Binance has excellent coverage (${coverage.toFixed(2)}%)`);
    } else if (coverage >= 75) {
      console.log(`⚠ Binance has good coverage (${coverage.toFixed(2)}%)`);
    } else {
      console.log(`⚠ Binance has limited coverage (${coverage.toFixed(2)}%)`);
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the comparison
compareExchanges();
