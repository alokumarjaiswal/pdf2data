# tasks.py

import logging
from playwright.sync_api import Page

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("voucher_process.log", mode='a', encoding='utf-8')
    ]
)

def perform_post_login_tasks(page: Page, voucher_data: dict):
    logging.info("🛠 Starting post-login actions...")

    # 1. ✅ Dismiss confirmation popup
    try:
        page.wait_for_selector('button.confirm', timeout=5000)
        page.click('button.confirm')
        logging.info("✅ Clicked OK on confirmation popup.")
    except Exception as e:
        logging.warning("⚠️ No confirmation popup found or error occurred: %s", e)

    # 2. 🧭 Click "FAS"
    try:
        page.wait_for_selector('a[id="2"]', timeout=10000)
        page.locator('a[id="2"]').click()
        logging.info("✅ Clicked 'FAS' section.")
    except Exception as e:
        logging.error("❌ Failed to click 'FAS': %s", e)
        return

    # 3. 🧾 Select "Cash Payment" from "Prepare Voucher"
    try:
        page.wait_for_selector('[id="20002"]', timeout=10000)
        page.hover('[id="20002"]')
        page.wait_for_selector('[id="20019"]', timeout=5000)
        page.click('[id="20019"]')
        logging.info("✅ Selected 'Cash Payment' from dropdown.")
    except Exception as e:
        logging.error("❌ Failed to select 'Cash Payment': %s", e)
        return

    # 4. ➕ Click "+" button to add entry
    try:
        page.wait_for_selector('#btnAddReceipt', timeout=10000)
        page.click('#btnAddReceipt')
        logging.info("✅ Clicked '+' to add voucher.")
    except Exception as e:
        logging.error("❌ Failed to click '+' button: %s", e)
        return

    # 5. 🧾 Fill ledger, narration, and amount
    try:
        if "ledger_value" in voucher_data:
            # Try selecting using the hidden select
            page.select_option('#txtledger', value=voucher_data["ledger_value"], force=True)
            value = page.eval_on_selector('#txtledger', 'el => el.value')
            label = page.eval_on_selector('#txtledger', '''
                el => {
                    const selected = el.options[el.selectedIndex];
                    return selected ? selected.text : 'N/A';
                }
            ''')
            logging.info(f"📦 Ledger selected via value: {value}")
            logging.info(f"📦 Ledger selected label: {label}")

        elif "ledger_name" in voucher_data:
            # Fallback: type into combobox input
            page.fill('.custom-combobox-input', voucher_data["ledger_name"])
            page.keyboard.press("Enter")
            logging.info(f"📦 Ledger selected via name fallback: {voucher_data['ledger_name']}")

        else:
            logging.error("❌ No ledger_value or ledger_name provided in voucher_data.")
            return

        # Continue with narration and amount
        page.fill('#txtnarration', voucher_data["narration"])
        logging.info("✍️ Narration: %s", voucher_data["narration"])

        page.fill('#txtAmount', voucher_data["amount"])
        logging.info("💰 Amount: %s", voucher_data["amount"])

    except Exception as e:
        logging.error("❌ Failed while filling voucher form: %s", e)
        return

    # 6. 💾 Click Save
    try:
        page.click('#btnTransferconfirmview')
        logging.info("✅ Voucher submitted successfully.")
    except Exception as e:
        logging.error("❌ Failed to click Save button: %s", e)
