import sys
import json
import pickle
import numpy as np
from datetime import datetime, timedelta

def load_model(model_path='src/prediction/python/xgboost_currency_model.pkl'):
    with open(model_path, 'rb') as f:
        return pickle.load(f)

def predict(input_data):
    model = load_model()
    start_date = datetime.strptime(input_data['date'], '%Y-%m-%d')
    
    predictions = {}
    for currency in input_data['currencies']:
        currency_predictions = []
        for days_ahead in range(7):
            prediction_date = start_date + timedelta(days=days_ahead)
            
            features = [
                prediction_date.day, 
                prediction_date.month, 
                prediction_date.year
            ]
            
            X = np.array(features).reshape(1, -1)
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

if __name__ == '__main__':
    input_data = json.loads(sys.argv[1])
    result = predict(input_data)
    print(json.dumps(result))