from playwright.sync_api import sync_playwright
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import time
import re
from config import CONFIG
from tasks import perform_post_login_tasks

def preprocess_captcha(img):
    img = img.convert("L")
    img = img.resize((img.width * 2, img.height * 2))
    img = img.filter(ImageFilter.SHARPEN)
    img = ImageEnhance.Contrast(img).enhance(2.5)
    img = img.point(lambda x: 0 if x < 140 else 255, '1')
    return img

def fix_common_ocr_errors(text):
    corrections = {
        'l': '1', 'I': '1', '|': '1',
        'O': '0', 'o': '0',
        'S': '5', 's': '5',
        'Q': '0', 'q': '0',
        '¢': 'c', '€': 'c',
        'D': '2', 'B': '8', 'Z': '2'
    }
    cleaned = re.sub(r'[^a-zA-Z0-9]', '', text)
    return ''.join(corrections.get(c, c) for c in cleaned).lower()

def is_valid_captcha(text):
    return text and len(text) == 6 and any(c.isalnum() for c in text)

def extract_captcha_text(page, save_path="captcha.png"):
    page.screenshot(path="full_screenshot.png")
    box = page.locator("#imgcapt").bounding_box()
    if not box:
        print("❌ CAPTCHA image not found.")
        return None

    x, y, width, height = map(int, (box["x"], box["y"], box["width"], box["height"]))
    img = Image.open("full_screenshot.png")
    captcha_img = img.crop((x, y, x + width, y + height))
    captcha_img = preprocess_captcha(captcha_img)
    captcha_img.save(save_path)

    raw = pytesseract.image_to_string(
        captcha_img,
        config='--psm 7 -c tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    ).strip()

    fixed = fix_common_ocr_errors(raw)
    print(f"🧠 OCR: '{raw}' → fixed: '{fixed}'")
    return fixed

def try_login(page, captcha_text):
    page.fill('#UserName', CONFIG["username"])
    page.fill('#Password', CONFIG["password"])
    page.select_option('#Language', 'en-GB')
    page.fill('#LoginDataTime', CONFIG["login_date"])
    page.fill("#ValidateCaptcha", captcha_text)
    page.click('button:has-text("Login")')
    page.wait_for_timeout(5000)
    return is_logged_in(page)

def is_logged_in(page):
    content = page.content()
    return "Dashboard" in content or "Logout" in content or "Welcome" in content

def safe_click_resend(page):
    try:
        page.wait_for_selector("#btnResend", timeout=5000)
        page.click("#btnResend")
        time.sleep(2)
    except Exception as e:
        print(f"⚠️ Failed to click 'Refresh CAPTCHA' button: {e}")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=CONFIG["headless"])
        context = browser.new_context()
        page = context.new_page()

        print(f"🔗 Navigating to login page: {CONFIG['base_url']}")
        page.goto(CONFIG["base_url"])
        page.wait_for_selector("#imgcapt", timeout=10000)

        if is_logged_in(page):
            print("✅ Already logged in!")
            context.close()
            return

        print("🔐 Logging in via CAPTCHA...")

        for attempt in range(1, CONFIG["max_attempts"] + 1):
            print(f"\n🔁 Attempt {attempt} of {CONFIG['max_attempts']}")
            try:
                page.wait_for_selector("#imgcapt", timeout=5000)
            except:
                print("❌ CAPTCHA image not loaded.")
                continue

            captcha_text = extract_captcha_text(page)
            real_captcha = page.get_attribute("#Captcha", "value")
            print(f"🔍 Real CAPTCHA: '{real_captcha}'")
            print(f"📝 OCR CAPTCHA:  '{captcha_text}'")

            if not is_valid_captcha(captcha_text):
                print("❌ Invalid CAPTCHA. Refreshing...")
                safe_click_resend(page)
                continue

            if try_login(page, captcha_text):
                print("✅ Login succeeded!")
                perform_post_login_tasks(page, CONFIG["voucher_data"])
                print("⏳ Keeping browser open for 5 more seconds...")
                page.wait_for_timeout(5000)  # Additional 5 seconds after tasks
                context.close()
                return

            print("⚠️ Login failed. Refreshing CAPTCHA...")
            safe_click_resend(page)

        print("\n🛠 All automated attempts failed.")
        manual_captcha = input("✍️ Enter CAPTCHA manually: ").strip()
        if is_valid_captcha(manual_captcha):
            if try_login(page, manual_captcha):
                print("✅ Login succeeded via manual CAPTCHA!")
                perform_post_login_tasks(page, CONFIG["voucher_data"])
                print("⏳ Keeping browser open for 5 more seconds...")
                page.wait_for_timeout(5000)  # Additional 5 seconds after tasks
            else:
                print("❌ Manual CAPTCHA failed.")
        else:
            print("❌ Invalid manual input. Login aborted.")

        context.close()

if __name__ == "__main__":
    run()
