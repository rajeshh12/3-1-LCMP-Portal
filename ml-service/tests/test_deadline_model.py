import sys
import unittest
from pathlib import Path

import joblib

SERVICE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE / "scripts"))
sys.path.insert(0, str(SERVICE))

from generate_dataset import generate_dataset
from app.main import MODEL_PATH, Prediction, predict
from app.schemas import DeadlineFeatures


class SyntheticDatasetTests(unittest.TestCase):
    def test_deadline_and_history_features_have_related_labels(self):
        frame = generate_dataset(records=5000, seed=4271)
        near_deadline = frame.loc[frame["Days_Until_Deadline"] <= 1, "Deadline_Missed"].mean()
        distant_deadline = frame.loc[frame["Days_Until_Deadline"] > 30, "Deadline_Missed"].mean()
        no_delays = frame.loc[frame["Previous_Delayed_Tasks"] == 0, "Deadline_Missed"].mean()
        repeated_delays = frame.loc[frame["Previous_Delayed_Tasks"] >= 3, "Deadline_Missed"].mean()
        self.assertGreater(near_deadline, distant_deadline)
        self.assertGreater(repeated_delays, no_delays)


class PredictionServiceTests(unittest.TestCase):
    def test_loaded_model_returns_probability_and_category(self):
        if not MODEL_PATH.exists():
            self.skipTest("Train the model first to run prediction tests")
        import app.main as service

        service.model_bundle = joblib.load(MODEL_PATH)
        result = predict(DeadlineFeatures(
            Case_Type="Civil",
            Case_Priority="High",
            Task_Priority="Critical",
            Days_Until_Deadline=2,
            Days_Task_Remained_Open=20,
            Previous_Delayed_Tasks=3,
            Lawyer_Current_Workload=15,
            Staff_Current_Workload=4,
            Pending_Tasks_Count=11,
            Case_Age_Days=300,
            Deadline_Extension_Count=1,
            Task_Completion_Rate=0.4,
            Upcoming_Hearing=True,
            Days_Since_Last_Update=12,
            Task_Status="Not Started",
        ))
        self.assertGreaterEqual(result.probability, 0)
        self.assertLessEqual(result.probability, 1)
        self.assertEqual(result.category, "HIGH RISK")
        self.assertEqual(result.source, service.model_bundle["selected_model"])


if __name__ == "__main__":
    unittest.main()
