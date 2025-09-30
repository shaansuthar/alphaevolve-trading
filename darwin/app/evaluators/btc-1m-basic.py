from pathlib import Path
from decimal import Decimal

import pandas as pd
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "strategies"))
from basic import MyStrategy, MyStrategyConfig
# from basic import MACDStrategy, MACDConfig
from nautilus_trader.backtest.engine import BacktestEngine
from nautilus_trader.config import BacktestEngineConfig
from nautilus_trader.config import LoggingConfig
from nautilus_trader.model import TraderId
from nautilus_trader.model.currencies import USD
from nautilus_trader.model.data import Bar
from nautilus_trader.model.data import BarType
from nautilus_trader.model.enums import AccountType
from nautilus_trader.model.enums import OmsType
from nautilus_trader.model.identifiers import InstrumentId, Venue
from nautilus_trader.model.objects import Money
from nautilus_trader.persistence.catalog import ParquetDataCatalog
from nautilus_trader.persistence.wranglers import BarDataWrangler
from nautilus_trader.test_kit.providers import TestInstrumentProvider


if __name__ == "__main__":
    # Step 1: Configure and create backtest engine
    engine_config = BacktestEngineConfig(
        trader_id=TraderId("BACKTEST_TRADER-001"),
        logging=LoggingConfig(
            log_level="INFO",  # INFO level = less spam, still see summary
        ),
    )
    engine = BacktestEngine(config=engine_config)

    # Step 2: Define exchange and add it to the engine
    TEST = Venue("TEST")
    engine.add_venue(
        venue=TEST,
        oms_type=OmsType.NETTING,
        account_type=AccountType.MARGIN,  # MARGIN account for CurrencyPair instruments
        base_currency=USD,
        starting_balances=[Money(1_000_000.0, USD)],
        bar_execution=True,  # Enable order execution from bar data
    )

    # Step 3: Load instrument from catalog instead of TestInstrumentProvider
    catalog_path = Path(__file__).parent.parent / "data" / "catalog"
    catalog = ParquetDataCatalog(catalog_path)
    instrument_id = InstrumentId.from_str("BTCUSD.TEST")
    BTCUSD_INSTRUMENT = catalog.instruments(instrument_ids=[instrument_id])[0]
    engine.add_instrument(BTCUSD_INSTRUMENT)

    # ==========================================================================================
    # POINT OF FOCUS: Loading bars from CSV
    # ------------------------------------------------------------------------------------------

    # Step 4a: Load bar data from CSV file -> into pandas DataFrame
    csv_file_path = Path(__file__).parent.parent / "data" / "btcusd_1-min_data.csv"
    # Note: Full CSV has 7.2M rows. Using 500k for reasonable performance.
    # For full dataset, use High-Level API with ParquetDataCatalog (streams data in batches)
    df = pd.read_csv(csv_file_path, nrows=900000)  # ~347 days of 1-min data
    
    # Step 4b: Restructure DataFrame into required structure, that can be passed `BarDataWrangler`
    #   - 5 columns: 'open', 'high', 'low', 'close', 'volume' (volume is optional)
    #   - 'timestamp' as index

    # Normalize headers
    df.columns = [c.strip().lower() for c in df.columns]
    # Parse UNIX seconds -> UTC timestamps
    df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)
    
    # HACK: Add fake volume since the data has zero volume (needed for execution)
    df["volume"] = 1000.0  # Use 1.0 BTC volume per bar for testing
    
    # Set timestamp as index first, then reorder columns
    df = df.set_index("timestamp")
    df = df[["open", "high", "low", "close", "volume"]]

    # Step 4c: Define type of loaded bars
    BTCUSD_1MIN_BARTYPE = BarType.from_str(
        f"{BTCUSD_INSTRUMENT.id}-1-MINUTE-LAST-EXTERNAL",
    )

    # Step 4d: `BarDataWrangler` converts each row into objects of type `Bar`
    wrangler = BarDataWrangler(BTCUSD_1MIN_BARTYPE, BTCUSD_INSTRUMENT)
    btcusd_1min_bars_list: list[Bar] = wrangler.process(df)

    # Step 4e: Add loaded data to the engine
    engine.add_data(btcusd_1min_bars_list)

    # ------------------------------------------------------------------------------------------
    # END OF POINT OF FOCUS
    # ==========================================================================================

    # Step 5: Create strategy and add it to the engine
    strategy_config = MyStrategyConfig(
        instrument_id=BTCUSD_INSTRUMENT.id,
        bar_type=BTCUSD_1MIN_BARTYPE,
        trade_size=Decimal("1000.00000000"),  # 100 BTC - much more visible impact!
        order_id_tag="001",
    )
    strategy = MyStrategy(config=strategy_config)
    engine.add_strategy(strategy)


    #  strategy_config = MACDConfig(
    #     instrument_id=BTCUSD_INSTRUMENT.id,
    #     bar_type=BTCUSD_1MIN_BARTYPE,
    #     trade_size=1,  # Trade 1 unit at a time
    #     fast_period=12,
    #     slow_period=26,
    #     entry_threshold=0.00010,
    # )

    # strategy = MACDStrategy(config=strategy_config)
    # Step 6: Run engine = Run backtest
    engine.run()

    # Step 7: Release system resources
    engine.dispose()

   