interface CityInfo {
  city: string;
  iso2: string;
}

class TrieNode {
  children: Record<string, TrieNode>;
  cities: CityInfo[];
  isEndOfWord: boolean;

  constructor() {
    this.children = {};
    this.cities = [];
    this.isEndOfWord = false;
  }
}

export class Trie {
  root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(city: string, iso2: string): void {
    const lowerCity = city.toLowerCase();

    // Insert for every possible substring (for contains search)
    for (let i = 0; i < lowerCity.length; i++) {
      let currentWord = lowerCity.slice(i);
      let current = this.root;

      for (let char of currentWord) {
        if (!current.children[char]) {
          current.children[char] = new TrieNode();
        }
        current = current.children[char];

        if (current.cities.length < 1000) {
          current.cities.push({ city, iso2 });
        }
      }
    }
  }

  search(prefix: string, limit = 10): CityInfo[] {
    let node = this.root;
    const lowerPrefix = prefix.toLowerCase();

    for (let char of lowerPrefix) {
      if (!node.children[char]) {
        return [];
      }
      node = node.children[char];
    }

    return node.cities.slice(0, Math.min(limit, 1000));
  }
}
