import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from generate_dataset import OUTPUT, generate_dataset

ROOT = Path(__file__).resolve().parents[1]
TARGET = "Deadline_Missed"
CATEGORICAL = ["Case_Type", "Case_Priority", "Task_Priority", "Task_Status"]
NUMERICAL = [
    "Days_Until_Deadline", "Days_Task_Remained_Open", "Previous_Delayed_Tasks",
    "Lawyer_Current_Workload", "Staff_Current_Workload", "Pending_Tasks_Count",
    "Case_Age_Days", "Deadline_Extension_Count", "Task_Completion_Rate",
    "Upcoming_Hearing", "Days_Since_Last_Update",
]


def main() -> None:
    ROOT.joinpath("models").mkdir(exist_ok=True)
    if OUTPUT.exists():
        frame = pd.read_csv(OUTPUT)
    else:
        frame = generate_dataset()
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        frame.to_csv(OUTPUT, index=False)
    frame = frame.dropna(subset=[TARGET]).drop_duplicates()
    x_train, x_test, y_train, y_test = train_test_split(
        frame[CATEGORICAL + NUMERICAL], frame[TARGET].astype(int),
        test_size=0.2, random_state=4271, stratify=frame[TARGET],
    )
    prep = ColumnTransformer([
        ("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore")),
        ]), CATEGORICAL),
        ("numerical", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), NUMERICAL),
    ])
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1500, class_weight="balanced"),
        "Decision Tree": DecisionTreeClassifier(max_depth=8, min_samples_leaf=8, class_weight="balanced", random_state=4271),
        "Random Forest": RandomForestClassifier(n_estimators=180, min_samples_leaf=3, class_weight="balanced", random_state=4271, n_jobs=-1),
        "Gradient Boosting": GradientBoostingClassifier(n_estimators=120, max_depth=2, learning_rate=0.07, random_state=4271),
    }
    results = {}
    candidates = []
    for name, estimator in models.items():
        pipeline = Pipeline([("preprocessing", prep), ("classifier", estimator)])
        pipeline.fit(x_train, y_train)
        probability = pipeline.predict_proba(x_test)[:, 1]
        predicted = (probability >= 0.5).astype(int)
        metrics = {
            "accuracy": accuracy_score(y_test, predicted),
            "precision": precision_score(y_test, predicted, zero_division=0),
            "recall": recall_score(y_test, predicted, zero_division=0),
            "f1": f1_score(y_test, predicted, zero_division=0),
            "roc_auc": roc_auc_score(y_test, probability),
            "confusion_matrix": confusion_matrix(y_test, predicted).tolist(),
        }
        results[name] = {key: round(value, 4) if isinstance(value, float) else value for key, value in metrics.items()}
        candidates.append((metrics["roc_auc"], metrics["f1"], name, pipeline))
    _, _, selected_name, selected_pipeline = max(candidates, key=lambda item: (item[0], item[1]))
    model_path = ROOT / "models" / "deadline-risk.joblib"
    joblib.dump({"model": selected_pipeline, "feature_columns": CATEGORICAL + NUMERICAL, "selected_model": selected_name}, model_path)
    report = {"records": len(frame), "target_rate": round(float(frame[TARGET].mean()), 4), "test_records": len(y_test), "selected_model": selected_name, "models": results}
    (ROOT / "models" / "evaluation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
