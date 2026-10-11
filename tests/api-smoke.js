const pool = require("../config/db");

const apiBase = process.env.API_BASE_URL || "http://localhost:5000/api";
const marker = `api-smoke-${Date.now()}`;
const productId = 9;
const results = [];
let buyerToken;
let buyerId;
let farmerToken;
let adminToken;
let noteId;
let createdNoteId;
let favoriteAdded = false;

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

async function test(name, expected, action) {
  try {
    const actual = await action();
    results.push({ name, expected, actual, outcome: "PASS" });
  } catch (error) {
    results.push({ name, expected, actual: error.message, outcome: "FAIL" });
  }
}

async function expectStatus(path, status, options) {
  const response = await request(path, options);
  if (response.status !== status) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  return response.data;
}

async function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

async function run() {
  try {
    await test("Buyer login", "200 with buyer JWT", async () => {
      const response = await login("buyer4@farmconnect.test", "password123");
      if (response.status !== 200 || !response.data.token || response.data.user.role !== "buyer") {
        throw new Error(JSON.stringify(response));
      }
      buyerToken = response.data.token;
      buyerId = response.data.user.id;
      return `HTTP ${response.status}; role=${response.data.user.role}`;
    });

    await test("Invalid login password", "401 invalid credentials", async () => {
      const response = await login("buyer4@farmconnect.test", "incorrect-password");
      if (response.status !== 401) throw new Error(JSON.stringify(response));
      return `HTTP ${response.status}; ${response.data.message}`;
    });

    await test("Missing login field", "400 required-fields validation", async () => {
      const response = await request("/auth/login", {
        method: "POST",
        body: { email: "buyer4@farmconnect.test" }
      });
      if (response.status !== 400) throw new Error(JSON.stringify(response));
      return `HTTP ${response.status}; ${response.data.message}`;
    });

    await test("Authenticated identity", "200 with buyer identity", async () => {
      const data = await expectStatus("/auth/me", 200, { token: buyerToken });
      if (data.user.role !== "buyer" || data.user.email !== "buyer4@farmconnect.test") {
        throw new Error(JSON.stringify(data));
      }
      return `HTTP 200; role=${data.user.role}`;
    });

    await test("Categories and filtered product browse", "Active categories and matching products", async () => {
      const [categories, products] = await Promise.all([
        request("/categories"),
        request("/products?category_id=2")
      ]);
      if (categories.status !== 200 || !categories.data.categories.length ||
          products.status !== 200 || !products.data.products.length ||
          products.data.products.some((product) => Number(product.category_id) !== 2)) {
        throw new Error(JSON.stringify({ categories, products }));
      }
      return `categories=${categories.data.categories.length}; matching products=${products.data.products.length}`;
    });

    await test("Product detail and empty search", "Product details load; unmatched category returns empty array", async () => {
      const [detail, empty] = await Promise.all([
        request(`/products/${productId}`),
        request("/products?category_id=999999")
      ]);
      if (detail.status !== 200 || Number(detail.data.product.id) !== productId ||
          empty.status !== 200 || empty.data.products.length !== 0) {
        throw new Error(JSON.stringify({ detail, empty }));
      }
      return `detail HTTP ${detail.status}; empty search HTTP ${empty.status}, products=0`;
    });

    await test("Buyer order history", "200 with an orders array", async () => {
      const data = await expectStatus("/orders/my-orders", 200, { token: buyerToken });
      if (!Array.isArray(data.orders)) throw new Error(JSON.stringify(data));
      return `HTTP 200; orders=${data.orders.length}`;
    });

    await test("Invalid order input", "400 required-fields validation", async () => {
      const response = await request("/orders", { method: "POST", token: buyerToken, body: {} });
      if (response.status !== 400) throw new Error(JSON.stringify(response));
      return `HTTP ${response.status}; ${response.data.message}`;
    });

    await test("Over-quantity order", "400 available-quantity validation", async () => {
      const response = await request("/orders", {
        method: "POST",
        token: buyerToken,
        body: { product_id: productId, quantity_requested: 999999, delivery_option: "pickup" }
      });
      if (response.status !== 400) throw new Error(JSON.stringify(response));
      return `HTTP ${response.status}; ${response.data.message}`;
    });

    await test("Place order and read it back", "201; new order appears in buyer order list", async () => {
      const created = await request("/orders", {
        method: "POST",
        token: buyerToken,
        body: {
          product_id: productId,
          quantity_requested: 1,
          delivery_option: "pickup",
          buyer_message: marker
        }
      });
      if (created.status !== 201) throw new Error(JSON.stringify(created));
      const orders = await expectStatus("/orders/my-orders", 200, { token: buyerToken });
      if (!orders.orders.some((order) => Number(order.id) === Number(created.data.id))) {
        throw new Error("Created order missing from buyer order list");
      }
      return `HTTP ${created.status}; order ${created.data.id} read back`;
    });

    await test("Favorites empty state", "200 with no favorites for clean seeded buyer", async () => {
      const data = await expectStatus("/favorites", 200, { token: buyerToken });
      if (!Array.isArray(data.favorites) || data.favorites.length !== 0) {
        throw new Error(`Expected empty list; got ${data.favorites?.length}`);
      }
      return "HTTP 200; favorites=0";
    });

    await test("Save and retrieve favorite", "Favorite status and list reflect saved product", async () => {
      const saved = await request(`/favorites/${productId}`, { method: "POST", token: buyerToken });
      if (saved.status !== 201 || !saved.data.isFavorite) throw new Error(JSON.stringify(saved));
      favoriteAdded = true;
      const [status, list] = await Promise.all([
        request(`/favorites/${productId}`, { token: buyerToken }),
        request("/favorites", { token: buyerToken })
      ]);
      if (status.status !== 200 || !status.data.isFavorite ||
          !list.data.favorites.some((favorite) => Number(favorite.product_id) === productId)) {
        throw new Error(JSON.stringify({ status, list }));
      }
      const secondSession = await login("buyer4@farmconnect.test", "password123");
      const crossSession = await request("/favorites", { token: secondSession.data.token });
      if (secondSession.status !== 200 || crossSession.status !== 200 ||
          !crossSession.data.favorites.some((favorite) => Number(favorite.product_id) === productId)) {
        throw new Error(JSON.stringify({ secondSession: secondSession.status, crossSession }));
      }
      return `saved HTTP ${saved.status}; status=true; listed=true; visible after second login=true`;
    });

    await test("Remove favorite and restore empty state", "Favorite removed; list empty", async () => {
      const removed = await request(`/favorites/${productId}`, { method: "DELETE", token: buyerToken });
      const data = await expectStatus("/favorites", 200, { token: buyerToken });
      if (removed.status !== 200 || data.favorites.length !== 0) {
        throw new Error(JSON.stringify({ removed, count: data.favorites.length }));
      }
      favoriteAdded = false;
      return `remove HTTP ${removed.status}; favorites=0`;
    });

    await test("Favorite authorization", "401 without token; 403 for farmer", async () => {
      const unauthenticated = await request("/favorites");
      const farmer = await login("farmer3@farmconnect.test", "password123");
      farmerToken = farmer.data.token;
      const wrongRole = await request("/favorites", { token: farmerToken });
      if (unauthenticated.status !== 401 || wrongRole.status !== 403) {
        throw new Error(JSON.stringify({ unauthenticated, wrongRole }));
      }
      return `no token HTTP ${unauthenticated.status}; farmer HTTP ${wrongRole.status}`;
    });

    await test("Notes empty state and blank validation", "Empty list; whitespace-only note returns 400", async () => {
      const data = await expectStatus("/notes/my-notes", 200, { token: buyerToken });
      const blank = await request("/notes", {
        method: "POST",
        token: buyerToken,
        body: { product_id: productId, note_text: "   " }
      });
      if (data.notes.length !== 0 || blank.status !== 400) {
        throw new Error(JSON.stringify({ notes: data.notes.length, blank }));
      }
      return `notes=0; blank note HTTP ${blank.status}`;
    });

    await test("Create, duplicate, update, and read note", "201 create; 409 duplicate; updated text returned", async () => {
      const created = await request("/notes", {
        method: "POST",
        token: buyerToken,
        body: { product_id: productId, note_text: marker }
      });
      if (created.status !== 201) throw new Error(JSON.stringify(created));
      noteId = created.data.note.id;
      createdNoteId = noteId;
      const duplicate = await request("/notes", {
        method: "POST",
        token: buyerToken,
        body: { product_id: productId, note_text: "duplicate note" }
      });
      const updated = await request(`/notes/${noteId}`, {
        method: "PUT",
        token: buyerToken,
        body: { note_text: `${marker}-updated` }
      });
      const notes = await expectStatus("/notes/my-notes", 200, { token: buyerToken });
      if (duplicate.status !== 409 || updated.status !== 200 ||
          !notes.notes.some((note) => Number(note.id) === Number(noteId) && note.note_text === `${marker}-updated`)) {
        throw new Error(JSON.stringify({ duplicate, updated, notes }));
      }
      return `create HTTP ${created.status}; duplicate HTTP ${duplicate.status}; update HTTP ${updated.status}; read-back=true`;
    });

    await test("Note ownership", "Other buyer receives 403 for update and delete", async () => {
      const otherBuyer = await login("buyer3@farmconnect.test", "password123");
      const [updated, deleted] = await Promise.all([
        request(`/notes/${noteId}`, {
          method: "PUT",
          token: otherBuyer.data.token,
          body: { note_text: "unauthorized edit" }
        }),
        request(`/notes/${noteId}`, { method: "DELETE", token: otherBuyer.data.token })
      ]);
      if (updated.status !== 403 || deleted.status !== 403) {
        throw new Error(JSON.stringify({ updated, deleted }));
      }
      return `update HTTP ${updated.status}; delete HTTP ${deleted.status}`;
    });

    await test("Delete note and restore empty state", "200; note removed; list empty", async () => {
      const deleted = await request(`/notes/${noteId}`, { method: "DELETE", token: buyerToken });
      const notes = await expectStatus("/notes/my-notes", 200, { token: buyerToken });
      if (deleted.status !== 200 || notes.notes.length !== 0) {
        throw new Error(JSON.stringify({ deleted, count: notes.notes.length }));
      }
      noteId = undefined;
      return `delete HTTP ${deleted.status}; notes=0`;
    });

    await test("Note rejects unknown product", "404 product not found", async () => {
      const response = await request("/notes", {
        method: "POST",
        token: buyerToken,
        body: { product_id: 999999, note_text: "test" }
      });
      if (response.status !== 404) throw new Error(JSON.stringify(response));
      return `HTTP ${response.status}; ${response.data.message}`;
    });

    await test("Admin audit log records feature activity", "Admin sees favorite_saved and note_created", async () => {
      const admin = await login("admin@farmconnect.test", "password123");
      adminToken = admin.data.token;
      const data = await expectStatus("/admin/audit-logs", 200, { token: adminToken });
      const detailsFor = (log) => {
        try {
          return JSON.parse(log.details || "{}");
        } catch {
          return {};
        }
      };
      const savedFavoriteLogged = data.logs.some((log) =>
        Number(log.user_id) === Number(buyerId) &&
        log.action === "favorite_saved" &&
        Number(detailsFor(log).product_id) === productId
      );
      const createdNoteLogged = data.logs.some((log) =>
        Number(log.user_id) === Number(buyerId) &&
        log.action === "note_created" &&
        Number(detailsFor(log).product_id) === productId &&
        Number(detailsFor(log).note_id) === Number(createdNoteId)
      );
      if (!savedFavoriteLogged || !createdNoteLogged) {
        throw new Error(`Expected current-run feature events; favorite=${savedFavoriteLogged}; note=${createdNoteLogged}`);
      }
      return `HTTP 200; logs=${data.logs.length}; feature actions present`;
    });

    await test("Audit log authorization", "401 without token; 403 for buyer", async () => {
      const [unauthenticated, buyer] = await Promise.all([
        request("/admin/audit-logs"),
        request("/admin/audit-logs", { token: buyerToken })
      ]);
      if (unauthenticated.status !== 401 || buyer.status !== 403) {
        throw new Error(JSON.stringify({ unauthenticated, buyer }));
      }
      return `no token HTTP ${unauthenticated.status}; buyer HTTP ${buyer.status}`;
    });

    await test("Farmer orders and admin dashboard", "Farmer orders and admin stats return 200", async () => {
      const [orders, stats] = await Promise.all([
        request("/orders/farmer", { token: farmerToken }),
        request("/admin/stats", { token: adminToken })
      ]);
      if (orders.status !== 200 || !Array.isArray(orders.data.orders) ||
          stats.status !== 200 || !stats.data.stats) {
        throw new Error(JSON.stringify({ orders, stats }));
      }
      return `farmer orders HTTP ${orders.status}; admin stats HTTP ${stats.status}`;
    });
  } finally {
    if (buyerId) {
      if (favoriteAdded) {
        await pool.query("DELETE FROM favorites WHERE buyer_id = ? AND product_id = ?", [buyerId, productId]);
      }
      if (noteId) {
        await pool.query("DELETE FROM product_notes WHERE id = ? AND buyer_id = ?", [noteId, buyerId]);
      }
      await pool.query("DELETE FROM product_notes WHERE buyer_id = ? AND product_id = ? AND note_text LIKE ?", [buyerId, productId, `${marker}%`]);
      await pool.query("DELETE FROM orders WHERE buyer_id = ? AND buyer_message = ?", [buyerId, marker]);
    }
    await pool.end();
  }

  for (const result of results) {
    console.log(`${result.outcome}\t${result.name}\tExpected: ${result.expected}\tActual: ${result.actual}`);
  }
  const failed = results.filter((result) => result.outcome === "FAIL").length;
  console.log(`SUMMARY\t${results.length - failed}/${results.length} passed; ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exitCode = 1;
});