from playwright.sync_api import sync_playwright
import time
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load the game (assuming it's running on localhost:3000)
        # We need to make sure the dev server is running.
        # In this environment, we assume `npm run dev` is running in background or we might need to start it.
        # But typically we access via a URL. The prompt environment usually has a running server or we serve files.
        # Since I am in a sandbox, I'll assume I need to access the index.html directly or via localhost if served.
        # Let's try file access first, or localhost:5173 (Vite default).

        # NOTE: In this sandbox, I should probably rely on the existing server if any,
        # or serve it myself. I'll assume standard Vite port 5173.
        try:
            page.goto("http://localhost:5173")
        except:
            print("Could not connect to localhost:5173. Make sure server is running.")
            return

        # Wait for canvas
        page.wait_for_selector("canvas")

        print("Game loaded.")

        # 1. Place a House (Population)
        # Select House
        page.click("text=House")
        # Click on grid to place
        page.mouse.click(400, 300) # Slightly left of center
        print("Placed House.")

        # 2. Place a Mill (Wood Workplace)
        page.click("text=Mill")
        page.mouse.click(500, 300) # Slightly right of center
        print("Placed Mill.")

        # 3. Wait for Villagers to spawn (House takes time? Or instant? Logic says spawn chance 5%)
        # Logic: update -> if pop < max -> 5% chance spawn.
        # We need to wait a bit.
        print("Waiting for villagers to spawn...")

        # We can check the DOM for "Idle Villagers" count update
        # Initial: "Idle Villagers: 0"
        # Wait until it becomes > 0

        # We can poll the text content of #selection-info or the specific text.
        # The sidebar is always visible now.

        max_retries = 20
        spawned = False
        for i in range(max_retries):
            content = page.text_content("#selection-info")
            if "Idle Villagers: 0" not in content and "Idle Villagers:" in content:
                # Check actual number
                import re
                match = re.search(r"Idle Villagers: (\d+)", content)
                if match and int(match.group(1)) > 0:
                    print(f"Villagers spawned: {match.group(1)}")
                    spawned = True
                    break
            time.sleep(1)

        if not spawned:
            print("Timed out waiting for villagers.")
            # Capture screenshot for debug
            page.screenshot(path="/home/jules/verification/failure_buttons.png")
            browser.close()
            return

        # 4. Check Workforce Panel
        # Should see "Wood: 0 / 5"
        content = page.text_content("#selection-info")
        if "Wood: 0 / 5" not in content:
             print("Workforce stats not showing correctly.")
             print("Content:", content)

        # 5. Click "+" Button for Wood
        # ID is btn-add-wood
        # Check if enabled
        btn = page.locator("#btn-add-wood")
        if btn.is_disabled():
            print("Button is disabled despite having idle villagers.")
            # Debug: maybe selection is active?
            # Click outside to deselect just in case (though should be global view)
            page.mouse.click(10, 10)
            time.sleep(0.5)
            if btn.is_disabled():
                 print("Still disabled.")

        print("Clicking Add Wood...")
        btn.click()

        # 6. Verify Update
        # Should become "Wood: 1 / 5"
        time.sleep(1) # Wait for update loop (0.5s throttle)
        content = page.text_content("#selection-info")
        if "Wood: 1 / 5" in content:
            print("SUCCESS: Worker assigned successfully.")
        else:
            print("FAILURE: Worker count did not update.")
            print("Content:", content)

        # 7. Screenshot
        if not os.path.exists("/home/jules/verification"):
            os.makedirs("/home/jules/verification")
        page.screenshot(path="/home/jules/verification/buttons.png")
        print("Screenshot saved to verification/buttons.png")

        browser.close()

if __name__ == "__main__":
    run()
