import sys
import json
import pickle
import numpy as np
from datetime import datetime, timedelta
import logging
from sklearn.preprocessing import LabelEncoder

# Configure logging to write to a file
logging.basicConfig(filename='prediction_debug.log', level=logging.DEBUG, 
                    format='%(asctime)s - %(levelname)s - %(message)s')

def encode_currency(currency, known_currencies=None):
    if known_currencies is None:
        known_currencies = ['SAR', 'CAD', 'DKK', 'AED', 'USD', 'GBP', 'JPY', 'KWD', 'NOK', 'QAR', 'SEK', 'CHF', 'EUR', 'BHD', 'CNY']
    
    label_encoder = LabelEncoder()
    label_encoder.fit(known_currencies)
    
    try:
        return label_encoder.transform([currency])[0]
    except ValueError:
        logging.warning(f"Currency {currency} not in known list. Using default encoding.")
        return len(known_currencies)  # Add new currencies at the end
    
def load_model(model_path='src/prediction/python/xgboost_currency_model_global1.pkl'):
    try:
        with open(model_path, 'rb') as f:
            return pickle.load(f)
    except Exception as e:
        logging.error(f"Error loading model: {e}")
        raise

def predict(input_data):
    try:
        model = load_model()
        start_date = datetime.strptime(input_data['date'], '%Y-%m-%d')
        
        predictions = {}
        for currency in input_data['currencies']:
            currency_predictions = []
            
            for days_ahead in range(7):
                prediction_date = start_date + timedelta(days=days_ahead)
                
                # Ensure all features are float
                features = np.array([
                    float(prediction_date.day),
                    float(prediction_date.month),
                    float(prediction_date.year),
                    float(encode_currency(currency))
                ], dtype=float)
                
                # Log features instead of printing
                logging.debug(f"Features for {currency} on {prediction_date}: {features}")
                
                X = features.reshape(1, -1)
                prediction = model.predict(X)
                
                currency_predictions.append({
                    'date': prediction_date.strftime('%Y-%m-%d'),
                    'value': float(prediction[0])
                })
            
            predictions[currency] = currency_predictions
        
        return {
            'predictions': predictions,
            'start_date': input_data['date']
        }
    except Exception as e:
        logging.error(f"Prediction error: {e}")
        raise

if __name__ == '__main__':
    try:
        # Ensure only JSON is printed to stdout
        input_data = json.loads(sys.argv[1])
        result = predict(input_data)
        print(json.dumps(result))
    except Exception as e:
        logging.error(f"Script execution error: {e}")
        # Print error to stderr to distinguish from stdout
        sys.stderr.write(str(e))
        sys.exit(1)