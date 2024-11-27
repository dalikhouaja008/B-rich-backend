
interface PredictionResult {
    predictions: {
      [currency: string]: CurrencyPrediction[];
    };
    start_date: string;
    error?: string;
  }