import assert from "node:assert/strict";
import test from "node:test";
import { fileMatchesAccept } from "./accept.ts";

test("fileMatchesAccept allows PDF by type or extension", () => {
  assert.equal(
    fileMatchesAccept(
      new File([], "pack.pdf", { type: "application/pdf" }),
      "application/pdf",
    ),
    true,
  );
  assert.equal(
    fileMatchesAccept(new File([], "pack.PDF", { type: "" }), "application/pdf"),
    true,
  );
  assert.equal(
    fileMatchesAccept(
      new File([], "logo.png", { type: "image/png" }),
      "application/pdf",
    ),
    false,
  );
});

test("fileMatchesAccept allows listed image types", () => {
  const accept = "image/jpeg,image/png,image/webp,image/gif";
  assert.equal(
    fileMatchesAccept(new File([], "logo.png", { type: "image/png" }), accept),
    true,
  );
  assert.equal(
    fileMatchesAccept(
      new File([], "logo.svg", { type: "image/svg+xml" }),
      accept,
    ),
    false,
  );
});
