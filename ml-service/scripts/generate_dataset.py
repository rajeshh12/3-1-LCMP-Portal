from pathlib import Path

import numpy as np
import pandas as pd


OUTPUT = Path(__file__).resolve().parents[1] / "dataset" / "deadline_records.csv"


def generate_dataset(records: int = 3000, seed: int = 4271) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    data = pd.DataFrame({
        "Case_Type": rng.choice(["Civil", "Criminal", "Family", "Property", "Corporate", "Labour", "Consumer", "Other"], records),
        "Case_Priority": rng.choice(["Low", "Medium", "High", "Critical"], records, p=[0.16, 0.43, 0.29, 0.12]),
        "Task_Priority": rng.choice(["Low", "Medium", "High", "Critical"], records, p=[0.19, 0.44, 0.27, 0.10]),
        "Days_Until_Deadline": rng.integers(-5, 61, records),
        "Days_Task_Remained_Open": rng.integers(0, 91, records),
        "Previous_Delayed_Tasks": rng.poisson(1.15, records),
        "Lawyer_Current_Workload": rng.integers(0, 31, records),
        "Staff_Current_Workload": rng.integers(0, 36, records),
        "Pending_Tasks_Count": rng.integers(0, 31, records),
        "Case_Age_Days": rng.integers(0, 2200, records),
        "Deadline_Extension_Count": rng.poisson(0.35, records),
        "Task_Completion_Rate": rng.beta(5, 2, records),
        "Upcoming_Hearing": rng.choice([True, False], records, p=[0.27, 0.73]),
        "Days_Since_Last_Update": rng.integers(0, 46, records),
        "Task_Status": rng.choice(["Not Started", "In Progress", "Under Review", "Completed"], records, p=[0.3, 0.43, 0.17, 0.1]),
    })
    priority_weight = data["Task_Priority"].map({"Low": 0.0, "Medium": 0.15, "High": 0.35, "Critical": 0.48})
    case_weight = data["Case_Priority"].map({"Low": 0.0, "Medium": 0.08, "High": 0.18, "Critical": 0.25})
    logits = (
        -3.25
        + np.clip((12 - data["Days_Until_Deadline"]) / 10, -0.5, 1.2)
        + np.clip(data["Days_Task_Remained_Open"] / 50, 0, 1.25)
        + data["Previous_Delayed_Tasks"] * 0.2
        + data["Lawyer_Current_Workload"] * 0.035
        + data["Staff_Current_Workload"] * 0.018
        + data["Pending_Tasks_Count"] * 0.025
        + data["Deadline_Extension_Count"] * 0.32
        + (1 - data["Task_Completion_Rate"]) * 1.45
        + data["Upcoming_Hearing"].astype(float) * 0.25
        + np.clip(data["Days_Since_Last_Update"] / 30, 0, 0.8)
        + priority_weight + case_weight
        + (data["Task_Status"] == "Not Started").astype(float) * 0.48
        + rng.normal(0, 0.55, records)
    )
    probabilities = 1 / (1 + np.exp(-logits))
    data["Deadline_Missed"] = rng.binomial(1, probabilities)
    return data


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frame = generate_dataset()
    frame.to_csv(OUTPUT, index=False)
    print(f"Generated {len(frame)} synthetic records at {OUTPUT}")
    print(f"Missed-deadline rate: {frame['Deadline_Missed'].mean():.3f}")
