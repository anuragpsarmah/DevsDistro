import { Trie } from "../utils/CityApiTrie.util";
import fs from "fs";
import * as csv from "csv-parse";
import logger from "../logger/winston.logger";

const cityTrie = new Trie();

const loadCitiesData = () => {
  return new Promise((resolve, reject) => {
    const results: { city: string; iso2: string }[] = [];
    fs.createReadStream("./data/world_city_data.csv")
      .pipe(csv.parse({ columns: true, trim: true }))
      .on("data", (data) => {
        results.push({
          city: data.city,
          iso2: data.iso2,
        });
        cityTrie.insert(data.city, data.iso2);
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", reject);
  });
};

const trieInitialization = async () => {
  try {
    await loadCitiesData();
    logger.info("City data loaded and indexed");
  } catch (error) {
    logger.error("Error loading cities data:", error);
    process.exit(1);
  }
  return cityTrie;
};

export { cityTrie, trieInitialization };
