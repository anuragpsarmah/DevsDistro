import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler.util";
import { cityTrie } from "..";

const searchCities = asyncHandler(async (req: Request, res: Response) => {
  const searchTerm = (req.query.q as string) || "";
  const limit = parseInt(req.query.limit as string) || 10;

  if (searchTerm.length < 2) {
    res.json([]);
    return;
  }

  if (isNaN(limit) || limit < 1) {
    res.status(400).json({
      error: "Invalid limit parameter. Must be a positive number.",
    });
    return;
  }

  const cappedLimit = Math.min(limit, 1000);

  const results = cityTrie.search(searchTerm, cappedLimit);
  const filteredResults = results.map((item) => {
    return `${item.city}, ${item.iso2}`;
  });

  res.json({
    filteredResults,
    count: results.length,
    limit: cappedLimit,
  });
});

export { searchCities };
