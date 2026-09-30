import "dotenv/config";
import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../src/db";
import { users, sessions } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const baseURL = process.env.POWER_STONE_TEST_URL || "http://127.0.0.1:3000";
const createdEmails: string[] = [];
const password = () => `${randomBytes(18).toString("base64url")}!`;
const newEmail = () => {
  const email = `auth-test-${randomUUID()}@powerstone.test`;
  createdEmails.push(email);
  return email;
};

async function register(request: APIRequestContext) {
  const credentials = { email: newEmail(), password: password(), name: "Taylor Test" };
  const response = await request.post("/api/auth", { data: { mode: "signup", role: "student", ...credentials } });
  expect(response.status()).toBe(201);
  const { user } = await response.json();
  return { ...credentials, user, response };
}

test.use({ baseURL, viewport: { width: 1366, height: 1000 } });
test.describe.configure({ mode: "serial" });
test.setTimeout(60000);

test.afterAll(async () => {
  if (createdEmails.length) await db.delete(users).where(inArray(users.email, createdEmails));
  await pool.end();
});

test("sign-in rejects missing credentials and does not create unknown accounts", async ({ request }) => {
  const missing = await request.post("/api/auth", { data: { mode: "login", email: "aiden.chen@powerstone.edu" } });
  expect(missing.status()).toBe(400);
  expect(missing.headers()["set-cookie"]).toBeUndefined();
  const email = newEmail();
  const unknown = await request.post("/api/auth", { data: { mode: "login", email, password: password() } });
  expect(unknown.status()).toBe(401);
  expect(await db.select().from(users).where(eq(users.email, email))).toHaveLength(0);
  const malformed = await request.post("/api/auth", { data: "{invalid", headers: { "Content-Type": "application/json" } });
  expect(malformed.status()).toBe(400);
});

test("signup hashes passwords, saves a session, rejects duplicates, and signs out", async ({ request }) => {
  const account = await register(request);
  expect(account.user.passwordHash).toBeUndefined();
  expect(account.user.password).toBeUndefined();
  expect(account.response.headers()["set-cookie"]).toMatch(/HttpOnly/i);
  const [stored] = await db.select().from(users).where(eq(users.id, account.user.id));
  expect(stored.passwordHash).toMatch(/^scrypt-v1:/);
  expect(stored.passwordHash).not.toBe(account.password);
  const current = await (await request.get("/api/auth")).json();
  expect(current.user.id).toBe(account.user.id);
  const duplicate = await request.post("/api/auth", { data: { mode: "signup", name: "Duplicate Test", email: account.email, password: account.password } });
  expect(duplicate.status()).toBe(409);
  const logout = await request.delete("/api/auth");
  expect(logout.status()).toBe(200);
  expect((await (await request.get("/api/auth")).json()).user).toBeNull();
  const wrong = await request.post("/api/auth", { data: { mode: "login", email: account.email, password: password() } });
  expect(wrong.status()).toBe(401);
  expect((await (await request.get("/api/auth")).json()).user).toBeNull();
  const correct = await request.post("/api/auth", { data: { mode: "login", email: account.email.toUpperCase(), password: account.password } });
  expect(correct.status()).toBe(200);
  expect((await correct.json()).user.id).toBe(account.user.id);
});

test("students cannot create admin accounts or call admin mutations", async ({ request }) => {
  const registration = await request.post("/api/auth", { data: { mode: "signup", role: "admin", name: "Not Admin", email: newEmail(), password: password() } });
  expect(registration.status()).toBe(403);
  const anonymous = await request.patch("/api/buses", { data: { id: 1, status: "On Time" } });
  expect(anonymous.status()).toBe(401);
  const account = await register(request);
  expect((await request.patch("/api/buses", { data: { id: 1 } })).status()).toBe(403);
  expect((await request.post("/api/routes", { data: {} })).status()).toBe(403);
  expect((await request.patch("/api/issues", { data: { id: 1, status: "Resolved" } })).status()).toBe(403);
  const wrongPortal = await request.post("/api/auth", { data: { mode: "login", role: "admin", email: account.email, password: account.password } });
  expect(wrongPortal.status()).toBe(403);
});

test("assigned stops belong to the session, not the posted email", async ({ request }) => {
  const account = await register(request);
  const updated = await request.post("/api/auth", { data: { mode: "update_stop", email: "admin@powerstone.edu", assignedStop: "University Residence Halls A-D" } });
  expect(updated.status()).toBe(200);
  const { user } = await updated.json();
  expect(user.id).toBe(account.user.id);
  expect(user.assignedStop).toBe("University Residence Halls A-D");
  expect(user.passwordHash).toBeUndefined();
  expect((await (await request.get("/api/auth")).json()).user.assignedStop).toBe("University Residence Halls A-D");
  const csrf = await request.post("/api/auth", { data: { mode: "update_stop", assignedStop: "North Gate Metro Plaza" }, headers: { Origin: "https://untrusted.example" } });
  expect(csrf.status()).toBe(403);
});

