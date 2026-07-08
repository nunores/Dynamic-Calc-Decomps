const fs = require("fs");
const assert = require("node:assert/strict");
const path = require("path");
const { describe, test } = require("node:test");
const vm = require("vm");

function loadLocalizeCalcSource(locationOverrides) {
  const sourcePath = path.resolve(__dirname, "../../js/romhack_catalog.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  const start = source.indexOf("const localHostNames");
  const end = source.indexOf("const games =", start);

  if (start === -1 || end === -1) {
    throw new Error("Could not locate local URL helpers in romhack_catalog.js");
  }

  const window = {
    location: {
      hostname: "localhost",
      origin: "http://localhost:8080",
      pathname: "/index.html",
      href: "http://localhost:8080/index.html",
      ...locationOverrides,
    },
  };
  const context = { URL, window };

  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);

  return window.localizeCalcSource;
}

describe("local calc source links", () => {
  test("keeps Dynamic-Calc-Decomps links on the current localhost app root", () => {
    const localizeCalcSource = loadLocalizeCalcSource();

    assert.equal(
      localizeCalcSource("https://hzla.github.io/Dynamic-Calc-Decomps/?data=rr&gen=8&types=6"),
      "http://localhost:8080/?data=rr&gen=8&types=6"
    );
  });

  test("keeps sibling calculator links under localhost when served from a parent folder", () => {
    const localizeCalcSource = loadLocalizeCalcSource({
      pathname: "/Dynamic-Calc-Decomps/index.html",
      href: "http://localhost:8080/Dynamic-Calc-Decomps/index.html",
    });

    assert.equal(
      localizeCalcSource("https://hzla.github.io/Dynamic-Calc/?data=radred&gen=8"),
      "http://localhost:8080/Dynamic-Calc/?data=radred&gen=8"
    );
  });

  test("leaves public links unchanged outside localhost", () => {
    const localizeCalcSource = loadLocalizeCalcSource({
      hostname: "nunores.github.io",
      origin: "https://nunores.github.io",
      pathname: "/Dynamic-Calc-Decomps/index.html",
      href: "https://nunores.github.io/Dynamic-Calc-Decomps/index.html",
    });
    const source = "https://hzla.github.io/Dynamic-Calc-Decomps/?data=rr&gen=8&types=6";

    assert.equal(localizeCalcSource(source), source);
  });
});
