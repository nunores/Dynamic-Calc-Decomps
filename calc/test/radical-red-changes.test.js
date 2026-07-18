"use strict";

global.TITLE = "Radical Red 4.1 Normal";
global.gameGen = 8;
global.settings = {
    damageGen: 8,
    critGen: 8,
    typeChart: 6,
    physSpecSplit: true
};
global.params = new URLSearchParams();
global.calcingForSwitchIns = false;

var calc = require("../index");
var gen = calc.Generations.get(8);
global.typeChart = calc.TYPE_CHART[8];

describe("Radical Red change data", function () {
    test("registers Blademaster as a selectable Radical Red ability", function () {
        expect(gen.abilities.get("blademaster").name).toBe("Blademaster");
    });

    test("keeps representative v3.1 species and forme changes", function () {
        expect(gen.species.get("absolmega").types).toEqual(["Dark", "Fairy"]);
        expect(gen.species.get("cameruptmega").baseStats).toMatchObject({
            hp: 90,
            atk: 100,
            def: 110,
            spd: 115
        });
        expect(gen.species.get("dodriosevii").baseStats).toEqual({
            hp: 65,
            atk: 125,
            def: 65,
            spa: 40,
            spd: 65,
            spe: 110
        });
        expect(gen.species.get("machampmega").abilities[0]).toBe("ORAORAORAORA");
    });

    test("keeps representative v3.1 move changes and custom moves", function () {
        expect(gen.moves.get("shadowpunch").basePower).toBe(80);
        expect(gen.moves.get("cut")).toMatchObject({ basePower: 75, type: "Steel" });
        expect(gen.moves.get("beatupp")).toBeUndefined();
        expect(gen.moves.get("beatup")).toMatchObject({ basePower: 25, multihit: [2, 5] });
        expect(gen.moves.get("darkhole")).toMatchObject({
            basePower: 100,
            type: "Dark",
            category: "Special"
        });
        expect(gen.moves.get("sonicslash").flags.slicing).toBe(1);
    });
});

describe("Blademaster mechanics", function () {
    function calculateWithAbility(ability, moveName) {
        var move = new calc.Move(gen, moveName);
        var attacker = new calc.Pokemon(gen, "Mew", {
            level: 50,
            ability: ability,
            item: "None",
            moves: [move]
        });
        var defender = new calc.Pokemon(gen, "Mew", {
            level: 50,
            ability: "Synchronize",
            item: "None"
        });
        return calc.calculate(gen, attacker, defender, move, new calc.Field());
    }

    test("boosts slicing moves by 1.2x", function () {
        var normal = calculateWithAbility("Synchronize", "X-Scissor");
        var boosted = calculateWithAbility("Blademaster", "X-Scissor");

        expect(boosted.range()[0]).toBeGreaterThan(normal.range()[0]);
        expect(boosted.rawDesc.attackerAbility).toBe("Blademaster");
    });

    test("does not boost non-slicing moves", function () {
        var normal = calculateWithAbility("Synchronize", "Brick Break");
        var blademaster = calculateWithAbility("Blademaster", "Brick Break");

        expect(blademaster.range()).toEqual(normal.range());
    });

    test("adds one critical-hit stage to slicing moves", function () {
        var previousBackupMoves = global.backup_moves;
        global.backup_moves = { "X-Scissor": { crit_stage: 1 } };
        try {
            var move = new calc.Move(gen, "X-Scissor");
            var attacker = new calc.Pokemon(gen, "Mew", {
                level: 50,
                ability: "Blademaster",
                item: "Scope Lens",
                moves: [move]
            });
            var defender = new calc.Pokemon(gen, "Mew", {
                level: 50,
                ability: "Synchronize",
                item: "None"
            });
            var result = calc.calculate(gen, attacker, defender, move, new calc.Field());

            expect(result.rawDesc.isCritical).toBe(true);
        }
        finally {
            if (typeof previousBackupMoves === "undefined") delete global.backup_moves;
            else global.backup_moves = previousBackupMoves;
        }
    });
});
