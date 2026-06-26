import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os

def train_and_save_model():
    print("Generating synthetic training data for ParkShare recommendation model...")
    np.random.seed(42)
    n_samples = 1500

    # Generate features
    distance = np.random.uniform(0.1, 8.0, n_samples)  # Distance in km
    price = np.random.uniform(20.0, 150.0, n_samples)   # Price in INR/hr
    rating = np.random.uniform(1.5, 5.0, n_samples)     # Space Rating (1.0 to 5.0)
    traffic = np.random.randint(1, 6, n_samples)       # Traffic congestion (1 to 5)
    peak_hour = np.random.randint(0, 2, n_samples)     # Peak Hours active (0 or 1)
    has_ev = np.random.randint(0, 2, n_samples)        # Has EV charger (0 or 1)

    # Compute continuous booking probability/suitability score (0.0 to 1.0)
    # Higher rating, lower price, shorter distance, lower traffic, and availability of EV charger increases the score
    # Price is normalized relative to 150 max, distance relative to 8 max
    norm_dist = np.clip(1 - (distance / 8.0), 0, 1)
    norm_price = np.clip(1 - (price / 150.0), 0, 1)
    norm_rating = rating / 5.0
    norm_traffic = 1 - (traffic / 5.0)

    # Weighted utility formula with added Gaussian noise
    utility = (
        0.35 * norm_dist +
        0.25 * norm_price +
        0.25 * norm_rating +
        0.10 * norm_traffic +
        0.05 * has_ev
    )
    noise = np.random.normal(0, 0.05, n_samples)
    booking_score = np.clip(utility + noise, 0.0, 1.0)

    # Create DataFrame
    df = pd.DataFrame({
        'distance': distance,
        'price': price,
        'rating': rating,
        'traffic': traffic,
        'peak_hour': peak_hour,
        'has_ev': has_ev,
        'booking_score': booking_score
    })

    # Train Random Forest Regressor
    X = df[['distance', 'price', 'rating', 'traffic', 'peak_hour', 'has_ev']]
    y = df['booking_score']

    print("Training RandomForestRegressor model...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    # Save model and feature names
    model_path = os.path.join(os.path.dirname(__file__), 'model.joblib')
    joblib.dump(model, model_path)
    print(f"Model successfully saved to {model_path}")
    
    # Test prediction
    sample_pred = model.predict([[1.5, 50.0, 4.5, 2, 0, 1]])[0]
    print(f"Sample prediction test (dist=1.5km, price=50/hr, rating=4.5, traffic=2, EV=1): {sample_pred:.4f}")

if __name__ == '__main__':
    train_and_save_model()
