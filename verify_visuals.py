from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Connect
        try:
            page.goto("http://localhost:5173")
        except:
            print("Could not connect to localhost:5173.")
            return

        # Wait for game to load
        page.wait_for_selector("canvas")
        time.sleep(2) # Wait for initial render

        # 1. Start Night (to trigger enemies)
        # Assuming there is a "Start Night" button or we can trigger it via console
        # If UI button exists:
        btn = page.locator("text=Start Night")
        if btn.is_visible():
            btn.click()
            print("Night started.")
        else:
            print("Start Night button not found.")

        # 2. Wait for Enemies
        time.sleep(5)

        # 3. Take Screenshot of Gameplay (Shadows + Enemies)
        if not os.path.exists("/home/jules/verification"):
            os.makedirs("/home/jules/verification")
        page.screenshot(path="/home/jules/verification/visuals_gameplay.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
