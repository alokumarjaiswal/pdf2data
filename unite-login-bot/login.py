from playwright.sync_api import sync_playwright
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import time
import re

# 🔐 Credentials
USERNAME = "CEO91271202063001"
PASSWORD = "P030360ERP7329"
MAX_ATTEMPTS = 3

# 🎨 Image Preprocessing
def preprocess_captcha(img):
    img = img.convert("L")
    img = img.resize((img.width * 2, img.height * 2))
    img = img.filter(ImageFilter.SHARPEN)
    img = ImageEnhance.Contrast(img).enhance(2.5)
    img = img.point(lambda x: 0 if x < 140 else 255, '1')
    return img

# 🔡 Fix common OCR mistakes
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

# ✅ Simple validity check
def is_valid_captcha(text):
    return text and len(text) == 6 and any(c.isalnum() for c in text)

# 🔍 Extract CAPTCHA from screenshot
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

# 🧪 Attempt to log in
def try_login(page, captcha_text):
    page.fill('#UserName', USERNAME)
    page.fill('#Password', PASSWORD)
    page.select_option('#Language', 'en-GB')
    page.fill('#LoginDataTime', time.strftime("%Y-%m-%d"))
    page.fill("#ValidateCaptcha", captcha_text)
    page.click('button:has-text("Login")')
    page.wait_for_timeout(5000)
    return is_logged_in(page)

# ✅ Check if login succeeded
def is_logged_in(page):
    content = page.content()
    return "Dashboard" in content or "Logout" in content or "Welcome" in content

# 🚀 Main routine
def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        print("🔗 Navigating to login page...")
        page.goto("https://pn.uniteerp.in/")
        time.sleep(3)

        if is_logged_in(page):
            print("✅ Already logged in!")
            context.close()
            return

        print("🔐 Logging in via CAPTCHA...")

        for attempt in range(1, MAX_ATTEMPTS + 1):
            print(f"\n🔁 Attempt {attempt} of {MAX_ATTEMPTS}")
            page.wait_for_selector("#imgcapt")
            time.sleep(2)

            captcha_text = extract_captcha_text(page)
            real_captcha = page.get_attribute("#Captcha", "value")
            print(f"🔍 Real CAPTCHA: '{real_captcha}'")
            print(f"📝 OCR CAPTCHA:  '{captcha_text}'")

            if not is_valid_captcha(captcha_text):
                print("❌ Invalid CAPTCHA. Refreshing...")
                page.click("#btnResend")
                time.sleep(2)
                continue

            if try_login(page, captcha_text):
                print("✅ Login succeeded!")
                context.close()
                return

            print("⚠️ Login failed. Refreshing CAPTCHA...")
            page.click("#btnResend")
            time.sleep(2)

        print("\n🛠 All automated attempts failed.")
        manual_captcha = input("✍️ Enter CAPTCHA manually: ").strip()
        if is_valid_captcha(manual_captcha):
            if try_login(page, manual_captcha):
                print("✅ Login succeeded via manual CAPTCHA!")
            else:
                print("❌ Manual CAPTCHA failed.")
        else:
            print("❌ Invalid manual input. Login aborted.")

        context.close()

if __name__ == "__main__":
    run()
