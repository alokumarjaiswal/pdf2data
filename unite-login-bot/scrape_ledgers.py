from playwright.sync_api import sync_playwright
from config import CONFIG
import json
import time

def scrape_ledger_options(page, output_file="ledger_values_fresh.json"):
    print("🔍 Scraping ledger options...")
    page.wait_for_selector("#txtledger", timeout=10000, state="attached")  # Wait even if hidden

    options = page.eval_on_selector_all(
        "#txtledger option",
        """els => Object.fromEntries(
            els
              .filter(opt => opt.value && opt.textContent.trim())
              .map(opt => [opt.value.trim(), opt.textContent.trim()])
        )"""
    )

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(options, f, indent=2)

    print(f"✅ Scraped {len(options)} ledger entries → {output_file}")
    return options


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=CONFIG["headless"])
        context = browser.new_context()
        page = context.new_page()

        # Step 1: Login
        page.goto(CONFIG["base_url"])
        page.wait_for_selector("#imgcapt", timeout=10000)

        # Fill login
        page.fill('#UserName', CONFIG["username"])
        page.fill('#Password', CONFIG["password"])
        page.select_option('#Language', 'en-GB')
        page.fill('#LoginDataTime', CONFIG["login_date"])

        # Manual CAPTCHA
        captcha = input("✍️ Enter CAPTCHA manually: ").strip()
        page.fill("#ValidateCaptcha", captcha)
        page.click('button:has-text("Login")')
        time.sleep(3)

        if "Dashboard" not in page.content():
            print("❌ Login failed.")
            return

        print("✅ Logged in successfully.")

        # Step 2: Navigate to Cash Payment form
        try:
            page.click('button.confirm')  # OK on popup
        except: pass

        page.wait_for_selector('a[id="2"]', timeout=10000)
        page.locator('a[id="2"]').click()
        page.wait_for_selector('[id="20002"]', timeout=10000)
        page.hover('[id="20002"]')
        page.wait_for_selector('[id="20019"]', timeout=5000)
        page.click('[id="20019"]')
        page.wait_for_selector('#btnAddReceipt', timeout=10000)
        page.click('#btnAddReceipt')

        # Step 3: Scrape and save ledgers
        scrape_ledger_options(page)

        context.close()

if __name__ == "__main__":
    run()