test("expired or revoked session tokens cannot restore a login", async ({ request }) => {
  const account = await register(request);
  const cookie = (await request.storageState()).cookies.find((item) => item.name === "power_stone_session")!;
  await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(and(
    eq(sessions.userId, account.user.id), eq(sessions.tokenHash, createHash("sha256").update(cookie.value).digest("hex")),
  ));
  expect((await (await request.get("/api/auth")).json()).user).toBeNull();
  expect((await request.patch("/api/notifications", { data: { markAllRead: true } })).status()).toBe(401);
  const login = await request.post("/api/auth", { data: { mode: "login", email: account.email, password: account.password } });
  expect(login.status()).toBe(200);
  const activeCookie = (await request.storageState()).cookies.find((item) => item.name === "power_stone_session")!;
  await request.delete("/api/auth");
  const revoked = await request.get("/api/auth", { headers: { Cookie: `power_stone_session=${activeCookie.value}` } });
  expect((await revoked.json()).user).toBeNull();
});

test("TLS-terminating preview proxies still receive secure partitioned cookies", async ({ request }) => {
  const headers = { Host: "powerstone-preview.test", Origin: "https://powerstone-preview.test" };
  const response = await request.post("/api/auth", { headers, data: { mode: "demo", role: "student" } });
  expect(response.status()).toBe(200);
  const cookieHeader = response.headers()["set-cookie"];
  expect(cookieHeader).toContain("; Secure;");
  expect(cookieHeader).toMatch(/SameSite=none/i);
  expect(cookieHeader).toMatch(/Partitioned/i);
  const logout = await request.delete("/api/auth", { headers: { ...headers, Cookie: cookieHeader.split(";")[0] } });
  expect(logout.status()).toBe(200);
});

test("provisioned staff credentials sign into the admin portal", async ({ request }) => {
  const email = newEmail();
  const adminPassword = password();
  const [admin] = await db.insert(users).values({ name: "Test Dispatcher", email, passwordHash: await hashPassword(adminPassword), role: "admin", studentId: "TEST-STAFF" }).returning();
  const mismatch = await request.post("/api/auth", { data: { mode: "login", role: "admin", email, password: adminPassword, studentId: "WRONG-BADGE" } });
  expect(mismatch.status()).toBe(401);
  const login = await request.post("/api/auth", { data: { mode: "login", role: "admin", email, password: adminPassword, studentId: "TEST-STAFF" } });
  expect(login.status()).toBe(200);
  expect((await login.json()).user.id).toBe(admin.id);
  const snapshot = await (await request.get("/api/transit")).json();
  expect(snapshot.users).toBeUndefined();
  expect(JSON.stringify(snapshot)).not.toContain("passwordHash");
  const mutation = await request.patch("/api/buses", { data: { id: snapshot.buses[0].id, driverName: snapshot.buses[0].driverName } });
  expect(mutation.status()).toBe(200);
});

test("browser signup, refresh, saved stop, logout, and password sign-in", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = newEmail();
  const chosenPassword = password();
  await page.goto("/#student-login");
  await expect(page.getByRole("heading", { name: "Student sign in", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Taylor Test");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(chosenPassword);
  await page.getByRole("button", { name: "Show password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password", exact: true }).click();
  await page.getByRole("button", { name: "Create account & sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Taylor" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back, Taylor" })).toBeVisible();
  await page.getByLabel("Select your assigned bus stop").selectOption("University Residence Halls A-D");
  await expect(page.getByText("Assigned boarding stop updated to University Residence Halls A-D", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Select your assigned bus stop")).toHaveValue("University Residence Halls A-D");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Student sign in", exact: true })).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password());
  await page.getByRole("button", { name: "Sign in to student portal", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Email or password is incorrect");
  await page.getByLabel("Password", { exact: true }).fill(chosenPassword);
  await page.getByRole("button", { name: "Sign in to student portal", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Taylor" })).toBeVisible();
  await page.getByRole("button", { name: "Admin Command", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Admin sign in", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("student and admin demo buttons create real, reloadable sessions", async ({ page }) => {
  await page.goto("/#student-login");
  await page.getByRole("button", { name: "Try student demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Aiden" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back, Aiden" })).toBeVisible();
  await page.getByRole("button", { name: "Admin Command", exact: true }).click();
  await page.getByRole("button", { name: "Try admin demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fleet Operations & Live Dispatch Center" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Fleet Operations & Live Dispatch Center" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Admin sign in", exact: true })).toBeVisible();
});

test("admin sign-in shows server failures instead of navigating", async ({ page }) => {
  await page.goto("/#admin-login");
  await page.getByLabel("Administrator email", { exact: true }).fill(newEmail());
  await page.getByLabel("Password", { exact: true }).fill(password());
  await page.route("**/api/auth", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().password).toBeTruthy();
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Sign-in service is temporarily unavailable. Please try again." }) });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Sign in to admin portal", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("temporarily unavailable");
  await expect(page.getByRole("heading", { name: "Admin sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to admin portal", exact: true })).toBeEnabled();
});

test("blocked cookies show actionable feedback, not a fake signed-in state", async ({ page }) => {
  await page.goto("/#student-login");
  await page.route("**/api/auth", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: 123456, name: "Demo", role: "student" } }) });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Try student demo", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("browser did not save the sign-in cookie");
  await expect(page.getByRole("heading", { name: "Student sign in", exact: true })).toBeVisible();
});

test("sign-in is usable on a narrow mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#student-login");
  await expect(page.getByRole("heading", { name: "Student sign in", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Try student demo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, Aiden" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Student sign in", exact: true })).toBeVisible();
});
