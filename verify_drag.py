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

        # 1. Select Wall (default)
        # 2. Drag to create a line
        # Start at 400, 400
        page.mouse.move(400, 400)
        page.mouse.down()
        # Move to 500, 400 (Horizontal line)
        page.mouse.move(500, 400, steps=10)
        time.sleep(1) # Let preview show?
        page.mouse.up()

        print("Dragged wall line.")

        # 3. Take Screenshot
        if not os.path.exists("/home/jules/verification"):
            os.makedirs("/home/jules/verification")
        page.screenshot(path="/home/jules/verification/drag_walls.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    run()
