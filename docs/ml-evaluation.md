# Synthetic model evaluation

Generated using `ml-service/scripts/generate_dataset.py` with seed `4271` and 3,000 records. The miss label rate was **59.93%**. The split held out 600 records (20%) with stratification; preprocessing was fit only inside the training pipeline.

| Classifier | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Logistic Regression | 0.6467 | 0.7357 | 0.6417 | 0.6855 | 0.6900 |
| Decision Tree | 0.5617 | 0.6633 | 0.5472 | 0.5997 | 0.6138 |
| Random Forest | 0.6250 | 0.6860 | 0.6917 | 0.6888 | 0.6695 |
| Gradient Boosting (selected) | 0.6567 | 0.6734 | 0.8306 | 0.7438 | 0.6912 |

Gradient Boosting was selected by highest held-out ROC-AUC, with F1 as the tie-breaker. Its confusion matrix at probability threshold 0.5 is `[[95, 145], [61, 299]]` (true negatives, false positives; false negatives, true positives).

This is a modestly discriminative demonstration model on generated labels, not evidence of real-world legal deadline performance. The generated prevalence and metrics are synthetic, are not calibrated for any firm, and must not drive legal decisions. Re-run the training script to reproduce the report; the generated `models/evaluation.json` is the machine-readable output.
