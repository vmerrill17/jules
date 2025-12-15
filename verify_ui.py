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

        # 1. Place Barracks (Needs Age 2, so cheat or debug?)
        # We can't easily verify soldier cost unless we are in Age 2.
        # But we can verify if the code is correct via reading file (which we did).

        # 2. Check UI overlap
        # Resize window to small
        page.set_viewport_size({"width": 800, "height": 600})

        # Check if "Start Night" button is clickable or overlapped
        btn = page.locator("#btn-night")
        box = btn.bounding_box()
        print(f"Start Night Button: {box}")

        # Check Sidebar
        sidebar = page.locator("#selection-panel")
        side_box = sidebar.bounding_box()
        print(f"Sidebar: {side_box}")

        # Overlap check
        if box['x'] + box['width'] > side_box['x']:
             print("Potential overlap detected.")
        else:
             print("No horizontal overlap.")

        # 3. Take Screenshot
        if not os.path.exists("/home/jules/verification"):
            os.makedirs("/home/jules/verification")
        page.screenshot(path="/home/jules/verification/ui_layout.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
