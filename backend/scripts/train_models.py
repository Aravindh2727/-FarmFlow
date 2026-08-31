import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score

# Paths
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "ml", "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

print("========================================")
print(" FARMFLOW - ML MODEL TRAINING SCRIPT")
print("========================================")

# ==========================================
# 1. SYNTHETIC DATA GENERATION
# ==========================================
print("\n[1/4] Generating synthetic datasets...")
np.random.seed(42)

# A. Crop Data (Yield & Profit)
# We generate 1000 records of crop harvests
crop_types = ['Paddy', 'Wheat', 'Corn', 'Cotton', 'Sugarcane']
seasons = ['Kharif', 'Rabi', 'Zaid']
n_crops = 1000

crop_data = {
    'crop_type': np.random.choice(crop_types, n_crops),
    'season': np.random.choice(seasons, n_crops),
    'area': np.random.uniform(1.0, 50.0, n_crops), # Acres
    'duration_days': np.random.randint(90, 180, n_crops),
}
df_crops = pd.DataFrame(crop_data)

# Baseline Yield factors (kg per acre)
yield_baselines = {'Paddy': 2500, 'Wheat': 1500, 'Corn': 3000, 'Cotton': 500, 'Sugarcane': 30000}
profit_margins = {'Paddy': 15, 'Wheat': 20, 'Corn': 12, 'Cotton': 80, 'Sugarcane': 2} # Profit per kg

# Generate Target Variables with some random noise
actual_yield = []
profit = []

for idx, row in df_crops.iterrows():
    base = yield_baselines[row['crop_type']]
    
    # Season effect
    if row['season'] == 'Kharif' and row['crop_type'] in ['Paddy', 'Cotton']:
        base *= 1.2
    
    # Area effect (slight diminishing returns)
    area_factor = row['area'] ** 0.95
    
    # Calculate yield with 10% noise
    y = base * area_factor * np.random.uniform(0.9, 1.1)
    actual_yield.append(y)
    
    # Calculate profit with noise
    margin = profit_margins[row['crop_type']]
    p = y * margin * np.random.uniform(0.8, 1.2) - (row['area'] * 5000) # Base cost per acre
    profit.append(p)

df_crops['actual_yield'] = actual_yield
df_crops['profit'] = profit

# B. Expense Data (Anomaly Detection)
# We want mostly normal expenses, and a few crazy high outliers
categories = ['Seeds', 'Fertilizer', 'Pesticide', 'Labour', 'Tractor', 'Machinery', 'Irrigation']
n_expenses = 2000
df_exp = pd.DataFrame({
    'category': np.random.choice(categories, n_expenses),
    'farm_area': np.random.uniform(2.0, 20.0, n_expenses) # Context feature
})

# Base amount relies on area
base_amounts = {'Seeds': 2000, 'Fertilizer': 5000, 'Pesticide': 3000, 'Labour': 8000, 'Tractor': 4000, 'Machinery': 15000, 'Irrigation': 2000}
amounts = []
for idx, row in df_exp.iterrows():
    base = base_amounts[row['category']] * row['farm_area']
    if np.random.rand() > 0.05:
        # Normal
        amounts.append(base * np.random.uniform(0.8, 1.2))
    else:
        # Anomaly! (5x to 10x higher)
        amounts.append(base * np.random.uniform(5.0, 10.0))

df_exp['amount'] = amounts

# C. NLP Description Data
text_data = [
    ("Bought 5 bags of urea", "Fertilizer"),
    ("Paid daily wages to workers", "Labour"),
    ("Tractor rental for ploughing", "Tractor"),
    ("Purchased paddy seeds", "Seeds"),
    ("Electricity bill for pump", "Irrigation"),
    ("Weedicide and insect spray", "Pesticide"),
    ("Harvester machine rental", "Machinery"),
    ("DAP fertilizer purchase", "Fertilizer"),
    ("Harvesting labour payment", "Labour"),
    ("Diesel for tractor", "Fuel"),
    ("Veterinary doctor fee for cow", "Medical"),
    ("Cattle feed pellets", "Feed"),
] * 50 # Duplicate to create a dataset

df_nlp = pd.DataFrame(text_data, columns=['description', 'category'])


# ==========================================
# 2. MODEL TRAINING: YIELD PREDICTION
# ==========================================
print("\n[2/4] Training Yield & Profit Prediction Models...")

