from dotenv import load_dotenv
import os

load_dotenv(dotenv_path="../.env")

CONFIG = {
    "username": os.getenv("UNITE_USERNAME"),
    "password": os.getenv("UNITE_PASSWORD"),
    "base_url": os.getenv("UNITE_BASE_URL", "https://pn.uniteerp.in/"),
    "max_attempts": int(os.getenv("UNITE_MAX_ATTEMPTS", "3")),
    "headless": os.getenv("UNITE_HEADLESS", "false").lower() == "true",

    # 🔐 Hardcoded login date (1st April 2024)
    "login_date": "2024-04-01",

    # 🎯 Voucher entry to be filled
    "voucher_data": {
        # "ledger_value": "133779221311",  # THE KHANNA MARKETING SOCIETY L
        "ledger_name": "THE KHANNA MARKETING SOCIETY LTD",
        "narration": "Auto-entry: April 1st Expenses",
        "amount": "1500.00"
    }
}
