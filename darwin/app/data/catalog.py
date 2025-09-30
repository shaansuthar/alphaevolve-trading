from pathlib import Path
import pandas as pd

from nautilus_trader.model.data import Bar, BarType
from nautilus_trader.model.objects import Price, Quantity
from nautilus_trader.core.datetime import dt_to_unix_nanos
from nautilus_trader.model.identifiers import InstrumentId, Symbol
from nautilus_trader.model.instruments import CurrencyPair
from nautilus_trader.model.currencies import BTC, USD
from nautilus_trader.persistence.catalog import ParquetDataCatalog

# --- Load CSV ---
data_dir = Path(__file__).parent
csv_path = data_dir / "btcusd_1-min_data.csv"
df = pd.read_csv(csv_path, nrows=1000)

# Normalize headers
df.columns = [c.strip().lower() for c in df.columns]
# expected: timestamp, open, high, low, close, volume

# Parse UNIX seconds -> UTC timestamps  
df["ts"] = pd.to_datetime(df["timestamp"], unit="s", utc=True)

# --- Define InstrumentId and BarType ---
# Use Nautilus Trader instrument ID format (e.g. BTCUSD.TEST)
# BarType format: "{instrument_id}-{step}-{aggregation}-{price_type}-{aggregation_source}"
bar_type = BarType.from_str("BTCUSD.TEST-1-MINUTE-LAST-INTERNAL")
instrument_id = bar_type.instrument_id

# --- Build Bars ---
bars: list[Bar] = []
for row in df.itertuples(index=False):
    ts_ns = dt_to_unix_nanos(row.ts.to_pydatetime())
    bars.append(
        Bar(
            bar_type=bar_type,
            open=Price.from_str(str(row.open)),
            high=Price.from_str(str(row.high)),
            low=Price.from_str(str(row.low)),
            close=Price.from_str(str(row.close)),
            volume=Quantity.from_str(str(row.volume)),
            ts_event=ts_ns,
            ts_init=ts_ns,
        )
    )

print(f"Built {len(bars)} bars for {instrument_id.value}")

# --- Create Instrument Definition ---
# Create a BTCUSD CurrencyPair instrument for the SIM venue
instrument = CurrencyPair(
    instrument_id=instrument_id,
    raw_symbol=Symbol("BTCUSD"),
    base_currency=BTC,
    quote_currency=USD,
    price_precision=2,
    size_precision=8,
    price_increment=Price.from_str("0.01"),
    size_increment=Quantity.from_str("0.00000001"),
    # maker_fee=Price.from_str("0.001"),
    # taker_fee=Price.from_str("0.001"),
    ts_event=0,
    ts_init=0,
)

# --- Persist to ParquetDataCatalog ---
# Persist under a deterministic catalog path adjacent to this module
CATALOG_PATH = data_dir / "catalog"
CATALOG_PATH.mkdir(parents=True, exist_ok=True)
catalog = ParquetDataCatalog(CATALOG_PATH)

# Write instrument definition first, then bars
catalog.write_data([instrument])
catalog.write_data(bars)

print("Catalog instruments:", catalog.instruments())
print(f"Catalog bar data: {len(catalog.bars(instrument_id=instrument_id))} bars")