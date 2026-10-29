
import csv
from pathlib import Path

# Locate the real project CSV
project_root = Path(__file__).resolve().parent.parent

source_file = (
    project_root
    / "Output"
    / "causal output"
    / "Output"
    / "transaction_weekly_final.csv"
)

output_file = Path(__file__).resolve().parent / "sample_transaction_preview.csv"

columns_to_keep = [
    "PRODUCT_ID",
    "STORE_ID",
    "WEEK_NO",
    "TOTAL_QUANTITY",
    "TOTAL_SALES",
    "PRICE_PROXY",
]

if not source_file.exists():
    raise FileNotFoundError(
        f"Could not find the source CSV:\n{source_file}\n"
        "Check the folder path in make_sample.py."
    )

with source_file.open("r", newline="", encoding="utf-8-sig") as source:
    reader = csv.DictReader(source)

    if not reader.fieldnames:
        raise ValueError("The source CSV has no header row.")

    missing = [column for column in columns_to_keep
               if column not in reader.fieldnames]

    if missing:
        raise ValueError(
            f"Expected columns not found: {missing}\n"
            f"Available columns: {reader.fieldnames}"
        )

    with output_file.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=columns_to_keep)
        writer.writeheader()

        count = 0
        for row in reader:
            writer.writerow({column: row[column] for column in columns_to_keep})
            count += 1

            if count >= 20:
                break

print(f"Created: {output_file}")
print(f"Rows extracted: {count}")
print(f"Columns: {', '.join(columns_to_keep)}")
