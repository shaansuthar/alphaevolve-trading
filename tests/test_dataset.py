"""Tests for dataset loading functionality."""

import pandas as pd
from alphaevolve.evaluator.loader import load_custom_ohlc


def test_load_custom_ohlc_basic():
    """Test basic functionality of load_custom_ohlc with WinkingFace dataset."""
    # First, let's check what data range we actually have
    from datasets import load_dataset
    dataset = load_dataset("WinkingFace/CryptoLM-Bitcoin-BTC-USDT")
    raw_df = dataset['train'].to_pandas()
    raw_df['date'] = pd.to_datetime(raw_df['timestamp'])
    
    print(f"Raw dataset date range: {raw_df['date'].min()} to {raw_df['date'].max()}")
    print(f"Sample dates: {raw_df['date'].head().tolist()}")
    
    # Use a date range that exists in the data
    # Load data without filtering first to see what we get
    df = load_custom_ohlc()
    print(f"Loaded data shape: {df.shape}")
    print(f"Loaded data date range: {df.index.min()} to {df.index.max()}")
    
    # Check that we have the correct MultiIndex structure
    assert isinstance(df.columns, pd.MultiIndex)
    assert df.columns.nlevels == 2
    
    # Check that we have the expected columns (fields)
    expected_fields = ["open", "high", "low", "close", "volume"]
    actual_fields = df.columns.levels[0].tolist()
    for field in expected_fields:
        assert field in actual_fields, f"Missing field: {field}"
    
    # Check that we have BTC-USDT as a symbol
    assert "BTC-USDT" in df.columns.levels[1]
    
    # Check that the index is DatetimeIndex
    assert isinstance(df.index, pd.DatetimeIndex)
    
    # Check that we have data (non-empty DataFrame)
    assert not df.empty
    
    print(df.info())

    


# def test_load_custom_ohlc_date_filtering():
#     """Test that date filtering works correctly."""
#     # Load data with specific date range
#     start_date = "2021-01-01"
#     end_date = "2021-01-31"
#     df = load_custom_ohlc("", start=start_date, end=end_date)
    
#     # Check that all dates are within the specified range
#     assert df.index.min() >= pd.to_datetime(start_date)
#     assert df.index.max() <= pd.to_datetime(end_date)


# def test_load_custom_ohlc_adj_close():
#     """Test that adj_close column is properly created."""
#     df = load_custom_ohlc("", start="2020-01-01", end="2020-01-07")
    
#     btc_data = df.xs("BTC-USDT", axis=1, level=1)
    
#     # For crypto data, adj_close should equal close
#     assert (btc_data["adj_close"] == btc_data["close"]).all()


if __name__ == "__main__":
    # Run basic tests
    test_load_custom_ohlc_basic()
    # test_load_custom_ohlc_date_filtering()
    # test_load_custom_ohlc_adj_close()
    print("All tests passed!")
