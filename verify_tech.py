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

        # 1. Verify "Tower" button is disabled (Age 2)
        # Check style opacity
        tower_btn = page.locator("#btn-tower")
        opacity = tower_btn.evaluate("el => getComputedStyle(el).opacity")
        print(f"Tower Opacity: {opacity}")
        if float(opacity) > 0.5:
             print("FAILURE: Tower should be disabled in Age 1.")
        else:
             print("SUCCESS: Tower is disabled.")

        # 2. Select Town Center (Center of map)
        # Map is 50x50. Center is ~25,25.
        # Click center of screen.
        page.mouse.click(400, 300) # Assuming 800x600 resolution default roughly?
        # Actually window size is unknown.
        # Let's try center of viewport.
        viewport = page.viewport_size
        page.mouse.click(viewport['width'] / 2, viewport['height'] / 2)

        time.sleep(1)

        # 3. Check for "Advance to Age 2" button
        # It won't be clickable because we don't have resources.
        content = page.text_content("#selection-info")
        if "Advance to Age 2" in content:
             print("SUCCESS: Upgrade button visible.")
        else:
             print("FAILURE: Upgrade button not found.")
             print("Content:", content)

        # 4. Take Screenshot
        if not os.path.exists("/home/jules/verification"):
            os.makedirs("/home/jules/verification")
        page.screenshot(path="/home/jules/verification/tech_tree.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
