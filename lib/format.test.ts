import assert from "node:assert/strict";
import test from "node:test";
import { formatCountdown, formatIsoDate, parseIsoDate } from "./format.ts";

test("formatCountdown names days, hours, and minutes when a day or more remains", () => {
  assert.equal(formatCountdown(2 * 86400000 + 4 * 3600000 + 12 * 60000), "2d 4h 12m");
});

test("formatCountdown includes seconds when less than a day remains", () => {
  assert.equal(formatCountdown(3 * 3600000 + 2 * 60000 + 9 * 1000), "3h 2m 9s");
  assert.equal(formatCountdown(45 * 1000), "45s");
});

test("formatCountdown uses Ended when time is up", () => {
  assert.equal(formatCountdown(0), "Ended");
  assert.equal(formatCountdown(-1000), "Ended");
});

test("parseIsoDate keeps a calendar date and ignores a time suffix", () => {
  assert.equal(parseIsoDate("1985-03-15"), "1985-03-15");
  assert.equal(parseIsoDate("1985-03-15T00:00:00.000Z"), "1985-03-15");
  assert.equal(parseIsoDate("15/03/1985"), null);
});

test("formatIsoDate formats YYYY-MM-DD in en-AU without a timezone shift", () => {
  assert.equal(formatIsoDate("1985-03-15"), "15/03/1985");
});
