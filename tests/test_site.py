import pytest
from playwright.sync_api import Page, expect
import json
from datetime import datetime, timedelta

@pytest.fixture(autouse=True)
def setup_mocking(page: Page):
    # Mocking the backend API
    def handle_route(route):
        payload = route.request.post_data_json
        action = payload.get("action")

        if action == "getSlots":
            route.fulfill(json={
                "data": [
                    {"slot": "07:00 AM - 09:00 AM", "status": "available"},
                    {"slot": "09:00 AM - 11:00 AM", "status": "confirmed", "name": "Rahul", "phone": "1234567890", "payment": "CASH"},
                    {"slot": "06:00 PM - 08:00 PM", "status": "pending", "name": "Amit", "phone": "0987654321", "payment": "UPI"}
                ]
            })
        elif action == "book":
            route.fulfill(json={"status": "success"})
        elif action == "submitReview":
            route.fulfill(json={"status": "success"})
        elif action == "getReviews":
            route.fulfill(json={
                "data": [
                    {"name": "Rahul S.", "rating": 5, "reviewText": "Amazing!", "timestamp": "2026-05-12T00:00:00Z"}
                ]
            })
        elif action in ["updateStatus", "blockDay"]:
            route.fulfill(json={"status": "success"})
        else:
            route.fulfill(json={"status": "unknown action"})

    page.route("https://aks-turf-backend.vercel.app/api/db", handle_route)
    page.goto("http://localhost:8000")

def test_authentication_flow(page: Page):
    # Open menu
    page.click(".hamburger")
    # Click Login/Signup
    page.locator("#auth-buttons >> text=Login / Sign Up").click()
    # Fill login form
    page.fill("#auth-email", "testuser@example.com")
    page.fill("#auth-pass", "password123")
    page.click("text=SIGN IN")
    # Verify login
    expect(page.locator("#user-greeting")).to_be_visible()
    expect(page.locator("#user-greeting")).to_contain_text("Hi, testuser")

    # Test Logout
    page.click(".hamburger")
    page.click("text=Logout")
    expect(page.locator("#auth-buttons >> text=Login / Sign Up")).to_be_visible()
    page.screenshot(path="screenshots/auth_flow.png")

def test_review_flow(page: Page):
    # Click Write a Review button
    page.click("text=WRITE A REVIEW")
    # Fill review form
    page.fill("#r-name", "John Doe")
    page.select_option("#r-rating", "5")
    page.fill("#r-text", "Great experience at AKS Turf!")
    page.click("#submitReviewBtn")
    # Verify success toast
    expect(page.locator(".toast.success")).to_be_visible()
    page.screenshot(path="screenshots/review_success.png")

def test_booking_flow(page: Page):
    # Login first
    page.click(".hamburger")
    page.locator("#auth-buttons >> text=Login / Sign Up").click()
    page.fill("#auth-email", "test@test.com")
    page.fill("#auth-pass", "123")
    page.click("text=SIGN IN")

    # Select date (dynamically choose a valid date within next 6 days)
    target_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
    page.fill("#booking-date", target_date)

    # Wait for slots to load and ensure they are stable
    page.wait_for_selector(".slot-card:not(.skeleton)")

    # Scroll to booking section
    page.locator("#booking-section").scroll_into_view_if_needed()

    # Click Book on an available slot
    available_slot_button = page.locator(".slot-card:has-text('07:00 AM - 09:00 AM') .btn-book")
    available_slot_button.click()

    # Fill booking form
    page.fill("#b-name", "Captain Jack")
    page.fill("#b-phone", "9876543210")
    page.select_option("#b-payment", "UPI")
    page.click("#submitBookingBtn")

    # Verify success modal
    expect(page.locator("#successModal")).to_be_visible()
    expect(page.locator("#slip-name")).to_have_text("Captain Jack")
    expect(page.locator("#upi-payment-section")).to_be_visible()
    page.screenshot(path="screenshots/booking_success.png")

def test_admin_flow(page: Page):
    # Open Admin Login
    page.click(".hamburger")
    page.click("text=Admin Access")
    # Fill admin password
    page.fill("#admin-pass", "12345")
    page.click("text=LOGIN TO PANEL")

    # Verify admin dashboard
    expect(page.locator("#adminDashboardFullscreen")).to_be_visible()

    # Verify slots are visible in admin panel
    expect(page.locator("#overview-body tr")).to_have_count(10)

    # Check pending list
    expect(page.locator("#pending-list")).to_contain_text("Amit")
    expect(page.locator("#pending-list")).to_contain_text("0987654321")

    # Manage a slot
    block_button = page.locator("#overview-body tr").first.locator("button:has-text('Block')")
    block_button.click()
    expect(page.locator("#loadingOverlay")).to_be_visible()
    expect(page.locator("#loadingOverlay")).not_to_be_visible(timeout=10000)

    # Switch to Reviews tab
    page.click("#tab-reviews")
    expect(page.locator("#admin-reviews-view")).to_be_visible()
    expect(page.locator("#admin-reviews-body tr")).to_have_count(1)

    # Exit Admin
    page.click("text=Exit Admin")
    expect(page.locator("#adminDashboardFullscreen")).not_to_be_visible()
    page.screenshot(path="screenshots/admin_flow.png")

def test_mobile_view(page: Page):
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto("http://localhost:8000")

    # Bottom nav should be visible
    expect(page.locator(".bottom-nav")).to_be_visible()

    # Click Account in bottom nav
    page.click("text=Account")
    expect(page.locator("#userActionsModal")).to_be_visible()
    expect(page.locator("#account-status-text")).to_have_text("Guest User")

    # Login via mobile modal
    page.click("#mobile-auth-section >> text=LOGIN / SIGN UP")
    page.fill("#auth-email", "mobile@user.com")
    page.fill("#auth-pass", "pass")
    page.click("text=SIGN IN")

    # Verify login state in Account modal
    page.click("text=Account")
    expect(page.locator("#account-status-text")).to_contain_text("Logged in as: mobile")
    page.screenshot(path="screenshots/mobile_view.png")
