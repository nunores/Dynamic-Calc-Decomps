const fs = require("fs");
const assert = require("node:assert/strict");
const path = require("path");
const { describe, test } = require("node:test");
const vm = require("vm");

function loadRelativeLevelHelpers(contextOverrides) {
  const sourcePath = path.resolve(__dirname, "../../js/shared_controls.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  const start = source.indexOf("function getHighestImportedPokemonLevel()");
  const end = source.indexOf("function createPokemon", start);

  if (start === -1 || end === -1) {
    throw new Error("Could not locate relative level helpers in shared_controls.js");
  }

  const context = {
    Number,
    parseInt,
    localStorage: {},
    ...contextOverrides,
  };

  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);

  return context;
}

describe("relative trainer levels", () => {
  test("uses the highest imported My Box Pokemon level as the base", () => {
    const context = loadRelativeLevelHelpers({
      customSets: {
        Bulbasaur: { "My Box": { level: 18 } },
        Charizard: { "My Box": { level: 44 } },
        Squirtle: { "My Box": { level: 29 } },
      },
      $: () => ({ length: 1, val: () => "99", text: () => "" }),
      localStorage: { lvlCap: "80" },
    });

    assert.equal(context.getHighestImportedPokemonLevel(), 44);
    assert.equal(context.resolveRelativeSetLevel({ level: 0, sublevel: -3 }, 10), 41);
  });

  test("treats sets with positive placeholder levels and sublevel as relative", () => {
    const context = loadRelativeLevelHelpers({
      customSets: {
        Bulbasaur: { "My Box": { level: 15 } },
      },
      $: () => ({ length: 1, val: () => "90", text: () => "" }),
      localStorage: { lvlCap: "90" },
    });

    const set = { level: 87, sublevel: -3 };

    assert.equal(context.shouldResolveRelativeSetLevel(set), true);
    assert.equal(context.resolveRelativeSetLevel(set, 87), 12);
  });

  test("falls back to the level cap input when no imported level exists", () => {
    const context = loadRelativeLevelHelpers({
      customSets: {},
      $: () => ({ length: 1, val: () => "35", text: () => "" }),
      localStorage: {},
    });

    assert.equal(context.getHighestImportedPokemonLevel(), null);
    assert.equal(context.resolveRelativeSetLevel({ level: -1, sublevel: -1 }, 10), 34);
  });

  test("falls back to localStorage customsets before manual level cap", () => {
    const context = loadRelativeLevelHelpers({
      customSets: null,
      $: () => ({ length: 1, val: () => "20", text: () => "" }),
      localStorage: {
        customsets: JSON.stringify({
          Pidgey: { "My Box": { level: 12 } },
          Mewtwo: { "My Box": { level: 70 } },
        }),
        lvlCap: "50",
      },
    });

    assert.equal(context.getHighestImportedPokemonLevel(), 70);
    assert.equal(context.resolveRelativeSetLevel({ level: 0, sublevel: -5 }, 10), 65);
  });

  test("uses fallback level when there is no imported level or level cap", () => {
    const context = loadRelativeLevelHelpers({
      customSets: {},
      $: () => ({ length: 0 }),
      localStorage: {},
    });

    assert.equal(context.resolveRelativeSetLevel({ level: 0, sublevel: -2 }, 42), 40);
  });
});
