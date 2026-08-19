import assert from "node:assert/strict";
import test from "node:test";
import { auctionBidStats, auctionReserveLabel } from "./types.ts";

test("auctionReserveLabel is None when there is no reserve", () => {
  assert.equal(auctionReserveLabel(null, 46), "None");
  assert.equal(auctionReserveLabel("", 46), "None");
});

test("auctionReserveLabel is Reached when the highest bid meets the reserve", () => {
  assert.equal(auctionReserveLabel("45", "46"), "Reached");
  assert.equal(auctionReserveLabel("45", 45), "Reached");
});

test("auctionReserveLabel is Not Reached when there is no qualifying bid", () => {
  assert.equal(auctionReserveLabel("45", null), "Not Reached");
  assert.equal(auctionReserveLabel("45", "44.99"), "Not Reached");
});

test("auctionBidStats hides current bid and indicative price when there are no bids", () => {
  assert.deepEqual(auctionBidStats(false), {
    priceValue: "-",
    priceDetail: "",
    totalValue: "-",
  });
  assert.deepEqual(auctionBidStats(true), {});
});