X_crop = df_crops[['crop_type', 'season', 'area']]
y_yield = df_crops['actual_yield']
y_profit = df_crops['profit']

# Preprocessing for categorical data
preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), ['area']),
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['crop_type', 'season'])
    ])

# Yield Model
yield_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
])

X_train, X_test, y_train, y_test = train_test_split(X_crop, y_yield, test_size=0.2, random_state=42)
yield_pipeline.fit(X_train, y_train)
y_pred = yield_pipeline.predict(X_test)

yield_r2 = r2_score(y_test, y_pred)
print(f"  - Yield Model trained. R2 Score: {yield_r2:.3f}")

# Profit Model
profit_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
])

X_train_p, X_test_p, y_train_p, y_test_p = train_test_split(X_crop, y_profit, test_size=0.2, random_state=42)
profit_pipeline.fit(X_train_p, y_train_p)
p_pred = profit_pipeline.predict(X_test_p)

profit_r2 = r2_score(y_test_p, p_pred)
print(f"  - Profit Model trained. R2 Score: {profit_r2:.3f}")


# ==========================================
# 3. MODEL TRAINING: ANOMALY DETECTION
# ==========================================
print("\n[3/4] Training Expense Anomaly Detection Model...")

X_exp = df_exp[['category', 'farm_area', 'amount']]

exp_preprocessor = ColumnTransformer(
    transformers=[
        ('num', StandardScaler(), ['farm_area', 'amount']),
        ('cat', OneHotEncoder(handle_unknown='ignore'), ['category'])
    ])

anomaly_pipeline = Pipeline(steps=[
    ('preprocessor', exp_preprocessor),
    ('isolation_forest', IsolationForest(contamination=0.05, random_state=42))
])

anomaly_pipeline.fit(X_exp)
print(f"  - Isolation Forest trained on {len(df_exp)} expense records.")


# ==========================================
# 4. MODEL TRAINING: NLP CLASSIFICATION
# ==========================================
print("\n[4/4] Training NLP Expense Categorization Model...")

X_text = df_nlp['description']
y_cat = df_nlp['category']

nlp_pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english', max_features=1000)),
    ('clf', LogisticRegression(random_state=42))
])

X_train_t, X_test_t, y_train_t, y_test_t = train_test_split(X_text, y_cat, test_size=0.2, random_state=42)
nlp_pipeline.fit(X_train_t, y_train_t)
y_pred_t = nlp_pipeline.predict(X_test_t)

nlp_acc = accuracy_score(y_test_t, y_pred_t)
print(f"  - NLP Model trained. Accuracy: {nlp_acc:.3f}")


# ==========================================
# 5. SAVING MODELS & METADATA
# ==========================================
print("\n[Saving Models]")
joblib.dump(yield_pipeline, os.path.join(MODELS_DIR, 'yield_model_v1.joblib'))
joblib.dump(profit_pipeline, os.path.join(MODELS_DIR, 'profit_model_v1.joblib'))
joblib.dump(anomaly_pipeline, os.path.join(MODELS_DIR, 'anomaly_model_v1.joblib'))
joblib.dump(nlp_pipeline, os.path.join(MODELS_DIR, 'expense_nlp_v1.joblib'))

metadata = {
    "version": "v1",
    "training_date": datetime.now().isoformat(),
    "models": {
        "yield_prediction": {
            "algorithm": "RandomForestRegressor",
            "features": ["crop_type", "season", "area"],
            "r2_score": round(yield_r2, 3),
            "records": n_crops
        },
        "profit_prediction": {
            "algorithm": "RandomForestRegressor",
            "features": ["crop_type", "season", "area"],
            "r2_score": round(profit_r2, 3),
            "records": n_crops
        },
        "anomaly_detection": {
            "algorithm": "IsolationForest",
            "features": ["category", "farm_area", "amount"],
            "contamination": 0.05,
            "records": n_expenses
        },
        "nlp_categorization": {
            "algorithm": "TF-IDF + LogisticRegression",
            "accuracy": round(nlp_acc, 3),
            "records": len(df_nlp)
        }
    }
}

with open(os.path.join(MODELS_DIR, 'metadata.json'), 'w') as f:
    json.dump(metadata, f, indent=4)

print("  - Models and metadata.json saved successfully.")
print("\nDone! AI/ML setup complete. \u2705")
